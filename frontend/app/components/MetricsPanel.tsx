'use client';

import { BacktestSummary } from '../lib/api';

interface Props {
  summary: BacktestSummary;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUSD(n: number) {
  return '$' + fmt(n);
}

function fmtPct(n: number) {
  return (n >= 0 ? '+' : '') + fmt(n) + '%';
}

interface StatProps {
  label: string;
  value: string;
  positive?: boolean | null;
  sub?: string;
}

function Stat({ label, value, positive, sub }: StatProps) {
  const color =
    positive === true  ? 'text-[var(--accent)]' :
    positive === false ? 'text-[var(--red)]' :
    'text-[var(--text)]';

  return (
    <div className="border border-[var(--border)] p-4 flex flex-col gap-1 hover:border-[var(--border-bright)] transition-colors">
      <span className="text-[var(--text-dim)] text-xs uppercase tracking-widest font-mono">{label}</span>
      <span className={`text-2xl font-bold font-display ${color}`}>{value}</span>
      {sub && <span className="text-[var(--text-muted)] text-xs font-mono">{sub}</span>}
    </div>
  );
}

export default function MetricsPanel({ summary }: Props) {
  const returnPositive = summary.total_return_pct >= 0;
  const beatBH = summary.total_return_pct >= summary.buy_hold_return_pct;

  return (
    <div className="flex flex-col gap-3 fade-up-2">
      {/* Strategy label */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-[var(--text-muted)] uppercase tracking-widest">
          {summary.symbol} · {summary.strategy}
        </span>
        <span className="text-[var(--text-dim)]">
          {summary.start_date} → {summary.end_date}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat
          label="Total Return"
          value={fmtPct(summary.total_return_pct)}
          positive={returnPositive}
          sub={`B&H: ${fmtPct(summary.buy_hold_return_pct)}`}
        />
        <Stat
          label="Final Capital"
          value={fmtUSD(summary.final_capital)}
          positive={returnPositive}
          sub={`Started: ${fmtUSD(summary.initial_capital)}`}
        />
        <Stat
          label="Win Rate"
          value={fmt(summary.win_rate) + '%'}
          positive={summary.win_rate >= 50 ? true : summary.win_rate > 0 ? null : false}
          sub={`${summary.num_trades} trades`}
        />
        <Stat
          label="Sharpe Ratio"
          value={fmt(summary.sharpe_ratio, 3)}
          positive={summary.sharpe_ratio > 0 ? true : summary.sharpe_ratio > -0.5 ? null : false}
          sub="Annualized"
        />
        <Stat
          label="Max Drawdown"
          value={'-' + fmt(summary.max_drawdown_pct) + '%'}
          positive={summary.max_drawdown_pct < 15 ? true : summary.max_drawdown_pct < 30 ? null : false}
          sub="Peak to trough"
        />
        <Stat
          label="vs Buy & Hold"
          value={fmtPct(summary.total_return_pct - summary.buy_hold_return_pct)}
          positive={beatBH}
          sub={beatBH ? 'Beat market' : 'Underperformed'}
        />
        <Stat
          label="Num Trades"
          value={String(summary.num_trades)}
          sub="Total signals executed"
        />
        <Stat
          label="Capital at Risk"
          value={fmtUSD(summary.initial_capital)}
          sub="100% invested per trade"
        />
      </div>
    </div>
  );
}