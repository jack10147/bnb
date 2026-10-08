// Генерирует ПРИМЕРНЫЕ данные в scripts/sample/sample-data.json (детерминированно). Реальные данные — public/data/data.json, этот скрипт их не трогает.
import fs from 'node:fs';
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const r1 = (x) => Math.round(x * 10) / 10;

const start = new Date(Date.UTC(2026, 8, 28));
const N = 14;
const iso = (d) => d.toISOString().slice(0, 10);

const habits = [
  { id: 'wake', name: 'Подъём в 6:00', emoji: '🌅' },
  { id: 'water', name: '2.5 л воды', emoji: '💧' },
  { id: 'read', name: 'Чтение 30 мин', emoji: '📚' },
  { id: 'nosugar', name: 'Без сахара', emoji: '🚫' },
  { id: 'steps', name: '10 000 шагов', emoji: '👟' },
  { id: 'cold', name: 'Холодный душ', emoji: '🧊' },
];
const taskPool = ['Разобрать почту', 'Созвон с командой', 'Написать отчёт', 'Прочитать главу книги', 'Уборка 15 мин', 'Спланировать завтра', 'Практика английского 20 мин', 'Код-ревью', 'Медитация 10 мин', 'Купить продукты', 'Растяжка', 'Позвонить родителям'];
const workNotes = ['Закрыл 3 задачи по проекту', 'Спроектировал новую фичу', 'Много созвонов, мало фокуса', 'Глубокая работа без отвлечений', 'Исправил баги в релизе', 'Подготовил презентацию', 'Изучал новую библиотеку'];
const meals = {
  'Завтрак': [['Овсянка с бананом и орехами', 520, 18, 16, 78], ['Омлет из 3 яиц, тост', 480, 30, 28, 25], ['Сырники со сметаной', 550, 32, 20, 55]],
  'Обед': [['Плов, салат', 780, 32, 30, 90], ['Гречка с курицей', 650, 50, 15, 70], ['Лагман', 720, 35, 25, 85], ['Рис с говядиной и овощами', 700, 45, 22, 75]],
  'Ужин': [['Лосось и овощи', 560, 42, 30, 20], ['Куриная грудка, картофель', 600, 50, 14, 60], ['Творог, салат', 420, 40, 12, 25]],
  'Перекус': [['Протеиновый коктейль', 220, 30, 4, 12], ['Яблоко и миндаль', 250, 6, 14, 22], ['Греческий йогурт', 180, 18, 5, 12]],
};
const days = {};
let weight = 82.4, bench = 70, pull = 8, squat = 90;
for (let i = 0; i < N; i++) {
  const d = new Date(start); d.setUTCDate(d.getUTCDate() + i);
  const date = iso(d);
  weight = r1(weight - 0.12 + (rnd() - 0.5) * 0.5);
  const tasks = [];
  const pool = [...taskPool].sort(() => rnd() - 0.5).slice(0, 4 + Math.floor(rnd() * 3));
  for (const t of pool) tasks.push({ title: t, done: rnd() < 0.6 + i * 0.02 });
  const h = {};
  for (const hb of habits) h[hb.id] = rnd() < (hb.id === 'cold' ? 0.5 : 0.72 + i * 0.015);
  const dow = d.getUTCDay();
  const weekend = dow === 0 || dow === 6;
  const hours = weekend ? r1(rnd() * 3) : r1(4.5 + rnd() * 4);
  const day = {
    weight,
    tasks,
    habits: h,
    work: { hours, notes: hours ? pick(workNotes) : 'Выходной', results: hours > 5 ? ['Задача #' + (100 + i), 'Ревью PR'] : [] },
    nutrition: { meals: [] },
    workout: null,
    note: '',
  };
  for (const m of ['Завтрак', 'Обед', 'Ужин', 'Перекус']) {
    if (m === 'Перекус' && rnd() < 0.3) continue;
    const [name, kcal, p, f, c] = pick(meals[m]);
    day.nutrition.meals.push({ type: m, name, kcal, protein: p, fat: f, carbs: c });
  }
  if ([1, 3, 5].includes(dow) || (dow === 6 && rnd() < 0.5)) {
    if (rnd() < 0.7) bench += 2.5; if (rnd() < 0.6) pull += 1; if (rnd() < 0.7) squat += 5;
    const upper = dow !== 3;
    day.workout = upper ? {
      type: 'Силовая — верх', durationMin: 60 + Math.floor(rnd() * 20), notes: 'Хорошее самочувствие',
      exercises: [
        { id: 'bench', sets: [{ weight: bench, reps: 5 }, { weight: bench, reps: 5 }, { weight: bench - 5, reps: 8 }] },
        { id: 'pullups', sets: [{ weight: 0, reps: pull }, { weight: 0, reps: pull - 1 }, { weight: 0, reps: pull - 2 }] },
      ],
    } : {
      type: 'Силовая — низ', durationMin: 55 + Math.floor(rnd() * 20), notes: 'Ноги горят',
      exercises: [
        { id: 'squat', sets: [{ weight: squat, reps: 5 }, { weight: squat, reps: 5 }, { weight: squat, reps: 5 }] },
        { id: 'run', sets: [{ distanceKm: r1(3 + rnd() * 2), timeMin: 25 + Math.floor(rnd() * 5) }] },
      ],
    };
  }
  days[date] = day;
}
const data = {
  meta: {
    title: 'Winter Arc',
    owner: 'Пример',
    sample: true,
    startDate: '2026-09-28',
    durationDays: 30,
    longTermEndDate: '2027-03-28',
    timezone: 'Asia/Almaty',
    asOf: iso(new Date(start.getTime() + (N - 1) * 864e5)),
    lastUpdated: '2026-10-11T22:00:00+05:00',
  },
  targets: { calories: 2300, protein: 160, fat: 75, carbs: 230, workHoursPerDay: 6, workHoursPerWeek: 35, startWeight: 82.5, goalWeight: 78 },
  habits,
  exercises: [
    { id: 'bench', name: 'Жим лёжа', metric: 'weight', unit: 'кг' },
    { id: 'pullups', name: 'Подтягивания', metric: 'reps', unit: 'повт.' },
    { id: 'squat', name: 'Присед', metric: 'weight', unit: 'кг' },
    { id: 'run', name: 'Бег', metric: 'distance', unit: 'км' },
  ],
  goals: {
    month: [
      { id: 'm-weight', title: 'Сбросить 2 кг', category: 'Спорт', start: 82.5, current: weight, target: 80.5, unit: 'кг' },
      { id: 'm-books', title: 'Прочитать 2 книги', category: 'Развитие', start: 0, current: 1, target: 2, unit: 'кн.' },
      { id: 'm-work', title: '140 часов глубокой работы', category: 'Работа', start: 0, current: 0, target: 140, unit: 'ч', auto: 'workHours' },
      { id: 'm-bench', title: 'Жим 80 кг на 5', category: 'Спорт', start: 70, current: bench, target: 80, unit: 'кг' },
      { id: 'm-workouts', title: '12 тренировок', category: 'Спорт', start: 0, current: 0, target: 12, unit: 'шт', auto: 'workouts' },
    ],
    sixMonth: [
      { id: 's-weight', title: 'Вес 75 кг', category: 'Спорт', start: 82.5, current: weight, target: 75, unit: 'кг' },
      { id: 's-pull', title: '20 подтягиваний', category: 'Спорт', start: 8, current: pull, target: 20, unit: 'повт.' },
      { id: 's-eng', title: 'Английский B2', category: 'Развитие', start: 0, current: 15, target: 100, unit: '%' },
      { id: 's-save', title: 'Накопить 1 000 000 ₸', category: 'Финансы', start: 0, current: 120000, target: 1000000, unit: '₸' },
      { id: 's-books', title: '12 книг', category: 'Развитие', start: 0, current: 1, target: 12, unit: 'кн.' },
    ],
  },
  days,
};
fs.writeFileSync(new URL('./sample/sample-data.json', import.meta.url), JSON.stringify(data, null, 2));
console.log('ok', Object.keys(days).length, 'days');
