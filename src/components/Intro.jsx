import React, { useEffect, useRef, useState } from 'react';

// Короткое приветствие: один раз за сессию вкладки. Таймер и жест оба снимают оверлей.
const FLAKES = [
  { left: '6%', size: 2, delay: '0s', duration: '9s', opacity: 0.35 },
  { left: '18%', size: 3, delay: '1.2s', duration: '11s', opacity: 0.25 },
  { left: '31%', size: 2, delay: '0.4s', duration: '8.5s', opacity: 0.4 },
  { left: '47%', size: 2, delay: '2s', duration: '10s', opacity: 0.3 },
  { left: '63%', size: 3, delay: '0.8s', duration: '12s', opacity: 0.22 },
  { left: '74%', size: 2, delay: '1.6s', duration: '9.5s', opacity: 0.38 },
  { left: '86%', size: 2, delay: '0.2s', duration: '11.5s', opacity: 0.28 },
  { left: '93%', size: 3, delay: '2.4s', duration: '8s', opacity: 0.2 },
];

export default function Intro({ dayLabel, onClose }) {
  const [out, setOut] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      closeRef.current();
      return undefined;
    }
    const t = setTimeout(() => setOut(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!out) return undefined;
    const t = setTimeout(() => closeRef.current(), 450);
    return () => clearTimeout(t);
  }, [out]);

  const skip = (e) => {
    e.stopPropagation();
    setOut(true);
  };

  return (
    <div
      className={`intro-overlay${out ? ' intro-overlay--out' : ''}`}
      role="dialog"
      aria-label="Приветствие Winter Arc"
      onClick={skip}
    >
      <div className="intro-snow" aria-hidden="true">
        {FLAKES.map((f) => (
          <span
            key={f.left}
            className="intro-flake"
            style={{
              left: f.left,
              width: f.size,
              height: f.size,
              animationDelay: f.delay,
              animationDuration: f.duration,
              opacity: f.opacity,
            }}
          />
        ))}
      </div>

      <img
        src={`${import.meta.env.BASE_URL}intro.png`}
        alt=""
        className="intro-portrait"
        draggable={false}
      />

      <div className="intro-copy">
        <div className="font-semibold tracking-tight text-white text-[1.65rem] leading-none">WINTER ARC</div>
        <div className="mt-2 text-sm text-slate-400">{dayLabel}</div>
      </div>

      <button type="button" className="intro-skip" onClick={skip}>
        Пропустить
      </button>
    </div>
  );
}
