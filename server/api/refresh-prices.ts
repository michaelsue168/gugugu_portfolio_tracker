import { serverSupabaseClient } from '#supabase/server';

/**
 * 從 Yahoo Finance 抓取真實現價
 * 優先嘗試上市 (.TW)，若失敗則嘗試上櫃 (.TWO)
 */
async function fetchYahooStockPrice(code: string): Promise<number | null> {
  const suffixes = ['.TW', '.TWO'];
  for (const suffix of suffixes) {
    const symbol = `${code}${suffix}`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const json: any = await res.json();
        const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price !== undefined && price !== null && typeof price === 'number') {
          return price;
        }
      }
    } catch (err) {
      console.error(`Error fetching Yahoo price for ${symbol}:`, err);
    }
  }
  return null;
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event);

  try {
    // 1. 從交易資料表中撈取所有不重複的股票代號與名稱
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('stock_code, stock_name');

    if (txError) {
      throw createError({
        statusCode: 500,
        statusMessage: `無法讀取交易資料：${txError.message}`
      });
    }

    // 2. 過濾出唯一股票清單
    const stockMap: Record<string, string> = {};
    if (txData && txData.length > 0) {
      for (const tx of txData) {
        if (tx.stock_code) {
          stockMap[tx.stock_code] = tx.stock_name || '未命名股票';
        }
      }
    }

    // 預設為空的個股時，至少提供台積電作為預設
    if (Object.keys(stockMap).length === 0) {
      stockMap['2330'] = '台積電';
    }

    // 3. 遍歷並為每檔個股從 Yahoo Finance 抓取真實現價
    const refreshResults: any[] = [];
    const nowISO = new Date().toISOString();

    for (const code in stockMap) {
      const name = stockMap[code];
      let currentPrice = 0.0; // 預設 0.0 代表獲取失敗

      // 抓取真實現價
      const realPrice = await fetchYahooStockPrice(code);
      if (realPrice !== null && realPrice > 0) {
        currentPrice = Number(realPrice.toFixed(2));
      } else {
        currentPrice = 0.0; // 獲取失敗寫入 0.0
      }

      // 4. 將現價寫入或更新 (Upsert) 到 stock_prices 快取表中
      const { error: upsertError } = await supabase
        .from('stock_prices')
        .upsert({
          stock_code: code,
          stock_name: name,
          current_price: currentPrice,
          updated_at: nowISO
        });

      if (upsertError) {
        console.error(`更新現價快取失敗 ${code}:`, upsertError.message);
      } else {
        refreshResults.push({ 
          code, 
          name, 
          price: currentPrice, 
          fetchFailed: currentPrice === 0 
        });
      }
    }

    return {
      success: true,
      timestamp: nowISO,
      refreshed: refreshResults
    };

  } catch (err: any) {
    return {
      success: false,
      error: err.message || '現價重新整理程序失敗'
    };
  }
});
