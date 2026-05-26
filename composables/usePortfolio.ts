import type { Transaction, CashFlow, Position, PortfolioSummary, StockPrice } from '~/types/stock';

/**
 * 依據交易日期與建立時間排序交易流水帳（由舊到新）
 */
export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateCompare = a.transaction_date.localeCompare(b.transaction_date);
    if (dateCompare !== 0) return dateCompare;
    return a.id - b.id; // 若日期相同，按 ID 排序
  });
}

/**
 * 核心演算法：使用移動平均成本法將交易流水帳聚合為個股庫存資料
 */
export function calculatePositions(
  transactions: Transaction[],
  priceMap: Record<string, number>
): Record<string, Position> {
  const sorted = sortTransactions(transactions);
  const positions: Record<string, Position> = {};

  for (const tx of sorted) {
    const code = tx.stock_code;
    const name = tx.stock_name;

    if (!positions[code]) {
      positions[code] = {
        stock_code: code,
        stock_name: name,
        shares: 0,
        average_cost: 0,
        total_cost: 0,
        current_price: priceMap[code] ?? tx.price ?? 0,
        market_value: 0,
        unrealized_gain: 0,
        unrealized_roi: 0,
        realized_gain: 0,
        dividend_received: 0,
        transactions: []
      };
    }

    const pos = positions[code];
    pos.transactions.push(tx);

    const price = Number(tx.price) || 0;
    const shares = Number(tx.shares) || 0;
    const fee = Number(tx.fee) || 0;
    const tax = Number(tx.tax) || 0;

    if (tx.action === 'BUY') {
      const oldShares = pos.shares;
      const oldTotalCost = pos.total_cost;
      
      const newShares = oldShares + shares;
      // 新總投入成本 = 舊總投入成本 + (買進單價 * 買進股數 + 手續費)
      const newTotalCost = oldTotalCost + (price * shares + fee);
      
      pos.shares = newShares;
      pos.total_cost = newTotalCost;
      pos.average_cost = newShares > 0 ? newTotalCost / newShares : 0;

    } else if (tx.action === 'SELL') {
      const sellShares = Math.abs(shares); // 賣出股數為正值計算
      const oldShares = pos.shares;
      const oldAverageCost = pos.average_cost;

      // 新剩餘股數 = 舊剩餘股數 - 賣出股數
      const newShares = Math.max(0, oldShares - sellShares);
      // 新總投入成本 = 新剩餘股數 * 舊移動平均成本
      const newTotalCost = newShares * oldAverageCost;

      // 賣出時之已實現損益 = (賣出單價 * 賣出股數 - 手續費 - 證交稅) - (舊移動平均成本 * 賣出股數)
      const revenue = price * sellShares - fee - tax;
      const costOfSold = oldAverageCost * sellShares;
      const txRealizedGain = revenue - costOfSold;

      pos.shares = newShares;
      pos.total_cost = newTotalCost;
      pos.realized_gain += txRealizedGain;
      
      // 若庫存清空，成本歸零
      if (newShares === 0) {
        pos.total_cost = 0;
        pos.average_cost = 0;
      }

    } else if (tx.action === 'BONUS_SHARES') {
      // 無償配股：股數增加，總成本不變，移動平均成本稀釋
      const oldTotalCost = pos.total_cost;
      const newShares = pos.shares + shares;

      pos.shares = newShares;
      pos.average_cost = newShares > 0 ? oldTotalCost / newShares : 0;

    } else if (tx.action === 'DIVIDEND') {
      // 現金股利：累計獨立股利收入，不影響持股與平均成本
      // 股利總額 = tx.price * (tx.shares 或是 1 如果沒帶 shares) - 手續費
      const divShares = shares || 1;
      const dividendAmount = (price * divShares) - fee;
      pos.dividend_received += dividendAmount;
    }
  }

  // 計算每個 Position 的市值與未實現損益
  for (const code in positions) {
    const pos = positions[code];
    pos.current_price = priceMap[code] ?? pos.current_price ?? 0;
    
    if (pos.shares > 0) {
      pos.market_value = pos.shares * pos.current_price;
      pos.unrealized_gain = pos.market_value - pos.total_cost;
      pos.unrealized_roi = pos.total_cost > 0 ? (pos.unrealized_gain / pos.total_cost) * 100 : 0;
    } else {
      pos.market_value = 0;
      pos.unrealized_gain = 0;
      pos.unrealized_roi = 0;
    }
  }

  return positions;
}

/**
 * 核心演算法：計算整體資產負債與綜合投資收益總覽
 */
export function calculateFinancials(
  positionsMap: Record<string, Position>,
  cashFlows: CashFlow[]
): PortfolioSummary {
  let total_market_value = 0;
  let total_cost = 0;
  let total_unrealized_gain = 0;
  let total_realized_gain = 0;
  let total_dividend = 0;

  for (const code in positionsMap) {
    const pos = positionsMap[code];
    if (pos.shares > 0) {
      total_market_value += pos.market_value;
      total_cost += pos.total_cost;
      total_unrealized_gain += pos.unrealized_gain;
    }
    // 歷史已實現與股息是不論是否清空都累加的
    total_realized_gain += pos.realized_gain;
    total_dividend += pos.dividend_received;
  }

  // 獨立折讓/其他現金流計算
  const total_cash_flow = cashFlows.reduce((sum, cf) => sum + (cf.amount || 0), 0);

  // 綜合淨利 = 未實現損益 + 已實現損益 + 現金股利 + 獨立折讓收入
  const net_profit = total_unrealized_gain + total_realized_gain + total_dividend + total_cash_flow;

  // 總資產市值價值 = 當前持股市值 + 歷史已實現利潤 + 股息收入 + 獨立現金流
  // (這代表了此帳戶的累計增值加上當前庫存價值)
  const total_assets = total_market_value + total_realized_gain + total_dividend + total_cash_flow;

  return {
    total_assets,
    total_market_value,
    total_cost,
    total_unrealized_gain,
    unrealized_roi: total_cost > 0 ? (total_unrealized_gain / total_cost) * 100 : 0,
    total_realized_gain,
    total_dividend,
    total_cash_flow,
    net_profit
  };
}

/**
 * Nuxt 組合式函數 (Composable)，用於處理全域股票資產狀態與 Supabase 同步
 */
export const usePortfolio = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const transactions = ref<Transaction[]>([]);
  const cashFlows = ref<CashFlow[]>([]);
  const stockPrices = ref<StockPrice[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 整理成 code -> price 的 Map
  const priceMap = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const p of stockPrices.value) {
      map[p.stock_code] = Number(p.current_price) || 0;
    }
    return map;
  });

  // 計算所有持股 position (包含已清空歷史庫存)
  const allPositions = computed<Record<string, Position>>(() => {
    return calculatePositions(transactions.value, priceMap.value);
  });

  // 只篩選出當前有持股的 Position 列表 (用於前端列表渲染)
  const activePositions = computed<Position[]>(() => {
    return Object.values(allPositions.value)
      .filter(pos => pos.shares > 0)
      .sort((a, b) => b.market_value - a.market_value); // 依市值從大到小排序
  });

  // 總資產與綜合損益計算
  const summary = computed<PortfolioSummary>(() => {
    return calculateFinancials(allPositions.value, cashFlows.value);
  });

  /**
   * 從 Supabase 拉取所有與當前登入用戶相關的資料
   */
  async function fetchData() {
    if (!user.value) {
      transactions.value = [];
      cashFlows.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // 1. 同步拉取交易流水帳
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.value.id);

      if (txErr) throw txErr;
      transactions.value = (txData || []).map(tx => ({
        ...tx,
        price: Number(tx.price),
        shares: Number(tx.shares),
        fee: Number(tx.fee),
        tax: Number(tx.tax)
      }));

      // 2. 同步拉取獨立現金流/折讓
      const { data: cfData, error: cfErr } = await supabase
        .from('cash_flows')
        .select('*')
        .eq('user_id', user.value.id);

      if (cfErr) throw cfErr;
      cashFlows.value = (cfData || []).map(cf => ({
        ...cf,
        amount: Number(cf.amount)
      }));

      // 3. 拉取現價快取表
      const { data: priceData, error: priceErr } = await supabase
        .from('stock_prices')
        .select('*');

      if (priceErr) throw priceErr;
      stockPrices.value = (priceData || []).map(sp => ({
        ...sp,
        current_price: Number(sp.current_price)
      }));

    } catch (err: any) {
      console.error('Error fetching portfolio data:', err);
      error.value = err.message || '資料讀取失敗';
    } finally {
      loading.value = false;
    }
  }

  /**
   * 手動或定時重新整理價格
   */
  async function refreshPrices() {
    loading.value = true;
    try {
      // 呼叫 Nuxt Server API 來刷新現價
      const res = await $fetch('/api/refresh-prices', { method: 'POST' });
      
      // 重新拉取一次資料以更新
      await fetchData();
      return res;
    } catch (err: any) {
      console.error('Error refreshing prices:', err);
      error.value = err.message || '現價刷新失敗';
    } finally {
      loading.value = false;
    }
  }

  return {
    transactions,
    cashFlows,
    stockPrices,
    activePositions,
    allPositions,
    summary,
    loading,
    error,
    fetchData,
    refreshPrices
  };
};
