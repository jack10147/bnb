import React from 'react';

export const Card = ({ className = '', children, ...p }) => <div className={`card ${className}`} {...p}>{children}</div>;

export const CardTitle = ({ icon: Icon, children, right, color = 'text-sky-400' }) => (
  <div className="flex items-center justify-between gap-2 mb-3">
    <div className="card-title">{Icon && <Icon size={16} className={color} />}<span>{children}</span></div>
    {right}
  </div>
);

export function Ring({ value = 0, size = 96, stroke = 9, color = '#38bdf8', track = 'rgba(255,255,255,.07)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  const id = React.useId().replace(/:/g, '');
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity=".55" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#g${id})`} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value = 0, color = 'from-sky-400 to-indigo-400', className = 'h-2' }) {
  return (
    <div className={`w-full rounded-full bg-white/[.07] overflow-hidden ${className}`}>
      <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%`, transition: 'width .8s ease' }} />
    </div>
  );
}

export function Stat({ label, value, unit, sub, icon: Icon, accent = 'text-sky-400', children }) {
  return (
    <Card className="flex flex-col gap-1 min-w-0">
      <div className="card-title">{Icon && <Icon size={16} className={accent} />}<span className="truncate">{label}</span></div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl sm:text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
      {children}
    </Card>
  );
}

export function Delta({ value, unit = '', invert = false, digits = 1 }) {
  if (value == null || Number.isNaN(value)) return null;
  const good = invert ? value < 0 : value > 0;
  const zero = Math.abs(value) < 1e-9;
  const cls = zero ? 'bg-slate-500/15 text-slate-300' : good ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return <span className={`chip ${cls}`}>{sign}{Math.abs(value).toLocaleString('ru-RU', { maximumFractionDigits: digits })}{unit}</span>;
}

export function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function ChartTooltip({ active, payload, label, unit = '', names = {} }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.filter((p) => p.value != null).map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-slate-100">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill || p.stroke }} />
          <span className="text-slate-400">{names[p.dataKey] || p.name}:</span>
          <span className="font-medium tabular-nums">{Number(p.value).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}{unit}</span>
        </div>
      ))}
    </div>
  );
}

export const Empty = ({ children = 'Нет данных' }) => <div className="text-sm text-slate-500 py-6 text-center">{children}</div>;

// Сегментированный переключатель
export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-white/[.05] border border-white/[.07] p-1 text-sm">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg transition ${value === o.value ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-slate-200'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FillCircle({ value = 0, size = 44, color = '#fb923c', children }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="relative rounded-full overflow-hidden shrink-0 border border-white/10 bg-white/[.05]" style={{ width: size, height: size }}>
      <div className="absolute inset-x-0 bottom-0" style={{ height: `${v}%`, background: color }} />
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
