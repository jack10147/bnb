// Вспомогательные функции: даты, агрегаты, стрики.
export const DAY = 864e5;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => iso(new Date(parse(s).getTime() + n * DAY));
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / DAY);

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WD_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
export const fmtShort = (s) => { const d = parse(s); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
export const fmtLong = (s) => { const d = parse(s); return `${d.getUTCDate()} ${MONTHS_FULL[d.getUTCMonth()]}, ${WD_FULL[d.getUTCDay()]}`; };
export const weekday = (s) => WD[parse(s).getUTCDay()];

export const almatyToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);

export const fmtNum = (n, digits = 0) =>
  n == null || Number.isNaN(n) ? '—' : Number(n).toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const pct = (a, b) => (b ? Math.max(0, Math.min(100, (a / b) * 100)) : 0);

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

// Сумма КБЖУ за день
export function dayNutrition(day) {
  const meals = day?.nutrition?.meals || [];
  const t = { kcal: 0, protein: 0, fat: 0, carbs: 0, summary: false };
  for (const m of meals) { t.kcal += m.kcal || 0; t.protein += m.protein || 0; t.fat += m.fat || 0; t.carbs += m.carbs || 0; }
  if (meals.length) return t;
  const kcal = day?.nutrition?.calories;
  if (kcal == null || kcal === '') return null;
  return { kcal: Number(kcal), protein: 0, fat: 0, carbs: 0, summary: true };
}
export function dayTasks(day) {
  const tasks = day?.tasks || [];
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, pct: tasks.length ? (done / tasks.length) * 100 : null };
}
// Привычка может быть булевой (true/false) или счётной (h.target, значение — число 0..target)
export const habitDone = (h, v) => (h?.target ? (Number(v) || 0) >= h.target : !!v);
export const habitFrac = (h, v) => (h?.target ? Math.max(0, Math.min(1, (Number(v) || 0) / h.target)) : v ? 1 : 0);
export const habitDoneOn = (model, h, d) => habitDone(h, model.get(d)?.habits?.[h.id]);
export function dayHabits(day, habits) {
  if (!day?.habits || !habits.length) return { done: 0, total: habits.length, pct: null };
  const done = habits.filter((h) => habitDone(h, day.habits[h.id])).length;
  return { done, total: habits.length, pct: (done / habits.length) * 100 };
}

// Лучший результат сета по метрике упражнения
export function setValue(set, metric) {
  if (metric === 'reps') return set.reps ?? null;
  if (metric === 'distance') return set.distanceKm ?? null;
  if (metric === 'time') return set.timeMin ?? null;
  return set.weight ?? null;
}

// Готовит модель: список дат арки, "сегодня", индексы
export function buildModel(data) {
  const { meta } = data;
  const today = meta.asOf || almatyToday();
  const dayNum = diffDays(meta.startDate, today) + 1;
  const arcDates = Array.from({ length: meta.durationDays }, (_, i) => addDays(meta.startDate, i));
  const elapsed = arcDates.filter((d) => d <= today);
  const allDates = Object.keys(data.days || {}).sort();
  const get = (d) => data.days?.[d];
  return { today, dayNum, arcDates, elapsed, allDates, get };
}

// Стрик привычки: подряд выполненные дни, заканчивая сегодня (или вчера, если сегодня ещё не отмечено)
const habitById = (data, id) => data.habits.find((h) => h.id === id);
export function habitStreak(data, model, id) {
  const h = habitById(data, id);
  let d = model.today;
  if (!habitDoneOn(model, h, d)) d = addDays(d, -1);
  let n = 0;
  while (d >= data.meta.startDate && habitDoneOn(model, h, d)) { n++; d = addDays(d, -1); }
  return n;
}
export function habitBestStreak(data, model, id) {
  const h = habitById(data, id);
  let best = 0, cur = 0;
  for (const d of model.elapsed) { if (habitDoneOn(model, h, d)) { cur++; best = Math.max(best, cur); } else cur = 0; }
  return best;
}

// Все подходы упражнения по датам: [{date, best}]
export function exerciseSeries(data, ex) {
  const out = [];
  for (const date of Object.keys(data.days || {}).sort()) {
    const w = data.days[date].workout;
    const e = w?.exercises?.find((x) => x.id === ex.id);
    if (!e) continue;
    const vals = e.sets.map((s) => setValue(s, ex.metric)).filter((v) => v != null);
    if (vals.length) out.push({ date, label: fmtShort(date), best: Math.max(...vals) });
  }
  return out;
}

// Автоматически вычисляемые цели
export function goalCurrent(goal, data, model) {
  if (goal.auto === 'workHours') return model.elapsed.reduce((s, d) => s + (model.get(d)?.work?.hours || 0), 0);
  if (goal.auto === 'workouts') return model.elapsed.filter((d) => model.get(d)?.workout).length;
  if (goal.auto === 'weight') { const w = latestWeight(data, model); return w ? w.value : goal.current; }
  if (goal.auto === 'financeUsd') {
    const month = goal.month || (goal.deadline || '').slice(0, 7);
    const { sum, any } = sumPnlUsd(data, model, month);
    return any ? sum : 0;
  }
  return goal.current;
}
export function goalProgress(goal, current) {
  if (goal.target == null || current == null) return 0;
  const start = goal.start ?? 0;
  const span = goal.target - start;
  if (!span) return 100;
  return Math.max(0, Math.min(100, ((current - start) / span) * 100));
}
export function latestWeight(data, model) {
  for (let i = model.allDates.length - 1; i >= 0; i--) {
    const d = model.allDates[i];
    if (d <= model.today && data.days[d].weight != null) return { date: d, value: data.days[d].weight };
  }
  return null;
}

// Неделя арки (1..), с понедельника старта: блоки по 7 дней от startDate
export const arcWeek = (data, date) => Math.floor(diffDays(data.meta.startDate, date) / 7) + 1;

// Цель по весу: старт → цель (targets.startWeight / goalWeight / goalWeightDate). null, если цель не задана.
export function weightGoal(data, model) {
  const { startWeight, goalWeight, goalWeightDate, goalLabel } = data.targets || {};
  if (goalWeight == null || startWeight == null) return null;
  const w = latestWeight(data, model);
  const current = w ? w.value : startWeight;
  const span = startWeight - goalWeight;
  const done = startWeight - current; // сколько уже сброшено (для цели на набор — отрицательный span, формула та же)
  const progress = span ? Math.max(0, Math.min(100, (done / span) * 100)) : 100;
  const daysLeft = goalWeightDate ? Math.max(0, diffDays(model.today, goalWeightDate)) : null;
  const left = current - goalWeight;
  const perWeek = daysLeft ? (left / daysLeft) * 7 : null;
  return { label: goalLabel || null, start: startWeight, goal: goalWeight, current, done, left, progress, date: goalWeightDate, daysLeft, perWeek };
}


export const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const name = MONTHS_NOM[m - 1] || ym;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
};
export function monthDates(ym) {
  const [y, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out = [];
  for (let d = 1; d <= n; d++) out.push(iso(new Date(Date.UTC(y, m - 1, d))));
  return out;
}
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  return iso(new Date(Date.UTC(y, m - 1 + delta, 1))).slice(0, 7);
}

export function fmtUsd(n, digits = 2) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const sign = v < 0 ? '−' : '';
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
export function fmtUsdCell(n) {
  if (n == null || Number.isNaN(Number(n))) return '';
  const v = Number(n);
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  const abs = Math.abs(v);
  const body = abs >= 1000
    ? `${(abs / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`
    : abs >= 100
      ? abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : abs.toLocaleString('en-US', { maximumFractionDigits: abs < 10 ? 2 : 0 });
  return `${sign}$${body}`;
}

export const financeFx = (data) => data.finance?.fx || null;

// Временный показ сайта другим людям: meta.hideFinance === true прячет всё про деньги (только UI, данные не трогаются).
export const isFinanceHidden = (data) => data?.meta?.hideFinance === true;
const MONEY_UNITS = ['$', '₸', 'usd', 'kzt', 'тг', 'тенге', 'доллар', 'доллары'];
export function isMoneyGoal(g) {
  if (!g) return false;
  if (g.auto === 'financeUsd') return true;
  if (String(g.category || '').trim() === 'Финансы') return true;
  return MONEY_UNITS.includes(String(g.unit || '').trim().toLowerCase());
}
export function kztToUsd(kzt, rate) {
  if (kzt == null || rate == null || !Number(rate)) return null;
  return Number(kzt) / Number(rate);
}
export function goalTarget(goal) {
  if (goal?.auto === 'financeUsd') return goal.target ?? goal.targetUsd ?? null;
  return goal?.target;
}

// Тон дня по привычкам: good — все, mid — частично, bad — день записан, но мимо, empty — записи нет
export function habitDayCell(day, habits, date, today) {
  if (date > today) return { tone: 'future' };
  if (!habits?.length || !day?.habits) return { tone: 'empty' };
  const total = habits.length;
  const done = habits.filter((h) => habitDone(h, day.habits[h.id])).length;
  const frac = habits.reduce((s, h) => s + habitFrac(h, day.habits[h.id]), 0);
  let tone = 'bad';
  if (done >= total) tone = 'good';
  else if (done > 0 || frac > 0) tone = 'mid';
  return { tone, label: `${done}/${total}`, title: `${done} из ${total} привычек` };
}
export function perfectDaysStreak(data, model) {
  const habits = data.habits || [];
  const toneOf = (d) => habitDayCell(model.get(d), habits, d, model.today).tone;
  let d = model.today;
  if (toneOf(d) !== 'good') d = addDays(d, -1);
  let n = 0;
  while (d >= data.meta.startDate && toneOf(d) === 'good') { n++; d = addDays(d, -1); }
  return n;
}

// Сумма дневных результатов за месяц в долларах. pnlUsd — плюс прибыль, минус убыток.
export function sumPnlUsd(data, model, month) {
  let sum = 0; let any = false; let profit = 0; let loss = 0;
  for (const date of Object.keys(data.days || {}).sort()) {
    if (month && !date.startsWith(month)) continue;
    if (model && date > model.today) continue;
    const day = data.days[date] || {};
    const v = day.pnlUsd ?? day.pnlKzt;
    if (v == null || v === '') continue;
    const n = Number(v);
    if (Number.isNaN(n)) continue;
    any = true;
    sum += n;
    if (n > 0) profit++;
    else if (n < 0) loss++;
  }
  return { sum, any, profit, loss };
}

const HABIT_TAPS_KEY = 'winter-arc-habit-taps';

export function readHabitTaps() {
  try {
    const raw = localStorage.getItem(HABIT_TAPS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// Отмеченные сегодня на телефоне перекрывают data.json только по тем ключам, которые нажали.
export function applyHabitTaps(data, taps) {
  if (!data) return data;
  const today = data.meta?.asOf || almatyToday();
  const dayTaps = taps?.[today];
  if (!dayTaps || typeof dayTaps !== 'object') return data;
  const prev = data.days?.[today] || {};
  return {
    ...data,
    days: {
      ...(data.days || {}),
      [today]: { ...prev, habits: { ...(prev.habits || {}), ...dayTaps } },
    },
  };
}

export function nextHabitValue(habit, current) {
  if (habit?.target) {
    const cap = Number(habit.target) || 0;
    const n = Math.max(0, Math.min(cap, Number(current) || 0));
    return (n + 1) % (cap + 1);
  }
  return !habitDone(habit, current);
}

export function writeHabitTap(today, habitId, value) {
  const all = readHabitTaps();
  all[today] = { ...(all[today] || {}), [habitId]: value };
  try { localStorage.setItem(HABIT_TAPS_KEY, JSON.stringify(all)); } catch { /* приватный режим */ }
  return all;
}


const MY_TASKS_KEY = 'winter-arc-my-tasks';

export function readMyTasks() {
  try {
    const raw = localStorage.getItem(MY_TASKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && row.id != null && row.date && String(row.title || '').trim())
      .map((row) => ({
        id: String(row.id),
        date: String(row.date),
        title: String(row.title).trim(),
        done: !!row.done,
      }));
  } catch {
    return [];
  }
}

export function writeMyTasks(rows) {
  const clean = (rows || []).map(({ id, date, title, done }) => ({
    id: String(id),
    date: String(date),
    title: String(title || '').trim(),
    done: !!done,
  })).filter((row) => row.id && row.date && row.title);
  try { localStorage.setItem(MY_TASKS_KEY, JSON.stringify(clean)); } catch { /* приватный режим */ }
  return clean;
}



// Текущий USD-баланс: зафиксированная сумма на balanceAsOf + P/L дней строго после этой даты (до today).
export function currentBalanceUsd(data, model) {
  const finance = data?.finance || {};
  const base = Number(finance.balanceUsd);
  if (!Number.isFinite(base)) return null;
  const asOf = finance.balanceAsOf;
  if (!asOf) return base;
  const today = model?.today;
  let sum = 0;
  for (const date of Object.keys(data.days || {}).sort()) {
    if (date <= asOf) continue;
    if (today && date > today) continue;
    const day = data.days[date] || {};
    const v = day.pnlUsd ?? day.pnlKzt;
    if (v == null || v === '') continue;
    const n = Number(v);
    if (Number.isNaN(n)) continue;
    sum += n;
  }
  return base + sum;
}

export const sumPnlKzt = sumPnlUsd;

const EXPENSES_KEY = 'winter-arc-expenses';

// Категории трат. Депозит — отложенные деньги, не расход.
export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Еда', color: '#fb923c', keys: ['food', 'cafe', 'кафе', 'grocery', 'еда', 'обед', 'кофе', 'продукты'] },
  { id: 'transport', label: 'Транспорт', color: '#38bdf8', keys: ['такси', 'бензин', 'метро', 'автобус'] },
  { id: 'home', label: 'Жильё', color: '#a78bfa', keys: ['аренда', 'квартира', 'коммуналка', 'свет', 'интернет'] },
  { id: 'clothes', label: 'Одежда', color: '#f472b6', keys: ['одежда', 'одежд', 'обув', 'кроссов', 'футболк', 'куртк', 'джинс'] },
  { id: 'health', label: 'Здоровье', color: '#34d399', keys: ['аптека', 'врач', 'стоматолог', 'чекап'] },
  { id: 'fun', label: 'Развлечения', color: '#facc15', keys: ['развлечения', 'развлеч', 'кино', 'концерт'] },
  { id: 'work', label: 'Работа', color: '#22d3ee', keys: ['работа', 'офис', 'сервер'] },
  { id: 'deposit', label: 'Депозит', color: '#818cf8', keys: ['savings', 'депозит', 'отложил', 'накопил'] },
  { id: 'subs', label: 'Подписки', color: '#c084fc', keys: ['подписка', 'подписки', 'netflix', 'spotify', 'youtube', 'apple', 'vpn', 'chatgpt', 'subscription'] },
  { id: 'other', label: 'Другое', color: '#94a3b8', keys: [] },
];

const normNote = (s) => String(s || '').toLowerCase().replaceAll('ё', 'е');

export function canonicalCategory(raw) {
  if (raw == null || String(raw).trim() === '') return 'Другое';
  const s = String(raw).trim();
  const found = EXPENSE_CATEGORIES.find((c) => c.id === s || c.label.toLowerCase() === s.toLowerCase());
  return found ? found.label : s;
}

export const categoryColor = (label) => EXPENSE_CATEGORIES.find((c) => c.label === canonicalCategory(label))?.color || '#94a3b8';

export const isDepositCategory = (category) => {
  const c = canonicalCategory(category);
  return c === 'Депозит';
};

// Самое длинное совпадение побеждает, чтобы «подписка» не проигрывала короткому слову.
export function guessExpenseCategory(note) {
  const s = normNote(note);
  if (!s.trim()) return 'Другое';
  let best = null;
  for (const cat of EXPENSE_CATEGORIES) {
    for (const key of cat.keys) {
      const k = normNote(key);
      if (!k || !s.includes(k)) continue;
      if (!best || k.length > best.len) best = { label: cat.label, len: k.length };
    }
  }
  return best ? best.label : 'Другое';
}

// Неделя понедельник–воскресенье, в которой лежит дата.
export function isoWeekRange(date) {
  const wd = parse(date).getUTCDay();
  const start = addDays(date, wd === 0 ? -6 : 1 - wd);
  return { start, end: addDays(start, 6) };
}

export function fmtKzt(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  const sign = v < 0 ? '−' : '';
  const body = Math.abs(v).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  return `${sign}${body.replace(/[\u00A0\u202F]/g, ' ')} ₸`;
}

// Способ оплаты: 'cash' — наличные, всё остальное (и отсутствие поля) — карта / основные.
export const PAYMENT_METHODS = [
  { id: 'card', label: 'Карта' },
  { id: 'cash', label: 'Наличные' },
];
export function normPayment(raw) {
  const s = normNote(raw).trim();
  return s === 'cash' || s === 'наличные' || s === 'нал' || s === 'наличка' ? 'cash' : 'card';
}

// Все траты в тенге (amountKzt). Записи с currency 'USD' могли остаться на телефоне от прошлой версии:
// они сохраняются в памяти как есть (не удаляются), но в итогах и кошельке не считаются.
export function normCurrency(raw) {
  const s = normNote(raw).trim();
  return s === 'usd' || s === '$' || s === 'доллар' || s === 'доллары' ? 'USD' : 'KZT';
}
export const isUsdExpense = (row) => normCurrency(row?.currency) === 'USD';

// Приводит запись к одному виду. KZT: amountKzt, невалидная сумма → null. USD (старые строки) сохраняются как есть.
function normExpenseRow(row, fallbackDate, id, local) {
  const currency = normCurrency(row.currency);
  const base = {
    id,
    date: typeof row.date === 'string' && row.date ? row.date : fallbackDate,
    note: row.note ? String(row.note) : '',
    category: canonicalCategory(row.category),
    payment: normPayment(row.payment),
  };
  if (currency === 'USD') {
    // Не отбрасываем, чтобы перезапись памяти не удалила строку; в расчётах USD всё равно пропускается.
    const amount = Number(row.amountUsd);
    return { ...base, currency: 'USD', amountUsd: row.amountUsd != null && Number.isFinite(amount) ? amount : row.amountUsd ?? null, ...(local == null ? {} : { local }) };
  }
  const amount = Number(row.amountKzt);
  if (!Number.isFinite(amount)) return null;
  return { ...base, amountKzt: amount, ...(local == null ? {} : { local }) };
}

export function readExpenses() {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && row.id != null && row.date)
      .map((row) => normExpenseRow(row, String(row.date), String(row.id)))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function writeExpenses(rows) {
  const clean = (rows || [])
    .filter((row) => row && row.id != null && row.date)
    .map((row) => normExpenseRow(row, String(row.date), String(row.id)))
    .filter(Boolean);
  try { localStorage.setItem(EXPENSES_KEY, JSON.stringify(clean)); } catch { /* приватный режим */ }
  return clean;
}

// Записи из days[date].expenses плюс телефон. Один и тот же id — побеждает телефон.
export function mergeExpenses(data, localRows) {
  const map = new Map();
  const days = data?.days || {};
  for (const date of Object.keys(days).sort()) {
    const list = days[date]?.expenses;
    if (!Array.isArray(list)) continue;
    list.forEach((row, i) => {
      if (!row || typeof row !== 'object') return;
      const id = row.id != null && String(row.id) !== '' ? String(row.id) : `file:${date}:${i}`;
      const clean = normExpenseRow(row, date, id, false);
      if (clean) map.set(id, clean);
    });
  }
  for (const row of localRows || []) {
    if (!row || row.id == null || !row.date) continue;
    const id = String(row.id);
    const clean = normExpenseRow(row, String(row.date), id, true);
    if (clean) map.set(id, clean);
  }
  return [...map.values()];
}

// ---- Кошелёк ₸ (блок «Расходы»), отдельно от основного баланса finance.balanceUsd ----
const WALLET_TOPUPS_KEY = 'winter-arc-wallet-topups';

function normTopup(row, id, local) {
  if (!row || typeof row !== 'object' || !row.date) return null;
  const amount = Number(row.amount);
  if (!Number.isFinite(amount)) return null;
  return {
    id,
    date: String(row.date),
    currency: normCurrency(row.currency),
    amount,
    note: row.note ? String(row.note) : '',
    ...(local == null ? {} : { local }),
  };
}

export function readWalletTopups() {
  try {
    const raw = localStorage.getItem(WALLET_TOPUPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && row.id != null).map((row) => normTopup(row, String(row.id))).filter(Boolean);
  } catch {
    return [];
  }
}

export function writeWalletTopups(rows) {
  const clean = (rows || []).filter((row) => row && row.id != null).map((row) => normTopup(row, String(row.id))).filter(Boolean);
  try { localStorage.setItem(WALLET_TOPUPS_KEY, JSON.stringify(clean)); } catch { /* приватный режим */ }
  return clean;
}

// finance.wallets.topups плюс телефон. Один и тот же id — побеждает телефон.
export function mergeWalletTopups(data, localRows) {
  const map = new Map();
  const list = data?.finance?.wallets?.topups;
  if (Array.isArray(list)) {
    list.forEach((row, i) => {
      const id = row?.id != null && String(row.id) !== '' ? String(row.id) : `file:topup:${i}`;
      const clean = normTopup(row, id, false);
      if (clean) map.set(id, clean);
    });
  }
  for (const row of localRows || []) {
    if (!row || row.id == null) continue;
    const id = String(row.id);
    const clean = normTopup(row, id, true);
    if (clean) map.set(id, clean);
  }
  return [...map.values()];
}

// Баланс ₸ = стартовая сумма kzt на asOf + KZT-пополнения (date ≥ asOf) − траты в тенге (date ≥ asOf).
// Депозит тоже вычитается: деньги уходят из кошелька. Записи раньше asOf не учитываются.
// Записи и пополнения с currency 'USD' (остатки старой версии) игнорируются.
export function walletBalances(data, expenses, topups) {
  const w = data?.finance?.wallets;
  if (!w || typeof w !== 'object') return null;
  const asOf = typeof w.asOf === 'string' ? w.asOf : '';
  const startKzt = Number.isFinite(Number(w.kzt)) ? Number(w.kzt) : 0;
  const inRange = (d) => !!d && (!asOf || d >= asOf);
  let topKzt = 0; let spentKzt = 0;
  for (const t of topups || []) {
    if (!t || t.currency === 'USD' || !inRange(t.date)) continue;
    const n = Number(t.amount);
    if (Number.isFinite(n)) topKzt += n;
  }
  for (const row of expenses || []) {
    if (!row || isUsdExpense(row) || !inRange(row.date)) continue;
    const n = Number(row.amountKzt);
    if (Number.isFinite(n)) spentKzt += n;
  }
  return { asOf, startKzt, topKzt, spentKzt, kzt: startKzt + topKzt - spentKzt };
}

export function expenseSnapshot(rows, today) {
  const week = isoWeekRange(today);
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const sum = (pred, deposit) => (rows || []).reduce((s, row) => {
    if (isUsdExpense(row)) return s;
    const dep = isDepositCategory(row.category);
    if (deposit ? !dep : dep) return s;
    if (!row.date || !pred(row.date)) return s;
    const n = Number(row.amountKzt);
    if (!Number.isFinite(n)) return s;
    return s + n;
  }, 0);
  return {
    week: sum((d) => d >= week.start && d <= week.end, false),
    month: sum((d) => d.startsWith(month), false),
    year: sum((d) => d.startsWith(year), false),
    depositMonth: sum((d) => d.startsWith(month), true),
    depositAll: sum(() => true, true),
    weekRange: week,
  };
}

export function monthSpendSlices(rows, today) {
  const month = today.slice(0, 7);
  const totals = new Map();
  for (const row of rows || []) {
    if (isUsdExpense(row) || !row.date || !row.date.startsWith(month) || isDepositCategory(row.category)) continue;
    const n = Number(row.amountKzt);
    if (!Number.isFinite(n) || n === 0) continue;
    const name = canonicalCategory(row.category);
    totals.set(name, (totals.get(name) || 0) + n);
  }
  return [...totals.entries()]
    .filter(([, value]) => value !== 0)
    .map(([name, value]) => ({ name, value, fill: categoryColor(name) }))
    .sort((a, b) => b.value - a.value);
}

// Итоги месяца по способу оплаты (без депозита) и средние.
// Дни: для текущего месяца — с 1-го по today включительно, для прошлых — весь месяц, для будущих — 0.
export function monthPaymentStats(rows, month, today) {
  let total = 0; let cash = 0;
  for (const row of rows || []) {
    if (isUsdExpense(row) || !row.date || !row.date.startsWith(month) || isDepositCategory(row.category)) continue;
    const n = Number(row.amountKzt);
    if (!Number.isFinite(n)) continue;
    total += n;
    if (normPayment(row.payment) === 'cash') cash += n;
  }
  const all = monthDates(month).length;
  const curMonth = today.slice(0, 7);
  const days = month < curMonth ? all : month > curMonth ? 0 : Math.min(all, Number(today.slice(8, 10)));
  const perDay = days ? total / days : 0;
  return { total, cash, card: total - cash, days, perDay, perWeek: perDay * 7 };
}
