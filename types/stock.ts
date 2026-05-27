export type TransactionAction = 'BUY' | 'SELL' | 'DIVIDEND' | 'BONUS_SHARES';
export type CashFlowType = 'DISCOUNT' | 'OTHER';

export interface Transaction {
  id: number;
  user_id: string;
  stock_code: string;
  stock_name: string;
  action: TransactionAction;
  price: number; // parsed to number
  shares: number; // positive for BUY and BONUS_SHARES, negative for SELL, 0 for DIVIDEND
  fee: number;
  tax: number;
  transaction_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface CashFlow {
  id: number;
  user_id: string;
  type: CashFlowType;
  amount: number;
  note: string | null;
  record_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface StockPrice {
  stock_code: string;
  stock_name: string;
  current_price: number;
  updated_at: string;
}

export interface Position {
  stock_code: string;
  stock_name: string;
  shares: number;            // Current holding shares (must be > 0)
  average_cost: number;      // Moving average cost per share
  total_cost: number;        // Current total cost of holding (shares * average_cost)
  current_price: number;     // Current stock price
  market_value: number;      // Current market value (shares * current_price)
  unrealized_gain: number;   // Unrealized gain (market_value - total_cost)
  unrealized_roi: number;    // Unrealized return on investment (%)
  realized_gain: number;     // Total realized gain from selling this stock historically
  dividend_received: number; // Total cash dividend received from this stock historically
  transactions: Transaction[]; // Associated transactions (sorted by date)
  price_fetch_failed?: boolean; // True if real stock price failed to fetch
}

export interface PortfolioSummary {
  total_assets: number;         // Total asset value (total market value + net cash/realized/etc)
  total_market_value: number;   // Total current market value of all holdings
  total_cost: number;           // Total cost of all current holdings
  total_unrealized_gain: number;// Total unrealized gain of all current holdings
  unrealized_roi: number;       // Total unrealized return (%)
  total_realized_gain: number;  // Total historical realized gain
  total_dividend: number;       // Total cash dividend received
  total_cash_flow: number;      // Total independent cash flows (discounts/other)
  net_profit: number;           // Comprehensive net profit (unrealized + realized + dividend + cash_flow)
}
