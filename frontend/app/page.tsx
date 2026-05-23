'use client';

import { useState } from 'react';
import ConfigPanel from './components/ConfigPanel';
import MetricsPanel from './components/MetricsPanel';
import Charts from './components/Charts';
import TradeTable from './components/TradeTable';
import { runBacktest, BacktestRequest, BacktestResult } from './lib/api';

export default function Home() {
  const [result, setResult]   = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleRun(req: BacktestRequest) {
    setLoading(true);
    setError(null);
    try {
      const data = await runBacktest(req);
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid-bg">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #00ff9d, #00ff9d 1px, transparent 1px, transparent 2px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4 flex items-center justify-between fade-up">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }} />
          <span className="font-display font-bold text-lg tracking-tight text-[var(--text)]">
            CRYPTO<span className="text-[var(--accent)]">BACKTEST</span>
          </span>
          <span className="text-[var(--text-dim)] text-xs font-mono hidden sm:block">// strategy analyzer</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-dim)]">
          <span className="hidden sm:block">v1.0.0</span>
          <span className="text-[var(--accent)]">● LIVE</span>
        </div>
      </header>

      {/* Main layout */}
      <main className="max-w-[1400px] mx-auto p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4">

          {/* Left: Config */}
          <div className="w-full lg:w-72 shrink-0">
            <ConfigPanel onRun={handleRun} loading={loading} />
          </div>

          {/* Right: Results */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* Empty / Loading state */}
            {!result && !loading && !error && (
              <div className="flex-1 border border-[var(--border)] bg-[var(--surface)] flex flex-col items-center justify-center py-24 gap-4 fade-up">
                <div className="text-6xl font-display font-black text-[var(--border-bright)]">{'{ }'}</div>
                <p className="text-[var(--text-dim)] font-mono text-sm text-center max-w-xs">
                  Configure a strategy on the left and hit Run Backtest to see results
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 border border-[var(--border)] bg-[var(--surface)] flex flex-col items-center justify-center py-24 gap-4">
                <div className="text-[var(--accent)] font-mono text-sm cursor">Fetching market data</div>
                <div className="flex gap-1">
                  {[0,1,2,3,4].map(i => (
                    <div
                      key={i}
                      className="w-1 bg-[var(--accent)]"
                      style={{
                        height: '20px',
                        animation: `pulse-glow 0.8s ${i * 0.1}s ease-in-out infinite`,
                        opacity: 0.6,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="border border-[var(--red)] bg-[var(--red-dim)] p-4 font-mono text-sm text-[var(--red)]">
                ✗ Error: {error}
                <div className="text-xs mt-1 text-[var(--text-muted)]">Make sure your backend is running on port 8000</div>
              </div>
            )}

            {result && !loading && (
              <>
                <MetricsPanel summary={result.summary} />
                <Charts
                  equityCurve={result.equity_curve}
                  priceData={result.price_data}
                  signals={result.signals}
                  initialCapital={result.summary.initial_capital}
                />
                <TradeTable trades={result.trades} />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
