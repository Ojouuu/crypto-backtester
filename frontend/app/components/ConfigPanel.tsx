'use client';

import { useState } from 'react';
import { BacktestRequest } from '../lib/api';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'DOGE', 'LINK', 'LTC'];

const STRATEGIES = [
  { id: 'ma_crossover', label: 'MA Crossover', short: 'MAC' },
  { id: 'macd',         label: 'MACD',         short: 'MACD' },
  { id: 'bollinger',    label: 'Bollinger Bands', short: 'BB' },
] as const;

interface Props {
  onRun: (req: BacktestRequest) => void;
  loading: boolean;
}

export default function ConfigPanel({ onRun, loading }: Props) {
  const [symbol, setSymbol]   = useState('BTC');
  const [days, setDays]       = useState(365);
  const [capital, setCapital] = useState(10000);
  const [strategy, setStrategy] = useState<BacktestRequest['strategy']>('macd');

  // MA params
  const [maFast, setMaFast] = useState(20);
  const [maSlow, setMaSlow] = useState(50);
  // MACD params
  const [macdFast, setMacdFast]     = useState(12);
  const [macdSlow, setMacdSlow]     = useState(26);
  const [macdSignal, setMacdSignal] = useState(9);
  // BB params
  const [bbPeriod, setBbPeriod] = useState(20);
  const [bbStd, setBbStd]       = useState(2.0);

  function handleRun() {
    const req: BacktestRequest = {
      symbol, days, initial_capital: capital, strategy,
      ma_params:   { fast_period: maFast, slow_period: maSlow },
      macd_params: { fast: macdFast, slow: macdSlow, signal: macdSignal },
      bb_params:   { period: bbPeriod, std_dev: bbStd },
    };
    onRun(req);
  }

  const labelClass = "block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-widest";
  const inputClass = "w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-mono text-sm px-3 py-2 focus:outline-none focus:border-[var(--accent)] transition-colors";
  const numInputClass = `${inputClass} [appearance:textfield]`;

  return (
    <div className="flex flex-col gap-5 p-5 border border-[var(--border)] bg-[var(--surface)] fade-up-1">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4">
        <span className="text-[var(--accent)] text-xs font-bold tracking-widest uppercase">// Config</span>
      </div>

      {/* Symbol */}
      <div>
        <label className={labelClass}>Asset</label>
        <div className="grid grid-cols-5 gap-1">
          {SYMBOLS.map(s => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`text-xs py-1.5 border transition-all font-mono font-bold ${
                symbol === s
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-bright)] hover:text-[var(--text)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy */}
      <div>
        <label className={labelClass}>Strategy</label>
        <div className="flex flex-col gap-1">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              onClick={() => setStrategy(s.id)}
              className={`text-left px-3 py-2 border text-sm font-mono transition-all ${
                strategy === s.id
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-bright)] hover:text-[var(--text)]'
              }`}
            >
              <span className="text-[var(--text-dim)] mr-2">[{s.short}]</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy Params */}
      {strategy === 'ma_crossover' && (
        <div className="border border-[var(--border)] p-3 flex flex-col gap-3">
          <span className={labelClass}>MA Parameters</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fast Period</label>
              <input type="number" className={numInputClass} value={maFast} min={2} max={100}
                onChange={e => setMaFast(+e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Slow Period</label>
              <input type="number" className={numInputClass} value={maSlow} min={5} max={200}
                onChange={e => setMaSlow(+e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {strategy === 'macd' && (
        <div className="border border-[var(--border)] p-3 flex flex-col gap-3">
          <span className={labelClass}>MACD Parameters</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Fast</label>
              <input type="number" className={numInputClass} value={macdFast} min={2} max={50}
                onChange={e => setMacdFast(+e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Slow</label>
              <input type="number" className={numInputClass} value={macdSlow} min={5} max={100}
                onChange={e => setMacdSlow(+e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Signal</label>
              <input type="number" className={numInputClass} value={macdSignal} min={2} max={30}
                onChange={e => setMacdSignal(+e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {strategy === 'bollinger' && (
        <div className="border border-[var(--border)] p-3 flex flex-col gap-3">
          <span className={labelClass}>Bollinger Parameters</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Period</label>
              <input type="number" className={numInputClass} value={bbPeriod} min={5} max={100}
                onChange={e => setBbPeriod(+e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Std Dev (σ)</label>
              <input type="number" className={numInputClass} value={bbStd} min={0.5} max={4} step={0.1}
                onChange={e => setBbStd(+e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Days & Capital */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Lookback (days)</label>
          <input type="number" className={numInputClass} value={days} min={30} max={365}
            onChange={e => setDays(+e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Capital (USD)</label>
          <input type="number" className={numInputClass} value={capital} min={100}
            onChange={e => setCapital(+e.target.value)} />
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={handleRun}
        disabled={loading}
        className={`w-full py-3 font-bold font-mono text-sm tracking-widest uppercase border transition-all ${
          loading
            ? 'border-[var(--border)] text-[var(--text-dim)] cursor-not-allowed'
            : 'border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] active:scale-[0.98]'
        }`}
        style={ !loading ? { animation: 'pulse-glow 3s ease-in-out infinite' } : {} }
      >
        {loading ? '// Running...' : '▶ Run Backtest'}
      </button>
    </div>
  );
}
