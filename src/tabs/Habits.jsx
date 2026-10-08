import React, { useEffect, useRef } from 'react';
import { Flame, Trophy, CalendarDays, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardTitle, SectionHeader, Stat, Bar, Empty, FillCircle } from '../components/ui.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import { habitStreak, habitBestStreak, fmtShort, weekday, parse, habitDone, habitFrac, habitDayCell, perfectDaysStreak, monthDates, addDays } from '../lib.js';

export default function Habits({ data, model, onToggleHabit }) {
  const { habits } = data;
  const scroller = useRef(null);
  // На узком экране прокручиваем карту так, чтобы был виден сегодняшний день
  useEffect(() => { const el = scroller.current; if (!el) return; const t = el.querySelector('[data-today]'); if (t) el.scrollLeft = Math.max(0, t.offsetLeft + t.offsetWidth - el.clientWidth + 40); }, []);
  const dates = model.arcDates;
  const stats = habits.map((h) => {
    const done = model.elapsed.filter((d) => habitDone(h, model.get(d)?.habits?.[h.id])).length;
    return { h, done, rate: model.elapsed.length ? (done / model.elapsed.length) * 100 : 0, streak: habitStreak(data, model, h.id), best: habitBestStreak(data, model, h.id) };
  });
  const totalRate = stats.reduce((s, x) => s + x.rate, 0) / (stats.length || 1);
  const bestNow = [...stats].sort((a, b) => b.streak - a.streak)[0];
  const todayHabits = model.get(model.today)?.habits || {};

  const DONE = 'bg-gradient-to-br from-orange-400 to-rose-500 shadow-[0_0_10px_-3px_rgba(251,146,60,.6)]';
  const cell = (d, h) => {
    if (d > model.today) return { cls: 'bg-white/[.025] border border-dashed border-white/[.05]' };
    const v = model.get(d)?.habits?.[h.id];
    if (v === undefined) return { cls: 'bg-white/[.04]' };
    if (habitDone(h, v)) return { cls: DONE };
    // Счётная привычка, выполненная частично: заливка снизу пропорционально значению
    const f = habitFrac(h, v);
    return { cls: 'bg-white/[.06] relative overflow-hidden', fill: f, label: h.target ? Number(v) || 0 : null };
  };
  const dayRate = (d) => { const x = model.get(d)?.habits; if (!x || d > model.today || !habits.length) return null; return habits.reduce((s, h) => s + habitFrac(h, x[h.id]), 0) / habits.length; };

  return (
    <div>
      <SectionHeader title="Привычки" subtitle="Трекер привычек и серии дней подряд" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        <Stat label="Общий процент" value={Math.round(totalRate)} unit="%" icon={CalendarDays} accent="text-orange-400"><Bar value={totalRate} color="from-orange-400 to-rose-500" className="h-1.5 mt-2" /></Stat>
        <Stat label="Серия сейчас" value={bestNow?.streak ?? 0} unit="дн." sub={bestNow?.streak ? `${bestNow.h.emoji} ${bestNow.h.name}` : 'пока без серии'} icon={Flame} accent="text-orange-400" />
        <Stat label="Рекорд серии" value={Math.max(0, ...stats.map((s) => s.best))} unit="дн." icon={Trophy} accent="text-amber-400" />
        <Stat label="Отметок всего" value={stats.reduce((s, x) => s + x.done, 0)} sub={`за ${model.elapsed.length} дн.`} icon={CalendarDays} accent="text-orange-400" />
      </div>

      <Card className="mb-4">
        <CardTitle icon={Flame} color="text-orange-400" right={<span className="text-xs text-slate-500">нажмите, чтобы отметить</span>}>Сегодня</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {habits.map((h) => {
            const v = todayHabits[h.id];
            const done = habitDone(h, v);
            const count = Number(v) || 0;
            return (
              <button key={h.id} type="button" onClick={() => onToggleHabit?.(h)}
                aria-pressed={done}
                className={`min-h-[48px] flex items-center gap-3 rounded-xl px-3 py-2 text-left touch-manipulation active:scale-[.99] ${done ? 'bg-emerald-500/10' : 'bg-white/[.03]'}`}>
                {done ? <CheckCircle2 size={22} className="text-emerald-400 shrink-0" /> : <Circle size={22} className="text-slate-500 shrink-0" />}
                <span className="text-lg leading-none shrink-0">{h.emoji}</span>
                <span className="flex-1 min-w-0 text-sm text-slate-100 truncate">{h.name}</span>
                {h.target ? <span className="text-sm font-semibold tabular-nums text-orange-200">{count}/{h.target}</span> : null}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mb-4">
        <CardTitle icon={CalendarDays} color="text-orange-400">Календарь месяца</CardTitle>
        <MonthCalendar
          today={model.today}
          minMonth={data.meta.startDate.slice(0, 7)}
          maxMonth={addDays(data.meta.startDate, data.meta.durationDays - 1).slice(0, 7)}
          getCell={(iso) => habitDayCell(model.get(iso), habits, iso, model.today)}
          summary={(month) => {
            let full = 0, partial = 0;
            for (const d of monthDates(month)) {
              if (d > model.today) continue;
              const tone = habitDayCell(model.get(d), habits, d, model.today).tone;
              if (tone === 'good') full++;
              else if (tone === 'mid') partial++;
            }
            return [
              { label: 'Полностью', value: full, accent: 'text-emerald-300' },
              { label: 'Частично', value: partial, accent: 'text-amber-300' },
              { label: 'Серия', value: `${perfectDaysStreak(data, model)} дн.` },
            ];
          }}
          legend={[
            { tone: 'good', label: 'все привычки' },
            { tone: 'mid', label: 'частично' },
            { tone: 'bad', label: 'записано, мимо' },
            { tone: 'empty', label: 'нет записи' },
          ]}
        />
      </Card>

      <Card className="mb-4">
        <CardTitle icon={CalendarDays} color="text-orange-400" right={<span className="text-xs text-slate-500 hidden sm:block">{dates.length} дней арки</span>}>Карта привычек</CardTitle>
        <div className="flex gap-2">
          {/* Колонка названий — не прокручивается */}
          <div className="w-[112px] sm:w-[200px] shrink-0 grid gap-1" style={{ gridTemplateRows: `26px repeat(${habits.length}, 28px) 16px` }}>
            <div />
            {habits.map((h) => <div key={h.id} className="text-[11px] sm:text-sm leading-tight text-slate-300 flex items-center gap-1.5 sm:gap-2 min-w-0" title={h.name}><span>{h.emoji}</span><span className="line-clamp-2">{h.name}</span></div>)}
            <div className="text-xs text-slate-500 flex items-end">Итог дня</div>
          </div>
          <div ref={scroller} className="relative overflow-x-auto no-scrollbar flex-1 min-w-0">
            <div className="grid gap-1 min-w-[620px]" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0,1fr))`, gridTemplateRows: `26px repeat(${habits.length}, 28px) 16px`, gridAutoFlow: 'column' }}>
              {dates.map((d) => {
                const r = dayRate(d);
                return (
                  <React.Fragment key={d}>
                    <div data-today={d === model.today ? '' : undefined} className={`text-center text-[9px] leading-tight ${d === model.today ? 'text-sky-300 font-semibold' : 'text-slate-500'}`}>
                      <div>{weekday(d)}</div><div>{parse(d).getUTCDate()}</div>
                    </div>
                    {habits.map((h) => { const c = cell(d, h); return (
                      <div key={h.id} title={`${h.name} — ${fmtShort(d)}${h.target && c.label != null ? `: ${c.label}/${h.target}` : ''}`} className={`rounded-md ${c.cls} ${d === model.today ? 'ring-1 ring-sky-400/70' : ''}`}>
                        {c.fill > 0 && <div className="absolute inset-x-0 bottom-0 bg-orange-400/60" style={{ height: `${c.fill * 100}%` }} />}
                        {c.label != null && c.label > 0 && <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white/90 font-medium">{c.label}</span>}
                      </div>); })}
                    <div className="flex items-end"><div className="h-2 w-full rounded-full" style={{ background: r == null ? 'rgba(255,255,255,.04)' : `rgba(52,211,153,${0.15 + r * 0.85})` }} /></div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gradient-to-br from-orange-400 to-rose-500" />выполнено</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/[.08] relative overflow-hidden"><span className="absolute inset-x-0 bottom-0 h-1/2 bg-orange-400/60" /></span>частично</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/[.08]" />не отмечено</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-dashed border-white/20" />впереди</span>
        </div>
      </Card>

      {!habits.length && <Card><Empty>Привычки не заданы</Empty></Card>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {stats.map(({ h, done, rate, streak, best }) => (
          <Card key={h.id}>
            <div className="flex items-center gap-3">
              <FillCircle value={rate} size={46} color="#fb923c"><span className="text-lg leading-none">{h.emoji}</span></FillCircle>
              <div className="flex-1 min-w-0"><div className="text-white font-medium truncate">{h.name}</div>{h.note && <div className="text-xs text-slate-500 truncate">{h.note}</div>}<div className="text-xs text-slate-400">{done} из {model.elapsed.length} {model.elapsed.length === 1 ? 'дня' : 'дней'}{h.target ? ` · сегодня ${Number(todayHabits[h.id]) || 0}/${h.target}` : ` · сегодня ${habitDone(h, todayHabits[h.id]) ? '✓' : '—'}`}</div></div>
              <button type="button" onClick={() => onToggleHabit?.(h)} aria-pressed={habitDone(h, todayHabits[h.id])}
                className="shrink-0 min-h-[44px] min-w-[44px] rounded-xl bg-white/[.04] px-2 flex items-center justify-center touch-manipulation">
                {h.target
                  ? <span className="text-sm font-semibold tabular-nums text-orange-200">{Number(todayHabits[h.id]) || 0}/{h.target}</span>
                  : habitDone(h, todayHabits[h.id]) ? <CheckCircle2 size={22} className="text-emerald-400" /> : <Circle size={22} className="text-slate-500" />}
              </button>
              <div className="text-right"><div className="text-2xl font-semibold text-orange-300 tabular-nums">🔥{streak}</div><div className="text-[10px] text-slate-500">рекорд {best}</div></div>
            </div>
            <Bar value={rate} color="from-orange-400 to-rose-500" className="h-1.5 mt-4" />
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 14 }, (_, i) => model.elapsed[model.elapsed.length - 14 + i]).map((d, i) => {
                if (!d) return <div key={`p${i}`} className="flex-1 h-5 rounded border border-dashed border-white/[.05]" />;
                const v = model.get(d)?.habits?.[h.id];
                const f = habitFrac(h, v);
                return <div key={d} className="flex-1 h-5 rounded bg-white/[.06] relative overflow-hidden" title={`${fmtShort(d)}${h.target ? `: ${Number(v) || 0}/${h.target}` : ''}`}>
                  <div className={`absolute inset-x-0 bottom-0 ${f >= 1 ? 'bg-orange-400/80' : 'bg-orange-400/45'}`} style={{ height: `${f * 100}%` }} />
                </div>;
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
