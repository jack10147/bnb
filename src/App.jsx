import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Target, ListChecks, Flame, Dumbbell, Apple, Snowflake, Wallet } from 'lucide-react';
import { buildModel, fmtLong, readHabitTaps, applyHabitTaps, nextHabitValue, writeHabitTap, isFinanceHidden } from './lib.js';
import Overview from './tabs/Overview.jsx';
import Goals from './tabs/Goals.jsx';
import Tasks from './tabs/Tasks.jsx';
import Habits from './tabs/Habits.jsx';
import Sport from './tabs/Sport.jsx';
import Nutrition from './tabs/Nutrition.jsx';
import Finance from './tabs/Finance.jsx';
import Intro from './components/Intro.jsx';

const TABS = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard, C: Overview },
  { id: 'finance', label: 'Финансы', icon: Wallet, C: Finance },
  { id: 'nutrition', label: 'Питание', icon: Apple, C: Nutrition },
  { id: 'habits', label: 'Привычки', icon: Flame, C: Habits },
  { id: 'tasks', label: 'Задачи', icon: ListChecks, C: Tasks },
  { id: 'sport', label: 'Спорт', icon: Dumbbell, C: Sport },
  { id: 'goals', label: 'Цели', icon: Target, C: Goals },
];

const tabFromHash = () => {
  const h = window.location.hash.replace(/^#\/?/, '');
  return TABS.some((t) => t.id === h) ? h : 'overview';
};

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(tabFromHash());
  const [habitTaps, setHabitTaps] = useState(readHabitTaps);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (sessionStorage.getItem('winter-arc-intro-2')) return;
      sessionStorage.setItem('winter-arc-intro-2', '1');
      setShowIntro(true);
    } catch { /* приватный режим — без заставки */ }
  }, []);

  useEffect(() => {
    fetch(`./data/data.json?v=${Date.now()}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message));
    const onHash = () => { setTab(tabFromHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // meta.hideFinance: #/finance ведёт на Обзор
  const hideFinance = isFinanceHidden(data);
  useEffect(() => {
    if (!hideFinance || tab !== 'finance') return;
    try { window.history.replaceState(null, '', '#/overview'); } catch { /* ignore */ }
    setTab('overview');
  }, [hideFinance, tab]);

  if (error) return <div className="p-8 text-rose-300">Не удалось загрузить data/data.json: {error}</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400"><Snowflake className="animate-spin mr-2" size={18} /> Загрузка…</div>;

  const view = applyHabitTaps(data, habitTaps);
  const model = buildModel(view);
  const { meta } = view;
  const onToggleHabit = (habit) => {
    const today = model.today;
    const current = model.get(today)?.habits?.[habit.id];
    setHabitTaps(writeHabitTap(today, habit.id, nextHabitValue(habit, current)));
  };
  const tabs = hideFinance ? TABS.filter((t) => t.id !== 'finance') : TABS;
  const Active = (tabs.find((t) => t.id === tab) || tabs[0]).C;
  const dayLabel = model.dayNum < 1 ? `Старт через ${1 - model.dayNum} дн.` : model.dayNum > meta.durationDays ? `Арка завершена` : `День ${model.dayNum} из ${meta.durationDays}`;

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      {showIntro && <Intro dayLabel={dayLabel} onClose={() => setShowIntro(false)} />}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#070b14]/75 border-b border-white/[.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 md:h-16 flex items-center gap-4">
          <a href="#/overview" className="flex items-center gap-2 shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt=""
              width={36}
              height={36}
              className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-black/30"
            />
            <div className="leading-tight">
              <div className="font-semibold text-white tracking-tight">{meta.title}</div>
              <div className="text-[11px] text-slate-400 -mt-0.5">{dayLabel}</div>
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-1 ml-4 overflow-x-auto no-scrollbar">
            {tabs.map((t) => (
              <a key={t.id} href={`#/${t.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition whitespace-nowrap ${tab === t.id ? 'bg-white/[.08] text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[.04]'}`}>
                <t.icon size={16} className={tab === t.id ? 'text-sky-400' : ''} />{t.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto text-right text-xs text-slate-400 hidden lg:block">
            <div className="text-slate-300">{fmtLong(model.today)}</div>
            <div>Алматы</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-5 md:pt-8">
        <Active data={view} model={model} onToggleHabit={onToggleHabit} />
        <footer className="mt-10 text-center text-xs text-slate-600">
          Обновлено: {meta.lastUpdated ? new Date(meta.lastUpdated).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', dateStyle: 'medium', timeStyle: 'short' }) : '—'} · Winter Arc ❄️
        </footer>
      </main>

      {/* Нижняя навигация для телефона */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a101d]/90 backdrop-blur-xl border-t border-white/[.08] pb-[env(safe-area-inset-bottom)]">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((t) => (
            <a key={t.id} href={`#/${t.id}`} className={`flex flex-col items-center gap-0.5 py-2 px-0.5 text-[9px] leading-none min-w-0 ${tab === t.id ? 'text-sky-300' : 'text-slate-500'}`}>
              <t.icon size={18} />
              <span className="truncate max-w-full">{t.label}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
