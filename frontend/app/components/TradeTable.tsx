'use client';

import { Trade } from '../lib/api';

interface Props {
  trades: Trade[];
}

export default function TradeTable({ trades }: Props) {
  if (!trades.length) {
    return (
      <div className="border border-[var(--border)] p-6 text-center text-[var(--text-dim)] font-mono text-sm fade-up-4">
        No trades executed
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] fade-up-4">
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-widest px-4 py-3 border-b border-[var(--border)] font-mono">
        // Trade Log ({trades.length} trades)
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-dim)] uppercase tracking-widest">
              <th className="text-left px-4 py-2">Entry</th>
              <th className="text-left px-4 py-2">Exit</th>
              <th className="text-right px-4 py-2">Entry $</th>
              <th className="text-right px-4 py-2">Exit $</th>
              <th className="text-right px-4 py-2">PnL %</th>
              <th className="text-right px-4 py-2">PnL USD</th>
              <th className="text-center px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => {
              const positive = t.pnl_pct !== null && t.pnl_pct >= 0;
              return (
                <tr
                  key={i}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <td className="px-4 py-2 text-[var(--text-muted)]">{t.entry_date}</td>
                  <td className="px-4 py-2 text-[var(--text-muted)]">{t.exit_date ?? '—'}</td>
                  <td className="px-4 py-2 text-right text-[var(--text)]">
                    ${t.entry_price.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--text)]">
                    {t.exit_price ? '$' + t.exit_price.toLocaleString() : '—'}
                  </td>
                  <td className={`px-4 py-2 text-right font-bold ${positive ? 'text-[var(--accent)]' : 'text-[var(--red)]'}`}>
                    {t.pnl_pct !== null ? (positive ? '+' : '') + t.pnl_pct.toFixed(2) + '%' : '—'}
                  </td>
                  <td className={`px-4 py-2 text-right ${positive ? 'text-[var(--accent)]' : 'text-[var(--red)]'}`}>
                    {t.pnl_usd !== null ? (positive ? '+$' : '-$') + Math.abs(t.pnl_usd).toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 border ${
                      t.status === 'open'
                        ? 'border-[var(--yellow)] text-[var(--yellow)]'
                        : positive
                          ? 'border-[var(--accent)] text-[var(--accent)]'
                          : 'border-[var(--red)] text-[var(--red)]'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
