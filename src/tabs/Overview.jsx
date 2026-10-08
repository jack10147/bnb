import React from 'react';
import { AreaChart, Area, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar as RBar, ReferenceLine, Cell } from 'recharts';
import { Scale, Flame, ListChecks, Trophy, CheckCircle2, Circle, Snowflake, Utensils, TrendingDown, Goal, CalendarDays, Wallet } from 'lucide-react';
import { Card, CardTitle, Ring, Bar, Delta, ChartTooltip, Empty } from '../components/ui.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import { fmtNum, fmtShort, fmtLong, dayNutrition, dayTasks, dayHabits, habitStreak, exerciseSeries, latestWeight, pct, arcWeek, plural, addDays, weekday, diffDays, habitDone, habitFrac, weightGoal, habitDayCell, perfectDaysStreak, monthDates, sumPnlUsd, fmtUsd, isFinanceHidden } from '../lib.js';

export default function Overview({ data, model, onToggleHabit }) {
  const { targets, habits, meta } = data;
  const today = model.get(model.today) || {};
  const n = dayNutrition(today);
  const t = dayTasks(today);
  const w = latestWeight(data, model);
  const week = arcWeek(data, model.today);
  // Полоса под заголовком — октябрь (durationDays). Кольцо «Арка» — вся Winter Arc до longTermEndDate.
  const monthPct = pct(Math.min(model.dayNum, meta.durationDays), meta.durationDays);
  const arcTotalDays = meta.longTermEndDate
    ? Math.max(1, diffDays(meta.startDate, meta.longTermEndDate) + 1)
    : meta.durationDays;
  const arcPct = pct(Math.min(Math.max(model.dayNum, 0), arcTotalDays), arcTotalDays);
  const financeGoal = (data.goals?.month || []).find((g) => g.auto === 'financeUsd');
  const financeMonth = financeGoal?.month || (financeGoal?.deadline || model.today).slice(0, 7);
  const financeTarget = financeGoal?.target ?? 1_200_000;
  const financePnl = sumPnlUsd(data, model, financeMonth);
  const financeNet = financePnl.any ? financePnl.sum : 0;
  const financePct = financeTarget ? Math.max(0, Math.min(100, (financeNet / financeTarget) * 100)) : 0;
  const taskItems = data.taskList?.items || [];
  const tasksDone = taskItems.filter((x) => x.done).length;
  const tasksTotal = taskItems.length;
  const tasksPct = tasksTotal ? (tasksDone / tasksTotal) * 100 : 0;
  const hideFinance = isFinanceHidden(data);
  const habitsToday = dayHabits(today, habits);

  const weightSeries = model.elapsed.map((d) => ({ label: fmtShort(d), weight: model.get(d)?.weight ?? null })).filter((x) => x.weight != null);
  const prevWeight = weightSeries.length > 1 ? weightSeries[weightSeries.length - 2].weight : null;
  const kcalSeries = model.elapsed.slice(-7).map((d) => ({ label: weekday(d), kcal: dayNutrition(model.get(d))?.kcal ?? 0 }));
  const hasKcal = kcalSeries.some((x) => x.kcal > 0);
  const kcalTarget = targets.calories ?? null;
  const kcalPct = pct(n?.kcal || 0, kcalTarget);
  const kcalOver = kcalTarget != null && (n?.kcal || 0) > kcalTarget * 1.05;
  const g = weightGoal(data, model);
  // Ось графика веса: от старта до даты цели (или до сегодня), план — прямая от стартового веса к цели
  const chartEnd = [g?.date, model.today, model.allDates[model.allDates.length - 1]].filter(Boolean).sort().pop();
  const planDays = Math.max(1, diffDays(meta.startDate, g?.date || chartEnd));
  const weightChart = Array.from({ length: Math.max(1, diffDays(meta.startDate, chartEnd) + 1) }, (_, i) => {
    const d = addDays(meta.startDate, i);
    const wt = d <= model.today ? model.get(d)?.weight ?? null : null;
    const plan = g ? +(g.start - (g.start - g.goal) * Math.min(1, i / planDays)).toFixed(2) : null;
    return { label: fmtShort(d), weight: wt, plan };
  });

  const prs = data.exercises.map((ex) => {
    const s = exerciseSeries(data, ex).filter((x) => x.date <= model.today);
    if (!s.length) return null;
    const best = Math.max(...s.map((x) => x.best));
    return { ex, best, first: s[0].best };
  }).filter(Boolean);

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Hero */}
      <Card className="relative overflow-hidden !p-5 sm:!p-7">
        <div className="absolute -right-10 -top-10 opacity-[.06] pointer-events-none"><Snowflake size={260} /></div>
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="text-sky-300/90 text-sm font-medium">{fmtLong(model.today)}</div>
            <h1 className="mt-1 text-3xl sm:text-5xl font-semibold text-white tracking-tight">
              День {Math.max(0, Math.min(model.dayNum, meta.durationDays))} <span className="text-slate-500">из {meta.durationDays}</span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Неделя {week} · осталось {Math.max(0, meta.durationDays - model.dayNum)} {plural(Math.max(0, meta.durationDays - model.dayNum), 'день', 'дня', 'дней')} до конца месяца</p>
            <div className="mt-4 max-w-xl">
              <Bar value={monthPct} className="h-2.5" />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1.5"><span>{fmtShort(meta.startDate)}</span><span>{fmtShort(addDays(meta.startDate, meta.durationDays - 1))}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {[
              { v: arcPct, label: 'Арка', color: '#38bdf8' },
              hideFinance
                ? { v: habitsToday.pct || 0, label: 'Привычки', color: '#fb923c', sub: `${habitsToday.done}/${habitsToday.total}` }
                : { v: financePct, label: 'Финансы', color: financeNet < 0 ? '#fb7185' : '#34d399' },
              { v: tasksPct, label: 'Задачи', color: '#a78bfa', sub: tasksTotal ? `${tasksDone}/${tasksTotal}` : '0/0' },
            ].map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-2">
                <Ring value={r.v} color={r.color} size={92}>
                  <span className="text-lg font-semibold text-white tabular-nums">{Math.round(r.v)}%</span>
                </Ring>
                <span className="text-xs text-slate-400">{r.label}</span>
                {r.sub && <span className="text-[11px] text-slate-500 tabular-nums -mt-1">{r.sub}</span>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <div className="card-title"><Scale size={16} className="text-sky-400" />Вес</div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-semibold text-white tabular-nums">{fmtNum(w?.value, 1)}</span><span className="text-sm text-slate-400">кг</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Delta value={w && prevWeight != null ? w.value - prevWeight : null} unit=" кг за день" invert />
            {targets.startWeight != null && <Delta value={w ? w.value - targets.startWeight : null} unit=" от старта" invert />}
          </div>
          {g && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>к {fmtNum(g.goal, 1)} кг</span><span className="tabular-nums">{Math.round(g.progress)}%</span></div>
              <Bar value={g.progress} color="from-emerald-400 to-teal-300" className="h-1.5" />
            </div>
          )}
          {weightSeries.length > 1 ? (
            <div className="h-10 mt-2 -mx-1">
              <ResponsiveContainer><AreaChart data={weightSeries}>
                <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity=".4" /><stop offset="100%" stopColor="#38bdf8" stopOpacity="0" /></linearGradient></defs>
                <YAxis hide domain={['dataMin - 0.3', 'dataMax + 0.3']} />
                <Area dataKey="weight" stroke="#38bdf8" strokeWidth={2} fill="url(#wg)" dot={false} isAnimationActive={false} />
              </AreaChart></ResponsiveContainer>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-3">{g ? <>цель <span className="text-slate-200">{fmtNum(g.goal, 1)} кг</span> · осталось {fmtNum(Math.max(0, g.left), 1)} кг</> : 'цель по весу не задана'}</div>
          )}
        </Card>

        <Card>
          <div className="card-title"><Flame size={16} className="text-orange-400" />Калории</div>
          <div className="flex items-center gap-3 mt-2">
            <Ring value={pct(n?.kcal || 0, kcalTarget)} size={64} stroke={7} color={kcalTarget && (n?.kcal || 0) > kcalTarget * 1.05 ? '#fb7185' : '#fb923c'}>
              <span className="text-xs font-semibold text-white">{kcalTarget ? `${Math.round(pct(n?.kcal || 0, kcalTarget))}%` : '—'}</span>
            </Ring>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-semibold text-white tabular-nums">{fmtNum(n?.kcal ?? 0)}</div>
              <div className="text-xs text-slate-400">{kcalTarget ? `из ${fmtNum(kcalTarget)} ккал` : 'цель не задана'}</div>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3">{n ? `Б ${fmtNum(n.protein)} · Ж ${fmtNum(n.fat)} · У ${fmtNum(n.carbs)} г` : targets.maintenanceCalories ? `поддержание ≈ ${fmtNum(targets.maintenanceCalories)} ккал` : 'еда сегодня не записана'}</div>
        </Card>

        <Card>
          <div className="card-title"><ListChecks size={16} className="text-violet-400" />Задачи сегодня</div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-semibold text-white tabular-nums">{t.done}</span><span className="text-sm text-slate-400">/ {t.total}</span>
          </div>
          <Bar value={t.pct || 0} color="from-violet-400 to-fuchsia-400" className="h-2 mt-3" />
          <div className="text-xs text-slate-400 mt-2">{t.total ? `${Math.round(t.pct || 0)}% выполнено` : 'задач на сегодня нет'}</div>
        </Card>

      </div>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="lg:col-span-2">
          <CardTitle icon={CalendarDays} color="text-orange-400" right={<a href="#/habits" className="text-xs text-sky-400 hover:underline">Привычки →</a>}>Месяц</CardTitle>
          <MonthCalendar
            compact
            today={model.today}
            minMonth={meta.startDate.slice(0, 7)}
            maxMonth={addDays(meta.startDate, meta.durationDays - 1).slice(0, 7)}
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
          />
        </Card>
        {hideFinance ? (
          <Card>
            <CardTitle icon={ListChecks} color="text-violet-400" right={<a href="#/tasks" className="text-xs text-sky-400 hover:underline">Все задачи →</a>}>{data.taskList?.label || 'Задачи месяца'}</CardTitle>
            <div className="flex items-center gap-4">
              <Ring value={tasksPct} size={88} stroke={8} color="#a78bfa">
                <span className="text-sm font-semibold text-white tabular-nums">{Math.round(tasksPct)}%</span>
              </Ring>
              <div className="flex-1 min-w-0">
                <div className="text-xl font-semibold text-white tabular-nums">{tasksDone} <span className="text-sm text-slate-400 font-normal">из {tasksTotal}</span></div>
                <Bar value={tasksPct} color="from-violet-400 to-fuchsia-400" className="h-2 mt-2" />
                <div className="text-[11px] text-slate-500 mt-1.5">{tasksTotal ? 'выполнено' : 'задач пока нет'}</div>
              </div>
            </div>
            {taskItems.length > 0 && (
              <ul className="mt-3 space-y-1">
                {taskItems.slice(0, 5).map((x) => (
                  <li key={x.id} className="flex items-center gap-2 text-sm min-w-0">
                    {x.done ? <CheckCircle2 size={16} className="text-violet-400 shrink-0" /> : <Circle size={16} className="text-slate-600 shrink-0" />}
                    <span className={`truncate ${x.done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{x.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
        <Card>
          <CardTitle icon={Wallet} color="text-emerald-400" right={<a href="#/finance" className="text-xs text-sky-400 hover:underline">Финансы →</a>}>План октября</CardTitle>
          {(() => {
            const finGoal = (data.goals?.month || []).find((g) => g.auto === 'financeUsd');
            const ym = finGoal?.month || model.today.slice(0, 7);
            const snap = sumPnlUsd(data, model, ym);
            const net = snap.any ? snap.sum : 0;
            const goalUsd = finGoal?.target ?? null;
            const p = goalUsd ? Math.max(0, Math.min(100, (net / goalUsd) * 100)) : 0;
            return (
              <div className="flex items-center gap-4">
                <Ring value={p} size={88} stroke={8} color={net < 0 ? '#fb7185' : '#34d399'}>
                  <span className="text-sm font-semibold text-white tabular-nums">{Math.round(p)}%</span>
                </Ring>
                <div className="flex-1 min-w-0">
                  <div className={`text-xl font-semibold tabular-nums ${net < 0 ? 'text-rose-300' : 'text-white'}`}>{fmtUsd(net)}</div>
                  <div className="text-xs text-slate-400">из {goalUsd == null ? '—' : fmtUsd(goalUsd, 0)}</div>
                  <Bar value={p} color="from-emerald-400 to-teal-300" className="h-2 mt-2" />
                  <div className="text-[11px] text-slate-500 mt-1.5">{snap.any ? 'сумма записанных дней' : 'дневных записей нет'}</div>
                </div>
              </div>
            );
          })()}
        </Card>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        {/* Habits streaks */}
        <Card className="lg:col-span-1">
          <CardTitle icon={Flame} color="text-orange-400" right={<span className="text-xs text-slate-500">{dayHabits(today, habits).done}/{habits.length} сегодня</span>}>Привычки и стрики</CardTitle>
          <div className="space-y-2">
            {habits.map((h) => {
              const v = today.habits?.[h.id];
              const done = habitDone(h, v);
              const s = habitStreak(data, model, h.id);
              return (
                <button key={h.id} type="button" onClick={() => onToggleHabit?.(h)} aria-pressed={done}
                  className={`w-full min-h-[48px] flex items-center gap-3 rounded-xl px-3 py-2 text-left touch-manipulation active:scale-[.99] ${done ? 'bg-emerald-500/10' : 'bg-white/[.03]'}`}>
                  {done ? <CheckCircle2 size={22} className="text-emerald-400 shrink-0" /> : <Circle size={22} className="text-slate-500 shrink-0" />}
                  <span className="text-lg w-6 text-center">{h.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm truncate ${done ? 'text-slate-100' : 'text-slate-300'}`}>{h.name}</span>
                    {h.note && <span className="block text-[11px] text-slate-500 truncate">{h.note}</span>}
                  </span>
                  {h.target && <span className="text-xs tabular-nums text-slate-300">{Number(v) || 0}/{h.target}</span>}
                  <span className={`chip ${s >= 3 ? 'bg-orange-500/15 text-orange-300' : 'bg-white/5 text-slate-400'}`}>🔥 {s}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Today tasks */}
        <Card>
          <CardTitle icon={ListChecks} color="text-violet-400" right={<a href="#/tasks" className="text-xs text-sky-400 hover:underline">Все задачи →</a>}>Задачи на сегодня</CardTitle>
          <ul className="space-y-1.5">
            {(today.tasks || []).map((task, i) => (
              <li key={i} className="flex items-center gap-3 text-sm px-1 py-1.5">
                {task.done ? <CheckCircle2 size={18} className="text-violet-400 shrink-0" /> : <Circle size={18} className="text-slate-600 shrink-0" />}
                <span className={task.done ? 'text-slate-500 line-through' : 'text-slate-200'}>{task.title}</span>
              </li>
            ))}
            {!today.tasks?.length && <li className="text-sm text-slate-500">Задач пока нет</li>}
          </ul>
        </Card>

        {prs.length ? (
          <Card>
            <CardTitle icon={Trophy} color="text-amber-400" right={<a href="#/sport" className="text-xs text-sky-400 hover:underline">Спорт →</a>}>Личные рекорды</CardTitle>
            <div className="grid grid-cols-2 gap-2">
              {prs.map(({ ex, best, first }) => (
                <div key={ex.id} className="rounded-xl bg-gradient-to-br from-amber-400/10 to-transparent border border-amber-400/10 p-3">
                  <div className="text-xs text-slate-400 truncate">{ex.name}</div>
                  <div className="text-xl font-semibold text-white tabular-nums mt-0.5">{fmtNum(best, 1)} <span className="text-xs text-slate-400 font-normal">{ex.unit}</span></div>
                  <div className="mt-1"><Delta value={best - first} unit={` ${ex.unit}`} /></div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <CardTitle icon={Goal} color="text-emerald-400" right={<a href="#/goals" className="text-xs text-sky-400 hover:underline">Цели →</a>}>Цель по весу</CardTitle>
            {g ? (
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <div>{g.label
                    ? <><span className="text-2xl font-semibold text-white tabular-nums">{g.label}</span><span className="text-sm text-slate-400"> · до ~{fmtNum(g.goal, 1)} кг</span></>
                    : <><span className="text-2xl font-semibold text-white tabular-nums">{fmtNum(g.goal, 1)}</span><span className="text-sm text-slate-400"> кг</span></>}</div>
                  <span className="text-sm font-semibold text-emerald-300 tabular-nums">{Math.round(g.progress)}%</span>
                </div>
                <Bar value={g.progress} color="from-emerald-400 to-teal-300" className="h-2.5 mt-3" />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1 tabular-nums">
                  <span>старт {fmtNum(g.start, 1)}</span><span className="text-slate-300">сейчас {fmtNum(g.current, 1)}</span><span>цель {fmtNum(g.goal, 1)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="rounded-xl bg-white/[.03] py-2"><div className="text-lg font-semibold text-white tabular-nums">{fmtNum(Math.max(0, g.done), 1)}</div><div className="text-[10px] text-slate-500">сброшено, кг</div></div>
                  <div className="rounded-xl bg-white/[.03] py-2"><div className="text-lg font-semibold text-white tabular-nums">{fmtNum(Math.max(0, g.left), 1)}</div><div className="text-[10px] text-slate-500">осталось, кг</div></div>
                  <div className="rounded-xl bg-white/[.03] py-2"><div className="text-lg font-semibold text-white tabular-nums">{g.daysLeft ?? '—'}</div><div className="text-[10px] text-slate-500">дней до {g.date ? fmtShort(g.date) : 'цели'}</div></div>
                </div>
                {g.perWeek != null && g.left > 0 && <div className="text-xs text-slate-400 mt-3">Нужный темп ≈ {fmtNum(g.perWeek, 1)} кг/нед · калории {kcalTarget ? `${fmtNum(kcalTarget)} ккал/день` : '—'}</div>}
              </div>
            ) : <Empty>Цель по весу не задана</Empty>}
          </Card>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardTitle icon={TrendingDown} right={<span className="text-xs text-slate-500">{g ? `цель ${g.label ? `${g.label} (~${fmtNum(g.goal, 1)} кг)` : `${fmtNum(g.goal, 1)} кг`}${g.date ? ` к ${fmtShort(g.date)}` : ''}` : 'цель не задана'}</span>}>Динамика веса</CardTitle>
          <div className="h-48">
            {weightSeries.length || g ? (
              <ResponsiveContainer><ComposedChart data={weightChart} margin={{ left: -20, right: 8, top: 8 }}>
                <defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity=".35" /><stop offset="100%" stopColor="#38bdf8" stopOpacity="0" /></linearGradient></defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis domain={[(m) => Math.floor(Math.min(m, g?.goal ?? m) - 1), (m) => Math.ceil(Math.max(m, g?.start ?? m) + 1)]} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip unit=" кг" names={{ weight: 'Вес', plan: 'План' }} />} />
                {g && <ReferenceLine y={g.goal} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'цель', fill: '#34d399', fontSize: 10, position: 'insideBottomRight' }} />}
                {g && <Line dataKey="plan" stroke="#64748b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} activeDot={false} isAnimationActive={false} />}
                <Area dataKey="weight" stroke="#38bdf8" strokeWidth={2.5} fill="url(#wg2)" connectNulls dot={{ r: 3.5, fill: '#38bdf8', strokeWidth: 0 }} isAnimationActive={false} />
              </ComposedChart></ResponsiveContainer>
            ) : <Empty>Взвешиваний пока нет</Empty>}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{weightSeries.length < 2 ? 'Пока один замер — линия появится после следующих взвешиваний. ' : ''}{g ? 'Пунктир — план снижения до цели.' : ''}</div>
        </Card>
        <Card>
          <CardTitle icon={Utensils} color="text-orange-400" right={<span className="text-xs text-slate-500">последние 7 дней</span>}>Калории vs цель</CardTitle>
          <div className="h-48">
            {hasKcal ? (
              <ResponsiveContainer><BarChart data={kcalSeries} margin={{ left: -12, right: 8, top: 8 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[0, (max) => Math.max(500, Math.ceil(Math.max(max, kcalTarget || 0) * 1.1 / 500) * 500)]} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }} content={<ChartTooltip unit=" ккал" names={{ kcal: 'Калории' }} />} />
                {kcalTarget && <ReferenceLine y={kcalTarget} stroke="#fb923c" strokeDasharray="4 4" />}
                <RBar dataKey="kcal" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {kcalSeries.map((d, i) => <Cell key={i} fill={kcalTarget && d.kcal > kcalTarget * 1.05 ? '#fb7185' : '#fb923c'} fillOpacity={0.85} />)}
                </RBar>
              </BarChart></ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-1">
                <Utensils className="text-slate-600" size={28} />
                <div className="text-sm text-slate-400">Питание пока не записано</div>
                <div className="text-xs text-slate-500">{kcalTarget ? `цель ${fmtNum(kcalTarget)} ккал/день` : 'цель не задана'}{targets.maintenanceCalories ? ` · поддержание ≈ ${fmtNum(targets.maintenanceCalories)}` : ''}</div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
