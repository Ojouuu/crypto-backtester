const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface BacktestRequest {
  symbol: string;
  days: number;
  initial_capital: number;
  strategy: 'ma_crossover' | 'macd' | 'bollinger';
  ma_params?: { fast_period: number; slow_period: number };
  macd_params?: { fast: number; slow: number; signal: number };
  bb_params?: { period: number; std_dev: number };
}

export interface BacktestSummary {
  symbol: string;
  strategy: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital: number;
  total_return_pct: number;
  buy_hold_return_pct: number;
  num_trades: number;
  win_rate: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
}

export interface Trade {
  entry_date: string;
  exit_date: string | null;
  entry_price: number;
  exit_price: number | null;
  pnl_pct: number | null;
  pnl_usd: number | null;
  status: 'closed' | 'open';
}

export interface Signal {
  timestamp: string;
  type: 'BUY' | 'SELL';
  price: number;
  reason: string;
}

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface PricePoint {
  timestamp: string;
  close: number;
  volume: number;
}

export interface BacktestResult {
  summary: BacktestSummary;
  equity_curve: EquityPoint[];
  trades: Trade[];
  signals: Signal[];
  price_data: PricePoint[];
  indicators: Record<string, Record<string, number>>;
}

export async function runBacktest(req: BacktestRequest): Promise<BacktestResult> {
  const res = await fetch(`${API_BASE}/backtest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function getSymbols(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/symbols`);
  const data = await res.json();
  return data.symbols;
}