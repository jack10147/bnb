import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Receipt, Trash2, CalendarRange, CalendarDays, PiggyBank, PieChart as PieIcon, Banknote, CreditCard, Wallet, Gauge, CalendarClock, Plus, X, ChevronDown } from 'lucide-react';
import { Card, CardTitle, Empty } from './ui.jsx';
import {
  EXPENSE_CATEGORIES, guessExpenseCategory, fmtKzt, fmtShort, monthLabel,
  readExpenses, writeExpenses, mergeExpenses, expenseSnapshot, monthSpendSlices,
  PAYMENT_METHODS, monthPaymentStats, plural, isUsdExpense,
  readWalletTopups, writeWalletTopups, mergeWalletTopups, walletBalances, categoryColor,
} from '../lib.js';

const field = 'w-full min-h-[48px] rounded-xl bg-white/[.04] border border-white/[.08] px-3 text-base text-white outline-none focus:border-emerald-400/50';

function Money({ label, value, sub, icon: Icon, accent, className = '' }) {
  return (
    <Card className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <div className="card-title">{Icon && <Icon size={16} className={accent} />}<span className="truncate">{label}</span></div>
      <div className="text-lg sm:text-2xl font-semibold text-white tabular-nums tracking-tight leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </Card>
  );
}

function KztTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-300">{p.name}</div>
      <div className="font-medium tabular-nums text-white">{fmtKzt(p.value)}</div>
    </div>
  );
}

const newId = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const parseAmount = (raw) => Number(String(raw).replace(/\s/g, '').replace(',', '.'));

// Карточка кошелька ₸ с кнопкой «Пополнил» и встроенной формой суммы.
function WalletCard({ label, value, sub, icon: Icon, accent, fmt, onTopup }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const neg = value != null && value < 0;

  const close = () => { setOpen(false); setAmount(''); setNote(''); setError(''); };
  const onSave = (e) => {
    e.preventDefault();
    const n = parseAmount(amount);
    if (!Number.isFinite(n) || n <= 0) { setError('Введите сумму больше нуля'); return; }
    onTopup({ amount: n, note: note.trim() });
    close();
  };

  return (
    <Card className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="card-title flex-1 min-w-0"><Icon size={16} className={accent} /><span className="truncate">{label}</span></div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 min-h-[36px] px-2.5 rounded-lg bg-emerald-400/10 text-emerald-300 text-xs font-medium inline-flex items-center gap-1 touch-manipulation"
          >
            <Plus size={14} />Пополнил
          </button>
        )}
      </div>
      <div className={`text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight leading-tight ${neg ? 'text-rose-300' : 'text-white'}`}>
        {fmt(value)}
      </div>
      {sub && <div className="text-[11px] text-slate-500 leading-snug">{sub}</div>}
      {open && (
        <form onSubmit={onSave} className="grid gap-2 mt-1 sm:max-w-md">
          <input
            className={field}
            inputMode="decimal"
            type="number"
            min="0"
            step="any"
            autoFocus
            placeholder="Сумма, ₸"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
          <input
            className={field}
            type="text"
            maxLength={80}
            placeholder="Заметка (необязательно)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoComplete="off"
          />
          {error && <div className="text-sm text-rose-300">{error}</div>}
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:max-w-xs">
            <button type="submit" className="min-h-[44px] rounded-xl bg-emerald-400 text-slate-950 font-semibold text-sm touch-manipulation">Сохранить</button>
            <button type="button" aria-label="Отмена" onClick={close} className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[.06] text-slate-300 flex items-center justify-center touch-manipulation"><X size={16} /></button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function Expenses({ data, today }) {
  const [local, setLocal] = useState(readExpenses);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState('Другое');
  const [manual, setManual] = useState(false);
  const [payment, setPayment] = useState('card');
  const [error, setError] = useState('');
  const [localTopups, setLocalTopups] = useState(readWalletTopups);
  const [topupsOpen, setTopupsOpen] = useState(false);
  const [openCats, setOpenCats] = useState(() => new Set());
  const toggleCat = (name) => setOpenCats((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  const guess = guessExpenseCategory(note);
  // Долларовые записи (если остались на телефоне со старой версии) не показываются и не считаются, но из памяти не удаляются.
  const merged = useMemo(() => mergeExpenses(data, local).filter((row) => !isUsdExpense(row)), [data, local]);
  const snap = expenseSnapshot(merged, today);
  const slices = monthSpendSlices(merged, today);
  const month = today.slice(0, 7);
  const pay = monthPaymentStats(merged, month, today);
  const daysLabel = `${pay.days} ${plural(pay.days, 'день', 'дня', 'дней')}`;
  const monthList = merged
    .filter((row) => row.date && row.date.startsWith(month))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
  const monthHasDepositOnly = monthList.length > 0 && slices.length === 0;
  // Записи месяца по категориям: внутри группы — как раньше (новые сверху), группы — по сумме, больше сверху.
  const groups = useMemo(() => {
    const map = new Map();
    for (const row of monthList) {
      const name = row.category || 'Другое';
      if (!map.has(name)) map.set(name, { name, rows: [], total: 0 });
      const g = map.get(name);
      g.rows.push(row);
      const n = Number(row.amountKzt);
      if (Number.isFinite(n)) g.total += n;
    }
    return [...map.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ru'));
  }, [monthList]);
  const topups = useMemo(() => mergeWalletTopups(data, localTopups).filter((t) => t.currency !== 'USD'), [data, localTopups]);
  const wallet = walletBalances(data, merged, topups);
  const walletTopups = wallet
    ? topups.filter((t) => !wallet.asOf || t.date >= wallet.asOf).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1))
    : [];

  const onTopup = ({ amount: n, note: text }) => {
    const row = { id: newId('top'), date: today, currency: 'KZT', amount: n, note: text };
    setLocalTopups(writeWalletTopups([row, ...readWalletTopups()]));
  };
  const onDeleteTopup = (id) => {
    setLocalTopups(writeWalletTopups(readWalletTopups().filter((row) => row.id !== id)));
  };

  const onNote = (value) => {
    setNote(value);
    if (!manual) setCategory(guessExpenseCategory(value));
  };

  const onSave = (e) => {
    e.preventDefault();
    const n = parseAmount(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Введите сумму больше нуля');
      return;
    }
    const row = {
      id: newId('exp'),
      date: date || today,
      amountKzt: n,
      note: note.trim(),
      category,
      payment,
    };
    const next = writeExpenses([row, ...readExpenses()]);
    setLocal(next);
    setAmount('');
    setNote('');
    setCategory('Другое');
    setManual(false);
    setPayment('card');
    setError('');
  };

  const onDelete = (id) => {
    setLocal(writeExpenses(readExpenses().filter((row) => row.id !== id)));
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Расходы</h2>
      <p className="text-sm text-slate-400 mt-1 mb-4">Тенге. Кошелёк ₸ отдельно от основного баланса. В цель и в календарь долларов это не входит.</p>

      {wallet && (
        <div className="mb-4">
          <WalletCard
            label="Баланс ₸"
            value={wallet.kzt}
            fmt={fmtKzt}
            icon={Wallet}
            accent="text-emerald-400"
            sub={(
              <>
                <span className="whitespace-nowrap">старт {fmtKzt(wallet.startKzt)}{wallet.asOf ? ` на ${fmtShort(wallet.asOf)}` : ''}</span>
                {' · '}<span className="whitespace-nowrap">пополнения +{fmtKzt(wallet.topKzt)}</span>
                {' · '}<span className="whitespace-nowrap">траты −{fmtKzt(wallet.spentKzt)}</span>
              </>
            )}
            onTopup={onTopup}
          />
          {walletTopups.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                aria-expanded={topupsOpen}
                onClick={() => setTopupsOpen((v) => !v)}
                className="w-full min-h-[44px] flex items-center gap-2 rounded-xl bg-white/[.03] px-3 text-sm text-slate-300 touch-manipulation select-none"
              >
                <span className="flex-1 text-left">История пополнений <span className="text-slate-500">({walletTopups.length})</span></span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform duration-200 ${topupsOpen ? 'rotate-180' : ''}`} />
              </button>
              {topupsOpen && (
                <ul className="mt-1 space-y-1">
                  {walletTopups.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 rounded-xl bg-white/[.03] px-3 py-1.5 text-sm min-w-0">
                      <Plus size={14} className="text-emerald-400 shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-slate-300">
                        Пополнение{t.note ? ` · ${t.note}` : ''}
                        <span className="text-[11px] text-slate-500"> · {fmtShort(t.date)}{t.local ? '' : ' · с сайта'}</span>
                      </span>
                      <span className="tabular-nums text-emerald-300 shrink-0">+{fmtKzt(t.amount)}</span>
                      {t.local ? (
                        <button type="button" aria-label="Удалить пополнение" onClick={() => onDeleteTopup(t.id)} className="shrink-0 min-h-[36px] min-w-[36px] -mr-1 rounded-lg text-slate-400 hover:text-rose-300 flex items-center justify-center touch-manipulation">
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        <Money label="Эта неделя" value={fmtKzt(snap.week)} sub="пн–вс, без депозита" icon={CalendarRange} accent="text-emerald-400" />
        <Money label="Этот месяц" value={fmtKzt(snap.month)} sub="без депозита" icon={CalendarDays} accent="text-emerald-400" />
        <Money label="Этот год" value={fmtKzt(snap.year)} sub="без депозита" icon={CalendarDays} accent="text-teal-300" />
        <Card className="flex flex-col gap-2 min-w-0">
          <div className="card-title"><PiggyBank size={16} className="text-indigo-300" /><span>Депозит</span></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] text-slate-500">Этот месяц</div>
              <div className="text-base sm:text-lg font-semibold text-white tabular-nums leading-tight">{fmtKzt(snap.depositMonth)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">За всё время</div>
              <div className="text-base sm:text-lg font-semibold text-white tabular-nums leading-tight">{fmtKzt(snap.depositAll)}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-4">
        <Money label="Всего за месяц" value={fmtKzt(pay.total)} sub="наличные + карта, без депозита" icon={Wallet} accent="text-emerald-400" className="col-span-2 lg:col-span-1" />
        <Money label="Наличные" value={fmtKzt(pay.cash)} sub="за месяц" icon={Banknote} accent="text-amber-300" />
        <Money label="Карта / остальное" value={fmtKzt(pay.card)} sub="за месяц" icon={CreditCard} accent="text-sky-300" />
        <Money label="В среднем в день" value={fmtKzt(Math.round(pay.perDay))} sub={`за ${daysLabel}`} icon={Gauge} accent="text-teal-300" />
        <Money label="В среднем в неделю" value={fmtKzt(Math.round(pay.perWeek))} sub="в день × 7" icon={CalendarClock} accent="text-teal-300" />
      </div>

      <Card className="mb-4">
        <CardTitle icon={PieIcon} color="text-emerald-400">{monthLabel(month)}</CardTitle>
        {slices.length === 0 ? (
          <Empty>
            {monthHasDepositOnly
              ? 'В этом месяце есть только депозит. Круг показывает траты, отложенные деньги в него не входят.'
              : 'Расходов за этот месяц пока нет. Добавь сумму ниже — здесь появится круг по категориям.'}
          </Empty>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 sm:gap-4 items-center">
            <div className="h-52 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={slices} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
                    {slices.map((s) => <Cell key={s.name} fill={s.fill} />)}
                  </Pie>
                  <Tooltip content={<KztTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 min-w-0">
              {slices.map((s) => (
                <li key={s.name} className="flex items-center gap-2 text-sm min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.fill }} />
                  <span className="flex-1 min-w-0 text-slate-300 truncate">{s.name}</span>
                  <span className="tabular-nums text-white shrink-0">{fmtKzt(s.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <CardTitle icon={Receipt} color="text-emerald-400">Новая запись</CardTitle>
        <form onSubmit={onSave} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-slate-400">Сумма, тенге</span>
            <input
              className={field}
              inputMode="decimal"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-slate-400">На что</span>
            <input
              className={field}
              type="text"
              maxLength={80}
              placeholder="кофе, такси, аренда"
              value={note}
              onChange={(e) => onNote(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-slate-400">Дата</span>
            <input className={field} type="date" required value={date} onChange={(e) => setDate(e.target.value)} style={{ colorScheme: 'dark' }} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-slate-400">Категория</span>
            <select
              className={field}
              value={category}
              onChange={(e) => { setManual(true); setCategory(e.target.value); }}
              style={{ colorScheme: 'dark' }}
            >
              {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
            </select>
            {note.trim() ? (
              <span className="text-[11px] text-slate-500">
                По заметке: {guess}{manual && guess !== category ? ' · выбрано вручную' : ''}
              </span>
            ) : null}
          </label>
          <div className="grid gap-1">
            <span className="text-xs text-slate-400">Оплата</span>
            <div role="radiogroup" aria-label="Оплата" className="grid grid-cols-2 gap-1 rounded-xl bg-white/[.04] border border-white/[.08] p-1">
              {PAYMENT_METHODS.map((m) => {
                const on = payment === m.id;
                const Icon = m.id === 'cash' ? Banknote : CreditCard;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPayment(m.id)}
                    className={`min-h-[44px] rounded-lg flex items-center justify-center gap-2 text-sm font-medium touch-manipulation ${on ? (m.id === 'cash' ? 'bg-amber-300/15 text-amber-200' : 'bg-sky-400/15 text-sky-200') : 'text-slate-400'}`}
                  >
                    <Icon size={16} />{m.label}
                  </button>
                );
              })}
            </div>
          </div>
          {error && <div className="text-sm text-rose-300">{error}</div>}
          <button type="submit" className="min-h-[48px] rounded-xl bg-emerald-400 text-slate-950 font-semibold text-base touch-manipulation active:scale-[.99]">
            Сохранить
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          На этом телефоне. Вечером напиши те же суммы в чат, чтобы я записал их на сайт.
        </p>
      </Card>

      <Card>
        <CardTitle icon={Receipt} color="text-emerald-400" right={<span className="text-xs text-slate-500">{monthLabel(month)}</span>}>
          Записи
        </CardTitle>
        {!monthList.length && <Empty>В этом месяце записей ещё нет.</Empty>}
        <ul className="space-y-2">
          {groups.map((g) => {
            const open = openCats.has(g.name);
            return (
              <li key={g.name} className="rounded-xl bg-white/[.03] min-w-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleCat(g.name)}
                  className="w-full min-h-[52px] flex items-center gap-3 px-3 py-2 text-left touch-manipulation select-none"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: categoryColor(g.name) }} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-slate-100 truncate">{g.name}</span>
                    <span className="block text-[11px] text-slate-500">{g.rows.length} {plural(g.rows.length, 'запись', 'записи', 'записей')}</span>
                  </span>
                  <span className="text-sm font-medium text-white tabular-nums shrink-0">{fmtKzt(g.total)}</span>
                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <ul className="border-t border-white/[.06] px-2 pb-1">
                    {g.rows.map((row) => (
                      <li key={row.id} className="flex items-center gap-3 px-1 py-1.5 min-w-0 border-b border-white/[.04] last:border-b-0">
                        <div className="flex-1 min-w-0 pl-5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm text-slate-200 truncate">{row.note || row.category}</span>
                            {row.payment === 'cash' ? (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
                                <Banknote size={11} />нал
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {fmtShort(row.date)}{row.local ? '' : ' · с сайта'}
                          </div>
                        </div>
                        <div className="text-sm text-white tabular-nums shrink-0">{fmtKzt(row.amountKzt)}</div>
                        {row.local ? (
                          <button type="button" aria-label="Удалить" onClick={() => onDelete(row.id)} className="shrink-0 min-h-[44px] min-w-[44px] -mr-1 rounded-xl text-slate-400 hover:text-rose-300 flex items-center justify-center touch-manipulation">
                            <Trash2 size={16} />
                          </button>
                        ) : <span className="shrink-0 w-4" aria-hidden="true" />}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
