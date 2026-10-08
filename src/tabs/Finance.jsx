import React from 'react';
import { Wallet, TrendingUp, TrendingDown, CircleDollarSign, Landmark } from 'lucide-react';
import { Card, CardTitle, SectionHeader, Stat, Ring, Bar } from '../components/ui.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import { addDays, fmtUsd, fmtUsdCell, sumPnlUsd, currentBalanceUsd } from '../lib.js';
import Expenses from '../components/Expenses.jsx';

export default function Finance({ data, model }) {
  const goal = (data.goals?.month || []).find((g) => g.auto === 'financeUsd');
  const month = goal?.month || (goal?.deadline || model.today).slice(0, 7);
  const goalUsd = goal?.target ?? null;
  const pnl = sumPnlUsd(data, model, month);
  const netUsd = pnl.any ? pnl.sum : 0;
  const progress = goalUsd ? Math.max(0, Math.min(100, (netUsd / goalUsd) * 100)) : 0;
  const balance = currentBalanceUsd(data, model);
  const stableRaw = data.finance?.stableUsd;
  const stable = Number.isFinite(Number(stableRaw)) ? Number(stableRaw) : 0;
  const arcEnd = addDays(data.meta.startDate, data.meta.durationDays - 1);
  const minMonth = '2026-09'; // allow Sept P/L logging before arc start
  const maxMonth = arcEnd.slice(0, 7) > month ? arcEnd.slice(0, 7) : month;

  const cell = (iso) => {
    if (iso > model.today) return { tone: 'future' };
    const day = model.get(iso);
    const v = day?.pnlUsd ?? day?.pnlKzt;
    if (v == null || v === '') return { tone: 'empty' };
    const n = Number(v);
    if (Number.isNaN(n)) return { tone: 'empty' };
    if (n > 0) return { tone: 'good', label: fmtUsdCell(n), title: fmtUsd(n) };
    if (n < 0) return { tone: 'bad', label: fmtUsdCell(n), title: fmtUsd(n) };
    return { tone: 'flat', label: fmtUsdCell(0), title: fmtUsd(0) };
  };

  return (
    <div>
      <SectionHeader title="Финансы" subtitle="План на октябрь. На календаре и в итогах — доллары." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        <Card className="col-span-2 flex items-center gap-4">
          <Ring value={progress} size={92} stroke={9} color={netUsd < 0 ? '#fb7185' : '#34d399'}>
            <span className="text-sm font-semibold text-white tabular-nums">{Math.round(progress)}%</span>
          </Ring>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400">Итог месяца</div>
            <div className={`text-2xl font-semibold tabular-nums ${netUsd < 0 ? 'text-rose-300' : 'text-white'}`}>{fmtUsd(netUsd)}</div>
            <div className="text-xs text-slate-400 truncate">из {goalUsd == null ? '—' : fmtUsd(goalUsd, 0)}</div>
            <Bar value={progress} color="from-emerald-400 to-teal-300" className="h-2 mt-2" />
            {!pnl.any && <div className="text-[11px] text-slate-500 mt-1.5">Дневных результатов пока нет</div>}
          </div>
        </Card>
        <Stat label="Плюсовые дни" value={pnl.profit} icon={TrendingUp} accent="text-emerald-400" sub="прибыль" />
        <Stat label="Убыточные дни" value={pnl.loss} icon={TrendingDown} accent="text-rose-400" sub="убыток" />
        <Card className="col-span-2 flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-1 sm:gap-4 min-w-0 py-4">
          <div className="card-title"><CircleDollarSign size={18} className="text-amber-400" /><span>Баланс</span></div>
          <div className={`text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight ${balance != null && balance < 0 ? 'text-rose-300' : 'text-white'}`}>
            {fmtUsd(balance)}
          </div>
          <div className="text-xs text-slate-400 sm:ml-auto">текущий кэш · USD</div>
        </Card>
        <Card className="col-span-2 flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-1 sm:gap-4 min-w-0 py-4">
          <div className="card-title"><Landmark size={18} className="text-sky-400" /><span>Stable</span></div>
          <div className={`text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight ${stable < 0 ? 'text-rose-300' : 'text-white'}`}>
            {fmtUsd(stable)}
          </div>
          <div className="text-xs text-slate-400 sm:ml-auto text-right leading-snug">
            депозит · USD
            <div className="text-[11px] text-slate-500">P/L не влияет на Stable</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle icon={Wallet} color="text-emerald-400">Календарь</CardTitle>
        <MonthCalendar
          today={model.today}
          minMonth={minMonth}
          maxMonth={maxMonth}
          getCell={cell}
          summary={(ym) => {
            const snap = sumPnlUsd(data, model, ym);
            const net = snap.any ? snap.sum : 0;
            const same = ym === month;
            return [
              { label: 'Итог', value: snap.any ? fmtUsd(net) : '$0.00', accent: net < 0 ? 'text-rose-300' : 'text-emerald-300' },
              { label: 'Цель', value: same && goalUsd != null ? fmtUsd(goalUsd, 0) : '—' },
              { label: 'Дни +/−', value: `${snap.profit}/${snap.loss}` },
            ];
          }}
          legend={[
            { tone: 'good', label: 'прибыль' },
            { tone: 'bad', label: 'убыток' },
            { tone: 'empty', label: 'нет записи' },
          ]}
        />
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Цель октября {goalUsd == null ? '—' : fmtUsd(goalUsd, 0)}. Суммы на календаре в долларах. Пустые клетки — дни без записи.
        </p>
      </Card>

      <Expenses data={data} today={model.today} />
    </div>
  );
}
