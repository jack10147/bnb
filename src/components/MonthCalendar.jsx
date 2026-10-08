import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel, monthDates, shiftMonth, parse } from '../lib.js';

const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const TONE = {
  good: 'bg-emerald-500/30 border-emerald-400/40 text-emerald-50',
  mid: 'bg-amber-400/25 border-amber-300/40 text-amber-50',
  bad: 'bg-rose-950 border-rose-500/50 text-rose-100',
  empty: 'bg-white/[.04] border-white/[.07] text-slate-400',
  future: 'bg-transparent border-white/[.08] text-slate-600 border-dashed',
  flat: 'bg-white/[.07] border-white/15 text-slate-200',
};
const BAR = {
  good: 'bg-emerald-400',
  mid: 'bg-amber-400',
  bad: 'bg-rose-500',
  empty: 'bg-white/15',
  flat: 'bg-slate-400',
};

export default function MonthCalendar({ today, minMonth, maxMonth, getCell, summary, legend, compact = false, showBar = true, selectedDay, onDayClick }) {
  const fallback = (today || '').slice(0, 7);
  const lo = minMonth || fallback;
  const hi = maxMonth || fallback;
  const start = fallback < lo ? lo : fallback > hi ? hi : fallback;
  const [month, setMonth] = useState(start);
  const dates = monthDates(month);
  const lead = (parse(dates[0]).getUTCDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);
  const items = summary ? summary(month) : [];
  const scored = dates.filter((d) => d <= today).map((d) => ({ d, cell: getCell(d) || { tone: 'empty' } }));
  const counts = { good: 0, mid: 0, bad: 0, empty: 0, flat: 0 };
  for (const { cell } of scored) {
    const t = counts[cell.tone] != null ? cell.tone : 'empty';
    counts[t] += 1;
  }
  const barTotal = scored.length || 1;
  const h = compact ? 'min-h-[44px] sm:min-h-[56px]' : 'min-h-[48px] sm:min-h-[72px]';

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <button type="button" aria-label="Предыдущий месяц" disabled={month <= lo} onClick={() => setMonth(shiftMonth(month, -1))}
          className="p-2 rounded-lg text-slate-300 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronLeft size={18} /></button>
        <div className="text-sm sm:text-base font-medium text-white">{monthLabel(month)}</div>
        <button type="button" aria-label="Следующий месяц" disabled={month >= hi} onClick={() => setMonth(shiftMonth(month, 1))}
          className="p-2 rounded-lg text-slate-300 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight size={18} /></button>
      </div>

      {!!items.length && (
        <div className={`grid gap-2 mb-3 ${items.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
          {items.map((it) => (
            <div key={it.label} className="rounded-xl bg-white/[.04] border border-white/[.06] px-2 py-1.5 sm:px-3 sm:py-2 min-w-0">
              <div className="text-[10px] sm:text-xs text-slate-500 truncate">{it.label}</div>
              <div className={`text-sm sm:text-lg font-semibold tabular-nums truncate ${it.accent || 'text-white'}`}>{it.value}</div>
            </div>
          ))}
        </div>
      )}

      {showBar && (
        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[.06] mb-3" title="Дни месяца до сегодня">
          {['good', 'mid', 'bad', 'flat', 'empty'].map((t) => counts[t] > 0 && (
            <div key={t} className={BAR[t]} style={{ width: `${(counts[t] / barTotal) * 100}%` }} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WD.map((w) => <div key={w} className="text-center text-[10px] sm:text-xs text-slate-500 py-0.5">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e${i}`} />;
          const cell = getCell(iso) || { tone: 'empty' };
          const tone = TONE[cell.tone] || TONE.empty;
          const todayRing = iso === today ? 'outline outline-2 outline-sky-400 -outline-offset-1 z-[1]' : '';
          const selectedRing = selectedDay && iso === selectedDay && iso !== today
            ? 'outline outline-2 outline-violet-400/80 -outline-offset-1 z-[1]'
            : '';
          const clickable = typeof onDayClick === 'function';
          const Tag = clickable ? 'button' : 'div';
          return (
            <Tag
              key={iso}
              type={clickable ? 'button' : undefined}
              title={cell.title || iso}
              onClick={clickable ? () => onDayClick(iso) : undefined}
              className={`relative ${h} rounded-md sm:rounded-lg border px-0.5 flex flex-col items-center justify-center ${tone} ${todayRing} ${selectedRing} ${clickable ? 'touch-manipulation active:scale-[.98]' : ''}`}
            >
              <span className={`absolute top-0.5 left-1 text-[9px] sm:text-[11px] tabular-nums leading-none ${iso === today ? 'text-sky-200 font-semibold' : 'opacity-80'}`}>{parse(iso).getUTCDate()}</span>
              {cell.label && <span className="mt-2 text-[8px] min-[390px]:text-[9px] sm:text-xs font-semibold tabular-nums leading-none text-center max-w-full truncate">{cell.label}</span>}
            </Tag>
          );
        })}
      </div>

      {!!legend?.length && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-[10px] sm:text-xs text-slate-500">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm border ${TONE[l.tone] || TONE.empty}`} />
              {l.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm outline outline-2 outline-sky-400" />сегодня</span>
        </div>
      )}
    </div>
  );
}
