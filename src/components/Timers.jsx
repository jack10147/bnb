import React, { useEffect, useRef, useState } from 'react';
import { Timer as TimerIcon, Watch, Play, Pause, RotateCcw, Flag, Plus, Minus, BellRing } from 'lucide-react';
import { Card, CardTitle } from './ui.jsx';

const SW_KEY = 'bnb-stopwatch';
const TM_KEY = 'bnb-timer';
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? { ...d, ...v } : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const pad = (n) => String(n).padStart(2, '0');
export function fmtSw(ms) {
  ms = Math.max(0, ms);
  const t = Math.floor(ms / 100);
  const d = t % 10, s = Math.floor(t / 10) % 60, m = Math.floor(t / 600) % 60, h = Math.floor(t / 36000);
  return `${h ? h + ':' : ''}${pad(m)}:${pad(s)}.${d}`;
}
export function fmtTm(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const s = total % 60, m = Math.floor(total / 60) % 60, h = Math.floor(total / 3600);
  return `${h ? h + ':' + pad(m) : m}:${pad(s)}`;
}

function useTick(active, ms = 100) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => set((x) => x + 1), ms);
    const vis = () => set((x) => x + 1);
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [active, ms]);
}

// ---- audio ----
let actx = null;
function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!actx) actx = new AC();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    g.gain.value = 0.0001; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.02);
  } catch {}
}
function beep(times = 3) {
  try {
    if (!actx) unlockAudio();
    if (!actx) return;
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime + 0.05;
    for (let i = 0; i < times; i++) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = 880;
      const t = t0 + i * 0.35;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.25);
    }
  } catch {}
}

const btn = 'flex-1 min-h-[52px] rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition active:scale-[.97] select-none';
const primary = (on) => `${btn} ${on ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40' : 'bg-sky-500 text-white hover:bg-sky-400'}`;
const ghost = `${btn} bg-white/[.06] text-slate-200 hover:bg-white/[.1] disabled:opacity-40`;

// ---- Stopwatch ----
const SW0 = { running: false, startAt: 0, acc: 0, laps: [] };
function Stopwatch() {
  const [st, setSt] = useState(() => load(SW_KEY, SW0));
  useEffect(() => save(SW_KEY, st), [st]);
  useTick(st.running, 50);
  const elapsed = st.acc + (st.running ? Date.now() - st.startAt : 0);
  const toggle = () => setSt((s) => s.running
    ? { ...s, running: false, acc: s.acc + Date.now() - s.startAt }
    : { ...s, running: true, startAt: Date.now() });
  const reset = () => setSt(SW0);
  const lap = () => setSt((s) => ({ ...s, laps: [s.acc + (s.running ? Date.now() - s.startAt : 0), ...s.laps].slice(0, 50) }));
  const laps = st.laps;
  return (
    <Card className="flex flex-col">
      <CardTitle icon={Watch}>Секундомер</CardTitle>
      <div className="text-center py-3 sm:py-5">
        <div className="text-5xl sm:text-6xl font-semibold text-white tabular-nums tracking-tight">{fmtSw(elapsed)}</div>
        <div className="text-xs text-slate-500 mt-1">{st.running ? 'идёт' : elapsed ? 'пауза' : 'готов'}</div>
      </div>
      <div className="flex gap-2">
        <button className={primary(st.running)} onClick={toggle}>{st.running ? <><Pause size={18} />Пауза</> : <><Play size={18} />Старт</>}</button>
        <button className={ghost} onClick={lap} disabled={!st.running}><Flag size={18} />Круг</button>
        <button className={ghost} onClick={reset} disabled={!elapsed && !laps.length}><RotateCcw size={18} />Сброс</button>
      </div>
      {laps.length > 0 && (
        <div className="mt-3 max-h-36 overflow-y-auto rounded-xl bg-white/[.03] border border-white/[.05] divide-y divide-white/[.05]">
          {laps.map((t, i) => {
            const n = laps.length - i, prev = laps[i + 1] || 0;
            return (
              <div key={n} className="flex justify-between px-3 py-1.5 text-sm tabular-nums">
                <span className="text-slate-400">Круг {n}</span>
                <span className="text-slate-500">+{fmtSw(t - prev)}</span>
                <span className="text-slate-200">{fmtSw(t)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ---- Countdown timer ----
const PRESETS = [30, 60, 90, 120, 180, 300];
const TM0 = { duration: 60000, running: false, endAt: 0, left: 60000, done: false };
function CountdownTimer() {
  const [st, setSt] = useState(() => load(TM_KEY, TM0));
  useEffect(() => save(TM_KEY, st), [st]);
  useTick(st.running || st.done, 100);
  const left = st.running ? Math.max(0, st.endAt - Date.now()) : st.left;
  const fired = useRef(false);

  useEffect(() => {
    if (st.running && left <= 0) {
      setSt((s) => ({ ...s, running: false, left: 0, done: true }));
      if (!fired.current) {
        fired.current = true;
        beep(4);
        try { navigator.vibrate && navigator.vibrate([300, 150, 300, 150, 300]); } catch {}
      }
    }
  });
  // repeat beeps while alarm is shown (max ~30s)
  useEffect(() => {
    if (!st.done) return;
    let n = 0;
    const id = setInterval(() => { if (++n > 10) return clearInterval(id); beep(2); }, 3000);
    return () => clearInterval(id);
  }, [st.done]);

  const setDur = (ms) => { ms = Math.max(5000, Math.min(99 * 60000 + 59000, ms)); fired.current = false; setSt({ ...TM0, duration: ms, left: ms }); };
  const toggle = () => {
    unlockAudio();
    fired.current = false;
    setSt((s) => {
      if (s.running) return { ...s, running: false, left: Math.max(0, s.endAt - Date.now()) };
      const l = s.left > 0 && !s.done ? s.left : s.duration;
      return { ...s, running: true, done: false, endAt: Date.now() + l, left: l };
    });
  };
  const reset = () => { fired.current = false; setSt((s) => ({ ...s, running: false, done: false, left: s.duration })); };
  const dismiss = () => { try { navigator.vibrate && navigator.vibrate(0); } catch {} reset(); };
  const idle = !st.running && left === st.duration && !st.done;
  const mm = Math.floor(st.duration / 60000), ss = Math.round((st.duration % 60000) / 1000);
  const pct = st.duration ? (left / st.duration) * 100 : 0;
  const size = 168, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r;

  return (
    <Card className={`flex flex-col relative overflow-hidden ${st.done ? 'ring-2 ring-rose-500 animate-pulse bg-rose-500/10' : ''}`}>
      <CardTitle icon={TimerIcon} color="text-amber-400">Таймер</CardTitle>
      {st.done ? (
        <button onClick={dismiss} className="flex-1 flex flex-col items-center justify-center py-6 rounded-2xl bg-rose-500/20 text-rose-100 min-h-[220px]">
          <BellRing size={40} className="mb-2" />
          <div className="text-5xl font-bold">Время!</div>
          <div className="text-sm text-rose-200/80 mt-2">Нажми, чтобы выключить</div>
        </button>
      ) : <>
        <div className="flex justify-center py-2">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.07)" strokeWidth={stroke} fill="none" />
              <circle cx={size / 2} cy={size / 2} r={r} stroke="#fbbf24" strokeWidth={stroke} fill="none" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset .15s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl sm:text-5xl font-semibold text-white tabular-nums">{fmtTm(left)}</div>
              <div className="text-xs text-slate-500">{st.running ? 'идёт' : idle ? `из ${fmtTm(st.duration)}` : 'пауза'}</div>
            </div>
          </div>
        </div>
        <div className={`flex flex-wrap gap-1.5 justify-center mb-2 ${st.running ? 'opacity-40 pointer-events-none' : ''}`}>
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setDur(p * 1000)}
              className={`min-h-[38px] px-3 rounded-xl text-sm tabular-nums ${st.duration === p * 1000 ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40' : 'bg-white/[.06] text-slate-300 hover:bg-white/[.1]'}`}>{fmtTm(p * 1000)}</button>
          ))}
        </div>
        <div className={`flex items-center justify-center gap-2 mb-3 ${st.running ? 'opacity-40 pointer-events-none' : ''}`}>
          <button aria-label="−15 сек" onClick={() => setDur(st.duration - 15000)} className="h-11 w-11 rounded-xl bg-white/[.06] text-slate-200 flex items-center justify-center"><Minus size={18} /></button>
          <input aria-label="Минуты" type="number" inputMode="numeric" min="0" max="99" value={mm}
            onChange={(e) => setDur((Math.max(0, +e.target.value || 0)) * 60000 + ss * 1000)}
            className="w-14 h-11 rounded-xl bg-white/[.06] text-center text-white text-lg tabular-nums outline-none focus:ring-1 focus:ring-amber-400/50" />
          <span className="text-slate-400">:</span>
          <input aria-label="Секунды" type="number" inputMode="numeric" min="0" max="59" value={pad(ss)}
            onChange={(e) => setDur(mm * 60000 + Math.min(59, Math.max(0, +e.target.value || 0)) * 1000)}
            className="w-14 h-11 rounded-xl bg-white/[.06] text-center text-white text-lg tabular-nums outline-none focus:ring-1 focus:ring-amber-400/50" />
          <button aria-label="+15 сек" onClick={() => setDur(st.duration + 15000)} className="h-11 w-11 rounded-xl bg-white/[.06] text-slate-200 flex items-center justify-center"><Plus size={18} /></button>
        </div>
        <div className="flex gap-2 mt-auto">
          <button className={primary(st.running)} onClick={toggle}>{st.running ? <><Pause size={18} />Пауза</> : <><Play size={18} />Старт</>}</button>
          <button className={ghost} onClick={reset} disabled={idle}><RotateCcw size={18} />Сброс</button>
        </div>
      </>}
    </Card>
  );
}

export default function Timers() {
  return (
    <div className="grid md:grid-cols-2 gap-3 md:gap-4 mb-4">
      <Stopwatch />
      <CountdownTimer />
    </div>
  );
}
