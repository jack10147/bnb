import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, X, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { Card, CardTitle, Empty } from './ui.jsx';

const imgSrc = (p) => (p ? `${import.meta.env.BASE_URL}${String(p).replace(/^\/+/, '')}` : null);

// Полноэкранный просмотр иллюстрации: тап по фону / Esc — закрыть, стрелки — листать.
function Lightbox({ items, index, onClose, onIndex }) {
  const it = items[index];
  const go = (d) => onIndex((index + d + items.length) % items.length);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  });
  const [touchX, setTouchX] = useState(null);
  if (!it) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur flex flex-col items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX == null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); setTouchX(null); }}>
      <button aria-label="Закрыть" className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20" onClick={onClose}><X size={20} /></button>
      <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={imgSrc(it.image)} alt={it.name} className="w-full rounded-2xl border border-white/10 bg-[#0b1530]" />
          {items.length > 1 && <>
            <button aria-label="Назад" className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70" onClick={() => go(-1)}><ChevronLeft size={22} /></button>
            <button aria-label="Вперёд" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70" onClick={() => go(1)}><ChevronRight size={22} /></button>
          </>}
        </div>
        <div className="mt-3 px-1">
          <div className="flex items-start justify-between gap-3">
            <div className="text-white font-semibold text-lg leading-snug"><span className="text-slate-500 tabular-nums mr-2">{index + 1}.</span>{it.name}</div>
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium bg-orange-500/15 text-orange-300 shrink-0"><Repeat size={12} />{it.reps}</span>
          </div>
          {it.tip && <div className="text-sm text-slate-300 mt-1">{it.tip}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function Warmup({ items = [] }) {
  const [open, setOpen] = useState(null);
  const withImg = items.filter((x) => x.image);
  return (
    <Card>
      <CardTitle icon={Flame} color="text-orange-400" right={<span className="text-xs text-slate-500">{items.length} упр. · по порядку</span>}>Разминка</CardTitle>
      {!items.length ? <Empty>Упражнений разминки пока нет</Empty> : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {items.map((it, i) => (
            <div key={it.id || i} className="rounded-xl bg-white/[.03] border border-white/[.06] overflow-hidden flex flex-col">
              {it.image && (
                <button type="button" onClick={() => setOpen(withImg.indexOf(it))} className="block w-full aspect-[4/3] bg-[#0b1530] overflow-hidden group" aria-label={`Увеличить: ${it.name}`}>
                  <img src={imgSrc(it.image)} alt={it.name} loading="lazy" decoding="async" className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                </button>
              )}
              <div className="p-2.5 sm:p-3 flex flex-col gap-1.5 flex-1">
                <div className="text-white text-sm sm:text-base font-medium leading-snug"><span className="text-slate-500 tabular-nums mr-1">{i + 1}.</span>{it.name}</div>
                <div><span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium bg-orange-500/15 text-orange-300 tabular-nums"><Repeat size={11} />{it.reps}</span></div>
                {it.tip && <div className="text-xs text-slate-400 leading-relaxed">{it.tip}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {open != null && open >= 0 && <Lightbox items={withImg} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </Card>
  );
}
