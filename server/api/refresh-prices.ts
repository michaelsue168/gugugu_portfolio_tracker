import { serverSupabaseClient } from '#supabase/server';

// 常用台股模擬參考價基底
const STOCK_PRICE_BASES: Record<string, { name: string; base: number; range: number }> = {
  '2330': { name: '台積電', base: 820, range: 30 },
  '2317': { name: '鴻海', base: 178, range: 10 },
  '2454': { name: '聯發科', base: 1150, range: 40 },
  '2308': { name: '台達電', base: 330, range: 15 },
  '2881': { name: '富邦金', base: 73, range: 4 },
  '2882': { name: '國泰金', base: 53, range: 3 },
  '2603': { name: '長榮', base: 168, range: 10 },
  '0050': { name: '元大台灣50', base: 155, range: 6 },
  '0056': { name: '元大高股息', base: 38, range: 2 },
  '00878': { name: '國泰永續高股息', base: 21, range: 1 },
  '00919': { name: '群益台灣精選高息', base: 25, range: 1.5 },
  '00929': { name: '復華台灣科技優息', base: 20, range: 1.2 }
};

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

    // 預設為空的個股時，至少提供台積電作為預設快取
    if (Object.keys(stockMap).length === 0) {
      stockMap['2330'] = '台積電';
    }

    // 3. 遍歷並為每檔個股生成最新價格
    const refreshResults: any[] = [];
    const nowISO = new Date().toISOString();

    for (const code in stockMap) {
      const name = stockMap[code];
      let currentPrice = 50.0; // 預設底價

      if (STOCK_PRICE_BASES[code]) {
        // 在基準價與隨機波動範圍內計算 (模擬真實交易盤中變動)
        const config = STOCK_PRICE_BASES[code];
        const variance = (Math.random() - 0.5) * config.range;
        currentPrice = Number((config.base + variance).toFixed(2));
      } else {
        // 未設定基準的股票，給予隨機 NT$10 ~ NT$300 之間的合理價格
        const hash = code.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const base = 10 + (hash % 290);
        const variance = (Math.random() - 0.5) * (base * 0.1); // 10% 波動
        currentPrice = Number((base + variance).toFixed(2));
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
        refreshResults.push({ code, name, price: currentPrice });
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
