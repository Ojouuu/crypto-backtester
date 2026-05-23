'use client';

import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { EquityPoint, PricePoint, Signal } from '../lib/api';

interface Props {
  equityCurve: EquityPoint[];
  priceData: PricePoint[];
  signals: Signal[];
  initialCapital: number;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatUSD(v: number) {
  if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k';
  return '$' + v.toFixed(0);
}

// Custom tooltip for equity chart
function EquityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border-bright)] px-3 py-2 text-xs font-mono">
      <div className="text-[var(--text-muted)] mb-1">{label}</div>
      <div className="text-[var(--accent)]">
        equity: ${payload[0]?.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

// Custom tooltip for price chart
function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border-bright)] px-3 py-2 text-xs font-mono">
      <div className="text-[var(--text-muted)] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: ${p.value?.toLocaleString()}
        </div>
      ))}
    </div>
  );
}

export default function Charts({ equityCurve, priceData, signals, initialCapital }: Props) {
  // Thin out data for performance (max 180 points)
  const thin = <T,>(arr: T[], max = 180): T[] => {
    if (arr.length <= max) return arr;
    const step = Math.ceil(arr.length / max);
    return arr.filter((_, i) => i % step === 0);
  };

  const equityData = thin(equityCurve).map(p => ({
    date: formatDate(p.date),
    equity: p.equity,
  }));

  // Merge price + signals
  const signalMap: Record<string, Signal> = {};
  signals.forEach(s => { signalMap[s.timestamp] = s; });

  const priceChartData = thin(priceData).map(p => {
    const dateKey = p.timestamp.split('T')[0].split(' ')[0];
    const sig = signalMap[dateKey];
    return {
      date: formatDate(dateKey),
      price: Math.round(p.close),
      buy:  sig?.type === 'BUY'  ? Math.round(p.close) : null,
      sell: sig?.type === 'SELL' ? Math.round(p.close) : null,
    };
  });

  const axisStyle = { fill: '#7d8590', fontSize: 11, fontFamily: 'Space Mono, monospace' };
  const gridProps = { stroke: '#21262d', strokeDasharray: '3 3' };

  return (
    <div className="flex flex-col gap-4 fade-up-3">

      {/* Equity Curve */}
      <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-4 font-mono">
          // Equity Curve
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={equityData}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00ff9d" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#00ff9d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={formatUSD} tick={axisStyle} tickLine={false} axisLine={false} width={55} />
            <Tooltip content={<EquityTooltip />} />
            <ReferenceLine y={initialCapital} stroke="#30363d" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#00ff9d"
              strokeWidth={2}
              fill="url(#equityGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#00ff9d', stroke: '#080c10', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Price + Signals */}
      <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-4 font-mono">
          // Price + Trade Signals
          <span className="ml-4 text-[var(--accent)]">▲ BUY</span>
          <span className="ml-3 text-[var(--red)]">▼ SELL</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={priceChartData}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickFormatter={v => '$' + v.toLocaleString()} tick={axisStyle} tickLine={false} axisLine={false} width={70} />
            <Tooltip content={<PriceTooltip />} />
            <Line type="monotone" dataKey="price" stroke="#484f58" strokeWidth={1.5} dot={false} name="Price" />
            <Line type="monotone" dataKey="buy"  stroke="#00ff9d" strokeWidth={0} dot={{ r: 5, fill: '#00ff9d' }} name="BUY" connectNulls={false} />
            <Line type="monotone" dataKey="sell" stroke="#ff4d6a" strokeWidth={0} dot={{ r: 5, fill: '#ff4d6a' }} name="SELL" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}