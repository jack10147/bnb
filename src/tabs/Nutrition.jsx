import React, { useState } from 'react';
import { ComposedChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie } from 'recharts';
import { Flame, Beef, Droplet, Wheat, Utensils, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Card, CardTitle, SectionHeader, Ring, Bar, ChartTooltip, Empty } from '../components/ui.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import { fmtNum, fmtShort, fmtLong, dayNutrition, arcWeek, pct, addDays, monthDates } from '../lib.js';

const pie0 = (n) => n.protein + n.fat + n.carbs > 0;
const MACROS = [
  { k: 'protein', label: 'Белки', color: '#38bdf8', icon: Beef, tk: 'protein' },
  { k: 'fat', label: 'Жиры', color: '#facc15', icon: Droplet, tk: 'fat' },
  { k: 'carbs', label: 'Углеводы', color: '#a78bfa', icon: Wheat, tk: 'carbs' },
];

export default function Nutrition({ data, model }) {
  const { targets } = data;
  const dates = model.allDates.filter((d) => d <= model.today && dayNutrition(model.get(d)));
  const [sel, setSel] = useState(dates[dates.length - 1] || model.today);
  const kT = targets.calories ?? null;
  const idx = dates.indexOf(sel);
  const n = dayNutrition(model.get(sel)) || { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  const meals = model.get(sel)?.nutrition?.meals || [];
  const series = dates.map((d) => { const x = dayNutrition(model.get(d)); return { date: d, label: fmtShort(d), kcal: x.kcal, protein: x.protein * 4, fat: x.fat * 9, carbs: x.carbs * 4 }; });
  const weeks = {};
  for (const d of dates) { const w = arcWeek(data, d); const x = dayNutrition(model.get(d)); weeks[w] = weeks[w] || { n: 0, kcal: 0, protein: 0, fat: 0, carbs: 0 }; weeks[w].n++; for (const k of ['kcal', 'protein', 'fat', 'carbs']) weeks[w][k] += x[k]; }
  const over = kT != null && n.kcal > kT * 1.05;
  const hasPie = pie0(n);
  const pie = MACROS.map((m) => ({ name: m.label, value: n[m.k] * (m.k === 'fat' ? 9 : 4), fill: m.color }));

  return (
    <div>
      <SectionHeader title="Питание" subtitle="Калории, БЖУ и приёмы пищи"
        right={<div className="flex items-center gap-1 rounded-xl bg-white/[.05] border border-white/[.07] p-1">
          <button disabled={idx <= 0} onClick={() => setSel(dates[idx - 1])} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-sm text-slate-200 px-2 min-w-[7rem] text-center">{sel === model.today ? 'Сегодня' : fmtShort(sel)}</span>
          <button disabled={idx >= dates.length - 1} onClick={() => setSel(dates[idx + 1])} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>} />

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4 mb-4">
        <Card className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
          <Ring value={pct(n.kcal, kT)} size={150} stroke={13} color={over ? '#fb7185' : '#fb923c'}>
            <Flame size={18} className={over ? 'text-rose-400' : 'text-orange-400'} />
            <span className="text-2xl font-semibold text-white tabular-nums">{fmtNum(n.kcal)}</span>
            <span className="text-[11px] text-slate-400">{kT ? `из ${fmtNum(kT)} ккал` : 'цель не задана'}</span>
          </Ring>
          <div className="flex-1 w-full space-y-3">
            {MACROS.map((m) => (
              <div key={m.k}>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-300 flex items-center gap-1.5"><m.icon size={14} style={{ color: m.color }} />{m.label}</span><span className="text-white tabular-nums">{fmtNum(n[m.k])}{targets[m.tk] != null ? ` / ${targets[m.tk]}` : ''} г</span></div>
                <div className="h-2 rounded-full bg-white/[.07] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct(n[m.k], targets[m.tk])}%`, background: m.color }} /></div>
              </div>
            ))}
            <div className={`text-xs ${over ? 'text-rose-300' : 'text-emerald-300'}`}>{kT == null ? 'Цель по калориям не задана' : over ? `Перебор на ${fmtNum(n.kcal - kT)} ккал` : `Осталось ${fmtNum(Math.max(0, kT - n.kcal))} ккал`}{targets.maintenanceCalories ? <span className="text-slate-500"> · поддержание ≈ {fmtNum(targets.maintenanceCalories)}</span> : null}</div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle icon={Utensils} color="text-orange-400" right={<span className="text-xs text-slate-500">{fmtLong(sel)}</span>}>Приёмы пищи</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4 items-center">
            <div className="space-y-2">
              {!meals.length && (n.summary ? <div className="text-sm text-slate-300">Сумма за день, без разбивки по приёмам. БЖУ не считались.</div> : <Empty>Приёмы пищи за этот день не записаны</Empty>)}
              {meals.map((m, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[.03] px-3 py-2.5">
                  <div className="w-16 shrink-0 text-xs text-orange-300/90">{m.type}</div>
                  <div className="flex-1 min-w-0"><div className="text-sm text-slate-100 truncate">{m.name}</div>{m.protein != null && <div className="text-[11px] text-slate-500">Б {m.protein} · Ж {m.fat} · У {m.carbs}</div>}</div>
                  <div className="text-sm font-medium text-white tabular-nums">{m.kcal}<span className="text-[10px] text-slate-500 ml-0.5">ккал</span></div>
                </div>
              ))}
            </div>
            {hasPie && <div className="h-36 hidden sm:block">
              <ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={3} stroke="none" /><Tooltip content={<ChartTooltip unit=" ккал" />} /></PieChart></ResponsiveContainer>
              <div className="text-[10px] text-center text-slate-500 -mt-1">доля ккал из БЖУ</div>
            </div>}
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <CardTitle icon={CalendarDays} color="text-orange-400">Календарь калорий</CardTitle>
        {!dates.length && <div className="text-sm text-slate-400 mb-3">Приёмы пищи пока не записаны — дни без записи нейтральные, цифры не подставлены.</div>}
        <MonthCalendar
          today={model.today}
          minMonth={data.meta.startDate.slice(0, 7)}
          maxMonth={addDays(data.meta.startDate, data.meta.durationDays - 1).slice(0, 7)}
          getCell={(iso) => {
            if (iso > model.today) return { tone: 'future' };
            const x = dayNutrition(model.get(iso));
            if (!x) return { tone: 'empty' };
            let tone = 'good';
            if (kT != null && x.kcal > kT * 1.2) tone = 'bad';
            else if (kT != null && x.kcal > kT * 1.05) tone = 'mid';
            const label = x.kcal >= 1000 ? `${(x.kcal / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}к` : String(Math.round(x.kcal));
            return { tone, label, title: `${Math.round(x.kcal)} ккал${kT ? ` · цель ${kT}` : ''}` };
          }}
          summary={(month) => {
            const logged = monthDates(month).filter((d) => d <= model.today && dayNutrition(model.get(d)));
            const overN = logged.filter((d) => kT != null && dayNutrition(model.get(d)).kcal > kT * 1.05).length;
            const avg = logged.length ? logged.reduce((s, d) => s + dayNutrition(model.get(d)).kcal, 0) / logged.length : null;
            return [
              { label: 'В цели', value: logged.length - overN, accent: 'text-emerald-300' },
              { label: 'Выше', value: overN, accent: 'text-rose-300' },
              { label: 'Средние', value: avg == null ? '—' : fmtNum(avg) },
            ];
          }}
          legend={[
            { tone: 'good', label: 'в цели' },
            { tone: 'mid', label: 'чуть выше' },
            { tone: 'bad', label: 'перебор' },
            { tone: 'empty', label: 'нет записи' },
          ]}
        />
      </Card>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="lg:col-span-2">
          <CardTitle icon={Flame} color="text-orange-400" right={<span className="text-xs text-slate-500">ккал из Б / Ж / У</span>}>Калории по дням</CardTitle>
          <div className="h-64">
            {!series.length ? <div className="h-full flex items-center justify-center"><Empty>Питание пока не записано</Empty></div> : <ResponsiveContainer><ComposedChart data={series} margin={{ left: -12, right: 4, top: 8 }} onClick={(e) => e?.activePayload && setSel(e.activePayload[0].payload.date)}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} domain={[0, (max) => Math.max(500, Math.ceil(Math.max(max, kT || 0) * 1.1 / 500) * 500)]} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }} content={<ChartTooltip unit=" ккал" names={{ protein: 'Белки', fat: 'Жиры', carbs: 'Углеводы' }} />} />
              {kT && <ReferenceLine y={kT} stroke="#fb923c" strokeDasharray="4 4" label={{ value: 'цель', fill: '#fb923c', fontSize: 10, position: 'insideTopRight' }} />}
              <RBar dataKey="protein" stackId="a" fill="#38bdf8" maxBarSize={28} />
              <RBar dataKey="fat" stackId="a" fill="#facc15" maxBarSize={28} />
              <RBar dataKey="carbs" stackId="a" fill="#a78bfa" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </ComposedChart></ResponsiveContainer>}
          </div>
        </Card>
        <Card>
          <CardTitle icon={CalendarDays} color="text-orange-400">Средние за неделю</CardTitle>
          <div className="space-y-4">
            {!dates.length && <Empty>Нет данных</Empty>}
            {Object.entries(weeks).map(([w, x]) => {
              const a = (k) => x[k] / x.n;
              return (
                <div key={w} className="rounded-xl bg-white/[.03] p-3">
                  <div className="flex justify-between items-baseline"><span className="text-sm text-slate-300">Неделя {w}</span><span className="text-lg font-semibold text-white tabular-nums">{fmtNum(a('kcal'))} <span className="text-xs text-slate-400 font-normal">ккал/день</span></span></div>
                  <Bar value={pct(a('kcal'), kT)} color="from-orange-400 to-amber-300" className="h-1.5 mt-2" />
                  <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                    {MACROS.map((m) => <div key={m.k}><div className="text-[10px] text-slate-500">{m.label}</div><div className="text-sm tabular-nums" style={{ color: m.color }}>{fmtNum(a(m.k))} г</div></div>)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
