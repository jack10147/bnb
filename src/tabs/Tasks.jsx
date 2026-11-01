import React, { useState } from 'react';
import { CheckCircle2, Circle, CalendarDays, Plus, ListTodo, Trash2 } from 'lucide-react';
import { Card, CardTitle, SectionHeader, Ring } from '../components/ui.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import { addDays, monthLabel, fmtShort, readMyTasks, writeMyTasks } from '../lib.js';

const field = 'w-full min-h-[48px] rounded-xl bg-white/[.04] border border-white/[.08] px-3 text-base text-white outline-none focus:border-violet-400/50';

function MyTasks({ today, minMonth, maxMonth }) {
  const [tasks, setTasks] = useState(readMyTasks);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState(today);
  const [error, setError] = useState('');

  const dayTasks = tasks
    .filter((t) => t.date === selected)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title, 'ru'));
  const dayDone = dayTasks.filter((t) => t.done).length;

  const persist = (next) => setTasks(writeMyTasks(next));

  const onAdd = (e) => {
    e.preventDefault();
    const text = title.trim();
    if (!text) {
      setError('Введите текст задачи');
      return;
    }
    const row = {
      id: globalThis.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: date || today,
      title: text,
      done: false,
    };
    persist([row, ...tasks]);
    setTitle('');
    setError('');
    setSelected(row.date);
  };

  const onToggle = (id) => {
    persist(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const onDelete = (id) => {
    persist(tasks.filter((t) => t.id !== id));
  };

  const cell = (iso) => {
    const pinned = tasks.filter((t) => t.date === iso);
    if (!pinned.length) return { tone: iso > today ? 'future' : 'empty' };
    const ok = pinned.filter((t) => t.done).length;
    const tone = ok === pinned.length ? 'good' : 'mid';
    return {
      tone,
      label: `${ok}/${pinned.length}`,
      title: pinned.map((t) => `${t.done ? '✓' : '○'} ${t.title}`).join('\n'),
    };
  };

  return (
    <Card className="mb-4">
      <CardTitle icon={ListTodo} color="text-sky-400" right={<span className="text-xs text-slate-500">Только на этом телефоне.</span>}>
        Мои задачи
      </CardTitle>
      <p className="text-xs text-slate-500 mb-3">Свои задачи с галочками по дням. Хранятся только здесь, в общий список не попадают.</p>

      <form onSubmit={onAdd} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая задача…"
          className={field}
          enterKeyHint="done"
          autoComplete="off"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || today)}
          className={`${field} sm:w-[11rem]`}
        />
        <button
          type="submit"
          className="min-h-[48px] rounded-xl bg-violet-500/20 border border-violet-400/40 px-4 text-sm font-medium text-violet-100 touch-manipulation active:scale-[.99] inline-flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Добавить
        </button>
      </form>
      {error && <p className="text-xs text-rose-300 -mt-2 mb-3">{error}</p>}

      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-sm text-slate-300">
            {fmtShort(selected)}
            {selected === today ? <span className="text-slate-500"> · сегодня</span> : null}
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            {dayTasks.length ? `${dayDone}/${dayTasks.length}` : 'нет задач'}
          </div>
        </div>
        <ul className="space-y-2">
          {!dayTasks.length && (
            <li className="text-sm text-slate-500 rounded-xl bg-white/[.03] px-3 py-3">
              На этот день задач нет. Добавьте выше или выберите день на календаре.
            </li>
          )}
          {dayTasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-xl bg-white/[.03] pl-1 pr-2 py-1">
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                aria-pressed={t.done}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center touch-manipulation active:scale-[.98] rounded-xl"
              >
                {t.done
                  ? <CheckCircle2 size={22} className="text-emerald-400" />
                  : <Circle size={22} className="text-slate-500" />}
              </button>
              <span className={`flex-1 min-w-0 text-sm ${t.done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                {t.title}
              </span>
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                aria-label="Удалить"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-rose-300 touch-manipulation rounded-xl"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <MonthCalendar
        today={today}
        minMonth={minMonth}
        maxMonth={maxMonth}
        getCell={cell}
        selectedDay={selected}
        onDayClick={(iso) => {
          setSelected(iso);
          setDate(iso);
        }}
        showBar={false}
        legend={[
          { tone: 'good', label: 'все сделаны' },
          { tone: 'mid', label: 'частично' },
          { tone: 'empty', label: 'нет задач' },
        ]}
      />
    </Card>
  );
}

export default function Tasks({ data, model }) {
  const list = data.taskList || { month: model.today.slice(0, 7), items: [] };
  const items = list.items || [];
  const done = items.filter((t) => t.done).length;
  const total = items.length;
  const arcEnd = addDays(data.meta.startDate, data.meta.durationDays - 1);
  const month = list.month || model.today.slice(0, 7);
  const minMonth = month < data.meta.startDate.slice(0, 7) ? month : data.meta.startDate.slice(0, 7);
  const maxMonth = arcEnd.slice(0, 7) > month ? arcEnd.slice(0, 7) : month;

  const cell = (iso) => {
    if (iso > model.today) return { tone: 'future' };
    const pinned = items.filter((t) => t.date && t.date === iso);
    if (!pinned.length) return { tone: 'empty' };
    const ok = pinned.filter((t) => t.done).length;
    const tone = ok === pinned.length ? 'good' : ok > 0 ? 'mid' : 'flat';
    const label = pinned.length > 1 ? String(pinned.length) : '•';
    return { tone, label, title: pinned.map((t) => t.title).join(', ') };
  };

  return (
    <div>
      <SectionHeader title="Задачи" subtitle={`${list.label || 'Список месяца'} · ${monthLabel(month)}`} />
      <Card className="mb-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Ring value={total ? (done / total) * 100 : 0} size={96} stroke={9} color="#a78bfa">
            <span className="text-lg font-semibold text-white tabular-nums">{done}/{total || 0}</span>
          </Ring>
          <div className="min-w-0">
            <div className="text-white font-medium">Сделано из списка</div>
            <div className="text-sm text-slate-400 mt-1">{done} из {total || 0}. Отметок о выполнении нет.</div>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {!items.length && <li className="text-sm text-slate-500">Список пуст</li>}
          {items.map((t) => (
            <li key={t.id || t.title} className="flex items-center gap-3 rounded-xl bg-white/[.03] px-3 py-3 text-sm">
              {t.done ? <CheckCircle2 size={20} className="text-violet-400 shrink-0" /> : <Circle size={20} className="text-slate-600 shrink-0" />}
              <span className={t.done ? 'text-slate-500 line-through' : 'text-slate-100'}>{t.title}</span>
            </li>
          ))}
        </ul>
      </Card>

      {(data.taskListHistory || []).filter((h) => h.month !== month).map((h) => (
        <Card key={h.month} className="mb-4">
          <CardTitle icon={CalendarDays} color="text-slate-400">{h.label || monthLabel(h.month)} · архив</CardTitle>
          <ul className="space-y-2">
            {(h.items || []).map((t) => (
              <li key={t.id || t.title} className="flex items-center gap-3 rounded-xl bg-white/[.03] px-3 py-2.5 text-sm">
                {t.done ? <CheckCircle2 size={18} className="text-violet-400 shrink-0" /> : <Circle size={18} className="text-slate-600 shrink-0" />}
                <span className={`flex-1 ${t.done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{t.title}</span>
                {!t.done && t.movedTo && <span className="text-[11px] text-sky-400">→ {monthLabel(t.movedTo)}</span>}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <MyTasks today={model.today} minMonth={minMonth} maxMonth={maxMonth} />

      <Card>
        <CardTitle icon={CalendarDays} color="text-violet-400">Календарь</CardTitle>
        <p className="text-xs text-slate-500 mb-3">Задачу можно поставить на конкретный день. Сейчас ни одна не привязана — клетки пустые.</p>
        <MonthCalendar
          today={model.today}
          minMonth={minMonth}
          maxMonth={maxMonth}
          getCell={cell}
          showBar={false}
        />
      </Card>
    </div>
  );
}
