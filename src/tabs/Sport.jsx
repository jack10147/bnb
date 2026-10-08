import React, { useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Dumbbell, Trophy, Scale, Timer, Activity } from 'lucide-react';
import { Card, CardTitle, SectionHeader, Stat, Delta, ChartTooltip, Segmented, Empty, Ring, Bar } from '../components/ui.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import { fmtNum, fmtShort, fmtLong, exerciseSeries, latestWeight, weightGoal, addDays, monthDates } from '../lib.js';

const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f472b6'];

export default function Sport({ data, model }) {
  const { exercises, targets } = data;
  const [exId, setExId] = useState(exercises[0]?.id);
  const dates = model.allDates.filter((d) => d <= model.today);
  const workouts = dates.filter((d) => model.get(d)?.workout).map((d) => ({ date: d, ...model.get(d).workout }));
  const totalMin = workouts.reduce((s, w) => s + (w.durationMin || 0), 0);
  const w = latestWeight(data, model);
  const weightSeries = dates.map((d) => ({ label: fmtShort(d), weight: model.get(d)?.weight ?? null })).filter((x) => x.weight != null);
  const ex = exercises.find((e) => e.id === exId);
  const series = ex ? exerciseSeries(data, ex).filter((x) => x.date <= model.today) : [];
  const exName = (id) => exercises.find((e) => e.id === id)?.name || id;
  const g = weightGoal(data, model);
  const goalW = targets.goalWeight ?? null, startW = targets.startWeight ?? null;
  const setStr = (s) => s.distanceKm != null ? `${s.distanceKm} км${s.timeMin ? ` · ${s.timeMin} мин` : ''}` : s.weight ? `${s.weight}×${s.reps}` : `${s.reps}`;

  return (
    <div>
      <SectionHeader title="Спорт" subtitle="Тренировки, рекорды и вес" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        <Stat label="Тренировок" value={workouts.length} sub={`за ${dates.length} дн.`} icon={Dumbbell} accent="text-sky-400" />
        <Stat label="Время в зале" value={fmtNum(totalMin / 60, 1)} unit="ч" sub={`≈ ${Math.round(totalMin / (workouts.length || 1))} мин за тренировку`} icon={Timer} accent="text-sky-400" />
        <Stat label="Текущий вес" value={fmtNum(w?.value, 1)} unit="кг" icon={Scale} accent="text-sky-400"><div className="mt-1">{startW != null ? <Delta value={w ? w.value - startW : null} unit=" кг от старта" invert /> : null}</div></Stat>
        <Stat label="До цели" value={g ? fmtNum(Math.max(0, g.left), 1) : '—'} unit={g ? 'кг' : undefined} sub={g ? `цель ${g.label ? `${g.label}, ~` : ''}${fmtNum(g.goal, 1)} кг${g.date ? ` к ${fmtShort(g.date)}` : ''}` : 'цель не задана'} icon={Activity} accent="text-sky-400" />
      </div>

      {exercises.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        {exercises.map((e, i) => {
          const s = exerciseSeries(data, e).filter((x) => x.date <= model.today);
          const best = s.length ? Math.max(...s.map((x) => x.best)) : null;
          return (
            <button key={e.id} onClick={() => setExId(e.id)} className={`card text-left transition ${exId === e.id ? 'ring-1 ring-sky-400/60 bg-sky-400/[.06]' : 'hover:bg-white/[.05]'}`}>
              <div className="card-title"><Trophy size={16} style={{ color: COLORS[i % COLORS.length] }} />{e.name}</div>
              <div className="text-2xl sm:text-3xl font-semibold text-white tabular-nums mt-2">{fmtNum(best, 1)} <span className="text-sm font-normal text-slate-400">{e.unit}</span></div>
              <div className="mt-1.5">{s.length > 1 ? <Delta value={best - s[0].best} unit={` ${e.unit}`} /> : <span className="text-xs text-slate-500">лучший результат</span>}</div>
            </button>
          );
        })}
      </div>
      )}

      <div className={`grid ${exercises.length ? 'lg:grid-cols-2' : ''} gap-3 md:gap-4 mb-4`}>
        {exercises.length > 0 ? (
        <Card>
          <CardTitle icon={Activity} right={<span className="text-xs text-slate-500">лучший подход</span>}>Прогресс: {ex?.name}</CardTitle>
          <div className="h-60">
            {series.length ? (
              <ResponsiveContainer><LineChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis domain={[(m) => Math.max(0, Math.floor((m * 0.9) / 5) * 5), (m) => Math.ceil((m * 1.05) / 5) * 5]} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip unit={` ${ex.unit}`} names={{ best: ex.name }} />} />
                <Line dataKey="best" stroke={COLORS[exercises.indexOf(ex) % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: COLORS[exercises.indexOf(ex) % COLORS.length] }} activeDot={{ r: 6 }} />
              </LineChart></ResponsiveContainer>
            ) : <Empty />}
          </div>
        </Card>
        ) : null}
        <Card>
          <CardTitle icon={Scale} right={<span className="text-xs text-slate-500">{goalW != null ? `цель ${goalW} кг` : 'цель не задана'}</span>}>Вес</CardTitle>
          <div className="flex items-center gap-3 mb-3">
            <Ring value={g?.progress || 0} size={64} stroke={7} color="#34d399">
              <span className="text-xs font-semibold text-white tabular-nums">{Math.round(g?.progress || 0)}%</span>
            </Ring>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400">{g ? `до ${fmtNum(g.goal, 1)} кг · осталось ${fmtNum(Math.max(0, g.left), 1)}` : 'цель не задана'}</div>
              <Bar value={g?.progress || 0} color="from-emerald-400 to-teal-300" className="h-2 mt-2" />
            </div>
          </div>
          <div className="h-60">
            {!weightSeries.length ? <Empty>Взвешиваний пока нет</Empty> : <ResponsiveContainer><AreaChart data={weightSeries} margin={{ left: -20, right: 8, top: 8 }}>
              <defs><linearGradient id="sw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8" stopOpacity=".35" /><stop offset="100%" stopColor="#818cf8" stopOpacity="0" /></linearGradient></defs>
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={20} />
              <YAxis domain={[(m) => Math.floor(Math.min(m, goalW ?? m) - 1), (m) => Math.ceil(Math.max(m, startW ?? m) + 1)]} allowDecimals={false} tickLine={false} axisLine={false} />
              {goalW != null && <ReferenceLine y={goalW} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'цель', fill: '#34d399', fontSize: 10, position: 'insideBottomRight' }} />}
              <Tooltip content={<ChartTooltip unit=" кг" names={{ weight: 'Вес' }} />} />
              {startW != null && <ReferenceLine y={startW} stroke="#64748b" strokeDasharray="3 3" />}
              <Area dataKey="weight" stroke="#818cf8" strokeWidth={2.5} fill="url(#sw)" dot={{ r: weightSeries.length > 1 ? 2.5 : 4, fill: '#818cf8', strokeWidth: 0 }} isAnimationActive={false} />
            </AreaChart></ResponsiveContainer>}
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <CardTitle icon={Dumbbell}>Календарь тренировок</CardTitle>
        {!workouts.length && <div className="text-sm text-slate-400 mb-3">Тренировок пока нет — клетки пустые, цифры не подставлены.</div>}
        <MonthCalendar
          today={model.today}
          minMonth={data.meta.startDate.slice(0, 7)}
          maxMonth={addDays(data.meta.startDate, data.meta.durationDays - 1).slice(0, 7)}
          getCell={(iso) => {
            if (iso > model.today) return { tone: 'future' };
            const wkd = model.get(iso)?.workout;
            if (!wkd) return { tone: 'empty' };
            return { tone: 'good', label: wkd.durationMin ? `${wkd.durationMin}м` : '✓', title: wkd.type || 'Тренировка' };
          }}
          summary={(month) => {
            const days = monthDates(month).filter((d) => d <= model.today && model.get(d)?.workout);
            const mins = days.reduce((s, d) => s + (model.get(d).workout.durationMin || 0), 0);
            return [
              { label: 'Тренировок', value: days.length, accent: 'text-sky-300' },
              { label: 'Минут', value: mins },
              { label: 'Без зала', value: monthDates(month).filter((d) => d <= model.today && !model.get(d)?.workout).length },
            ];
          }}
          legend={[{ tone: 'good', label: 'тренировка' }, { tone: 'empty', label: 'нет записи' }]}
        />
      </Card>

      <Card>
        <CardTitle icon={Dumbbell}>Журнал тренировок</CardTitle>
        {!workouts.length && (
          <div className="py-6 flex flex-col items-center text-center">
            <Ring value={0} size={72} stroke={7} color="#38bdf8"><span className="text-sm font-semibold text-slate-300">0</span></Ring>
            <div className="text-sm text-slate-400 mt-3">Тренировок и упражнений пока нет</div>
            <div className="text-xs text-slate-500 mt-1">Ежедневная активность отмечается во вкладке «Привычки»</div>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          {[...workouts].reverse().map((wk) => (
            <div key={wk.date} className="rounded-xl bg-white/[.03] border border-white/[.05] p-4">
              <div className="flex items-center justify-between gap-2">
                <div><div className="text-white font-medium">{wk.type}</div><div className="text-xs text-slate-500">{fmtLong(wk.date)}</div></div>
                <span className="chip bg-sky-500/15 text-sky-300"><Timer size={12} />{wk.durationMin} мин</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {wk.exercises.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm gap-2">
                    <span className="text-slate-300">{exName(e.id)}</span>
                    <span className="flex flex-wrap justify-end gap-1">{e.sets.map((s, i) => <span key={i} className="chip bg-white/5 text-slate-200 tabular-nums">{setStr(s)}</span>)}</span>
                  </div>
                ))}
              </div>
              {wk.notes && <div className="text-xs text-slate-500 mt-2 italic">{wk.notes}</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
