import React, { useEffect, useRef, useState } from 'react';
import { Delete } from 'lucide-react';

const PIN = '999';
const STORAGE_KEY = 'winter-arc-lock';

const readUnlocked = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const markUnlocked = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch { /* приватный режим — только до перезагрузки */ }
};

function LockScreen({ onUnlock }) {
  const [digits, setDigits] = useState('');
  const [shake, setShake] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (digits.length !== 3) return undefined;
    if (digits === PIN) {
      busy.current = true;
      onUnlock();
      return undefined;
    }
    busy.current = true;
    setShake(true);
    const t = setTimeout(() => {
      setDigits('');
      setShake(false);
      busy.current = false;
    }, 420);
    return () => clearTimeout(t);
  }, [digits, onUnlock]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        push(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const push = (d) => {
    if (busy.current) return;
    setDigits((prev) => (prev.length >= 3 ? prev : prev + d));
  };

  const back = () => {
    if (busy.current) return;
    setDigits((prev) => prev.slice(0, -1));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="lock-screen" role="dialog" aria-label="Экран блокировки">
      <div className="lock-head">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          width={56}
          height={56}
          className="lock-logo"
          draggable={false}
        />
        <div className="lock-title">Winter Arc</div>
        <div className="lock-hint">Введите код</div>
        <div className={`lock-dots${shake ? ' lock-dots--shake' : ''}`} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`lock-dot${i < digits.length ? ' lock-dot--on' : ''}`} />
          ))}
        </div>
      </div>

      <div className="lock-pad">
        {keys.map((k, i) => {
          if (k === '') return <span key={i} />;
          if (k === 'del') {
            return (
              <button key={k} type="button" className="lock-key lock-key--ghost" aria-label="Удалить" onClick={back}>
                <Delete size={26} strokeWidth={1.75} />
              </button>
            );
          }
          return (
            <button key={k} type="button" className="lock-key" onClick={() => push(k)}>
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LockGate({ children }) {
  const [open, setOpen] = useState(readUnlocked);
  const unlock = () => {
    markUnlocked();
    setOpen(true);
  };
  if (!open) return <LockScreen onUnlock={unlock} />;
  return children;
}
