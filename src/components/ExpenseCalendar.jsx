import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Banknote } from 'lucide-react';
import { Card, CardTitle } from './ui.jsx';
import { monthLabel, monthDates, shiftMonth, parse, fmtKzt, fmtShort, isDepositCategory, normPayment, categoryColor } from '../lib.js';

// Только чтение: календарь трат по дням поверх уже объединённого списка (data.json + телефон). Ничего не пишет.
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const kShort = (n) => {
  const v = Math.abs(n);
  if (v >= 1e6) return `${(n / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.0', '')}M`;
  if (v >= 1000) return `${(n / 1000).toFixed(v >= 1e5 ? 0 : 1).replace('.0', '')}k`;
  return String(Math.round(n));
};

export default function ExpenseCalendar({ rows, today }) {
  const cur = today.slice(0, 7);
  const byDay = useMemo(() => {
    const map = new Map();
    for (const row of rows || []) {
      if (!row?.date || isDepositCategory(row.category)) continue;
      const n = Number(row.amountKzt);
      if (!Number.isFinite(n) || n === 0) continue;
      if (!map.has(row.date)) map.set(row.date, { total: 0, rows: [] });
      const d = map.get(row.date);
      d.total += n;
      d.rows.push(row);
    }
    return map;
  }, [rows]);
  const months = [...byDay.keys()].map((d) => d.slice(0, 7)).sort();
  const lo = months.length && months[0] < cur ? months[0] : cur;
  const hi = months.length && months[months.length - 1] > cur ? months[months.length - 1] : cur;
  const [month, setMonth] = useState(cur);
  const [sel, setSel] = useState(null);

  const dates = monthDates(month);
  const lead = (parse(dates[0]).getUTCDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);

  let total = 0; let cash = 0; let best = null;
  for (const d of dates) {
    const day = byDay.get(d);
    if (!day) continue;
    total += day.total;
    for (const r of day.rows) if (normPayment(r.payment) === 'cash') cash += Number(r.amountKzt);
    if (!best || day.total > best.total) best = { d, total: day.total };
  }
  const max = best?.total || 1;
  const nDays = month < cur ? dates.length : month > cur ? 0 : Number(today.slice(8, 10));
  const avg = nDays ? total / nDays : 0;
  const selDay = sel && sel.startsWith(month) ? byDay.get(sel) : null;
  const go = (delta) => { setMonth(shiftMonth(month, delta)); setSel(null); };

  return (
    <Card className="mb-4">
      <CardTitle icon={CalendarDays} color="text-emerald-400">Календарь трат</CardTitle>
      <div className="flex items-center justify-between gap-2 mb-2">
        <button type="button" aria-label="Предыдущий месяц" disabled={month <= lo} onClick={() => go(-1)}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 disabled:opacity-30 touch-manipulation"><ChevronLeft size={18} /></button>
        <div className="text-sm font-medium text-white">{monthLabel(month)}</div>
        <button type="button" aria-label="Следующий месяц" disabled={month >= hi} onClick={() => go(1)}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 disabled:opacity-30 touch-manipulation"><ChevronRight size={18} /></button>
      </div>
      <div className="sm:max-w-xl sm:mx-auto">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WD.map((w) => <div key={w} className="text-center text-[10px] text-slate-500">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`e${i}`} />;
            const day = byDay.get(iso);
            const a = day ? 0.12 + 0.6 * (day.total / max) : 0;
            const ring = iso === sel ? 'outline outline-2 outline-violet-400/80 -outline-offset-1' : iso === today ? 'outline outline-2 outline-sky-400 -outline-offset-1' : '';
            return (
              <button key={iso} type="button" onClick={() => setSel(iso === sel ? null : iso)}
                title={day ? `${fmtShort(iso)}: ${fmtKzt(day.total)}` : fmtShort(iso)}
                style={day ? { backgroundColor: `rgba(244,63,94,${a.toFixed(2)})` } : undefined}
                className={`relative min-h-[40px] sm:min-h-[48px] rounded-md border px-0.5 flex flex-col items-center justify-center touch-manipulation ${day ? 'border-rose-400/30 text-rose-50' : 'bg-white/[.03] border-white/[.06] text-slate-500'} ${iso > today ? 'opacity-40' : ''} ${ring}`}>
                <span className="absolute top-0.5 left-1 text-[9px] sm:text-[10px] tabular-nums leading-none opacity-80">{parse(iso).getUTCDate()}</span>
                {day && <span className="mt-2 text-[9px] min-[390px]:text-[10px] sm:text-xs font-semibold tabular-nums leading-none">{kShort(day.total)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {sel && sel.startsWith(month) && (
        <div className="mt-3 rounded-xl bg-white/[.03] border border-white/[.06] p-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-300">{fmtShort(sel)}</span>
            <span className="font-semibold text-white tabular-nums">{fmtKzt(selDay?.total || 0)}</span>
          </div>
          {!selDay ? <div className="text-xs text-slate-500">Трат нет</div> : (
            <ul>
              {selDay.rows.map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-1 text-sm min-w-0 border-b border-white/[.04] last:border-b-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: categoryColor(r.category) }} />
                  <span className="flex-1 min-w-0 truncate text-slate-200">{r.category}{r.note ? <span className="text-slate-500"> · {r.note}</span> : null}</span>
                  <span className={`shrink-0 text-[10px] rounded px-1 ${normPayment(r.payment) === 'cash' ? 'bg-amber-300/15 text-amber-200' : 'bg-white/[.06] text-slate-400'}`}>
                    {normPayment(r.payment) === 'cash' ? <><Banknote size={10} className="inline -mt-0.5" /> нал</> : 'карта'}
                  </span>
                  <span className="shrink-0 tabular-nums text-white">{fmtKzt(r.amountKzt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {[
          ['За месяц', fmtKzt(total)],
          ['Карта / нал', `${kShort(total - cash)} / ${kShort(cash)}`],
          ['В среднем/день', fmtKzt(Math.round(avg))],
          ['Макс. день', best ? `${fmtShort(best.d)} · ${kShort(best.total)}` : '—'],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-white/[.04] border border-white/[.06] px-2 py-1.5 min-w-0">
            <div className="text-[10px] sm:text-xs text-slate-500 truncate">{l}</div>
            <div className="text-sm font-semibold tabular-nums text-white truncate">{v}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-500 mt-2">Без депозита. Нажми на день — список трат.</div>
    </Card>
  );
}
