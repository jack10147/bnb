import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Images, Upload, KeyRound, X, ChevronLeft, ChevronRight, Download, ExternalLink, Trash2, RefreshCw, FolderPlus, Folder, Pencil, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Card, SectionHeader } from '../components/ui.jsx';
import { getToken, setToken, checkToken, loadManifest, deletePhotos, movePhotos, createAlbum, renameAlbum, deleteAlbum, rawUrl, OWNER, REPO } from '../photos/api.js';
import { uploadFiles } from '../photos/image.js';

const dateOf = (p) => p.takenAt || p.uploadedAt || '';
const monthLabel = (iso) => {
  const d = new Date(iso.length <= 19 ? iso : iso);
  if (isNaN(d)) return 'Без даты';
  const s = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', '');
  return s[0].toUpperCase() + s.slice(1);
};

function Connect({ token, onChange }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    const t = val.trim(); if (!t) return;
    setBusy(true); setErr('');
    try { await checkToken(t); setToken(t); onChange(t); setVal(''); setOpen(false); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  if (token) return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <KeyRound size={14} className="text-emerald-400" /> Загрузка подключена на этом устройстве
      <button className="ml-auto text-rose-300 hover:text-rose-200" onClick={() => { if (confirm('Удалить токен с этого устройства?')) { setToken(''); onChange(''); } }}>Удалить токен</button>
    </div>
  );
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm text-sky-300"><KeyRound size={16} /> Подключить загрузку</button>
      {open && <div className="mt-3 text-sm text-slate-300 space-y-2">
        <ol className="list-decimal pl-5 space-y-1 text-slate-400">
          <li>Откройте <a className="text-sky-300 underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">github.com/settings/personal-access-tokens/new</a> (войдите как {OWNER}).</li>
          <li>Token name — любое, например «bnb-photos телефон». Expiration — на ваш выбор (можно «No expiration»).</li>
          <li>Repository access → <b>Only select repositories</b> → выберите <b>{REPO}</b>.</li>
          <li>Permissions → Repository permissions → <b>Contents: Read and write</b>.</li>
          <li>Нажмите <b>Generate token</b>, скопируйте его (начинается с github_pat_) и вставьте сюда.</li>
        </ol>
        <p className="text-xs text-slate-500">Токен хранится только в этом браузере. Фото в репозитории публичные.</p>
        <div className="flex gap-2">
          <input type="password" autoComplete="off" value={val} onChange={(e) => setVal(e.target.value)} placeholder="github_pat_…"
            className="flex-1 min-w-0 bg-white/[.05] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-sky-400" />
          <button disabled={busy} onClick={save} className="px-4 py-2 rounded-xl bg-sky-500/90 text-white text-sm disabled:opacity-50">{busy ? '…' : 'Сохранить'}</button>
        </div>
        {err && <div className="text-rose-300 text-xs">{err}</div>}
      </div>}
    </div>
  );
}

function Viewer({ photos, index, setIndex, onClose, onDelete, canDelete }) {
  const p = photos[index];
  const [zoom, setZoom] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const start = useRef(null), lastTap = useRef(0);
  const go = useCallback((d) => { setZoom(false); setIndex((i) => Math.min(photos.length - 1, Math.max(0, i + d))); }, [photos.length, setIndex]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', k);
    const ov = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ov; };
  }, [go, onClose]);
  useEffect(() => { // предзагрузка соседних
    [index - 1, index + 1].forEach((i) => { if (photos[i]) { const im = new Image(); im.src = rawUrl(photos[i].path); } });
  }, [index, photos]);
  if (!p) return null;
  const onStart = (e) => { if (e.touches.length !== 1) { start.current = null; return; } start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onMove = (e) => { if (!start.current || zoom) return; setDrag({ x: e.touches[0].clientX - start.current.x, y: e.touches[0].clientY - start.current.y }); };
  const onEnd = () => {
    const { x, y } = drag; setDrag({ x: 0, y: 0 });
    if (!start.current) return; start.current = null;
    if (zoom) return;
    if (Math.abs(x) > 60 && Math.abs(x) > Math.abs(y)) go(x < 0 ? 1 : -1);
    else if (y > 100 && y > Math.abs(x)) onClose();
  };
  const onTap = () => { const n = Date.now(); if (n - lastTap.current < 300) setZoom((z) => !z); lastTap.current = n; };
  const download = async () => {
    try {
      const b = await (await fetch(rawUrl(p.path))).blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (p.name?.replace(/\.\w+$/, '') || p.id) + '.jpg'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch { window.open(rawUrl(p.path), '_blank'); }
  };
  const vertical = Math.abs(drag.y) > Math.abs(drag.x) && drag.y > 0;
  const btn = 'p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white';
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none" style={{ backgroundColor: `rgba(0,0,0,${vertical ? Math.max(0.3, 1 - drag.y / 400) : 1})` }}>
      <div className="flex items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),12px)] pb-2 text-white z-10">
        <button aria-label="Закрыть" className={btn} onClick={onClose}><X size={20} /></button>
        <div className="flex-1 text-center text-sm tabular-nums">{index + 1} / {photos.length}</div>
        <button aria-label="Скачать" className={btn} onClick={download}><Download size={18} /></button>
        <a aria-label="Открыть оригинал" className={btn} href={rawUrl(p.path)} target="_blank" rel="noreferrer"><ExternalLink size={18} /></a>
        {canDelete && <button aria-label="Удалить" className={`${btn} text-rose-300`} onClick={() => onDelete(p)}><Trash2 size={18} /></button>}
      </div>
      <div className="flex-1 relative overflow-hidden" onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onClick={onTap}>
        <div className={`absolute inset-0 ${zoom ? 'overflow-auto' : 'flex items-center justify-center'}`}
          style={{ transform: `translate(${vertical ? 0 : drag.x}px, ${vertical ? drag.y : 0}px)`, transition: start.current ? 'none' : 'transform .2s' }}>
          <img key={p.id} src={rawUrl(p.path)} alt="" draggable={false}
            style={zoom ? { width: '200%', maxWidth: 'none' } : { backgroundImage: `url(${rawUrl(p.thumb)})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
            className={zoom ? '' : 'max-w-full max-h-full object-contain'} width={p.w} height={p.h} />
        </div>
        {index > 0 && <button aria-label="Назад" className={`hidden md:block absolute left-3 top-1/2 -translate-y-1/2 ${btn}`} onClick={(e) => { e.stopPropagation(); go(-1); }}><ChevronLeft /></button>}
        {index < photos.length - 1 && <button aria-label="Вперёд" className={`hidden md:block absolute right-3 top-1/2 -translate-y-1/2 ${btn}`} onClick={(e) => { e.stopPropagation(); go(1); }}><ChevronRight /></button>}
      </div>
      <div className="text-center text-[11px] text-slate-400 pb-[max(env(safe-area-inset-bottom),10px)] pt-2">
        {new Date(dateOf(p)).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })} · двойной тап — зум
      </div>
    </div>
  );
}


const ALL = 'all', NONE = 'none';

function AlbumCard({ name, count, cover, onClick }) {
  return (
    <button onClick={onClick} className="text-left">
      <div className="aspect-square rounded-2xl overflow-hidden bg-white/[.05] flex items-center justify-center">
        {cover ? <img src={rawUrl(cover.thumb)} loading="lazy" alt="" className="w-full h-full object-cover" /> : <Folder size={36} className="text-slate-600" />}
      </div>
      <div className="mt-1.5 text-sm text-slate-100 truncate">{name}</div>
      <div className="text-xs text-slate-500">{count}</div>
    </button>
  );
}

export default function Photos() {
  const [token, setTok] = useState(getToken);
  const [man, setMan] = useState(null);
  const [err, setErr] = useState('');
  const [progress, setProgress] = useState(null);
  const [view, setView] = useState(null);
  const [album, setAlbum] = useState(null); // null = список альбомов
  const [sel, setSel] = useState(null); // Set при режиме выбора
  const [busyOp, setBusyOp] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const input = useRef(null);

  const load = useCallback(async () => {
    setErr('');
    try { setMan(await loadManifest(token)); }
    catch (e) { setErr(e.message); setMan((m) => m || { albums: [], photos: [] }); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSel(null); setView(null); }, [album]);

  const photos = man?.photos || [], albums = man?.albums || [];
  const known = useMemo(() => new Set(albums.map((a) => a.id)), [albums]);
  const albumOf = (p) => (p.album && known.has(p.album) ? p.album : NONE);
  const all = useMemo(() => photos.slice().sort((a, b) => dateOf(b).localeCompare(dateOf(a))), [photos]);
  const sorted = useMemo(() => (album === ALL || !album ? all : all.filter((p) => albumOf(p) === album)), [all, album, known]);
  const groups = useMemo(() => {
    const g = []; sorted.forEach((p, i) => { const l = monthLabel(dateOf(p)); if (!g.length || g[g.length - 1].label !== l) g.push({ label: l, items: [] }); g[g.length - 1].items.push({ p, i }); });
    return g;
  }, [sorted]);
  const cur = albums.find((a) => a.id === album);
  const title = album === ALL ? 'Все фото' : album === NONE ? 'Без альбома' : cur?.name;

  const run = async (fn) => {
    setBusyOp(true);
    try { const r = await fn(); if (r?.photos) setMan(r); return r; }
    catch (e) { alert(`Ошибка: ${e.message}`); }
    finally { setBusyOp(false); }
  };

  const upload = async (list) => {
    const files = [...list].filter((f) => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (!files.length || (progress && !progress.finished)) return;
    setProgress({ done: 0, total: files.length, errors: [], staged: 0 });
    try { await uploadFiles(token, files, (s) => setProgress((o) => ({ ...o, ...s })), cur ? cur.id : null); }
    catch (e) { setProgress((o) => ({ ...o, errors: [...(o?.errors || []), { name: 'GitHub', error: e.message }] })); }
    setProgress((o) => ({ ...o, finished: true }));
    load();
  };

  const onDelete = async (p) => {
    if (!confirm('Удалить это фото навсегда?')) return;
    const r = await run(() => deletePhotos(token, [p.id]));
    if (!r) return;
    const left = sorted.length - 1;
    if (!left) setView(null); else setView((i) => Math.min(i, left - 1));
  };
  const newAlbum = async () => {
    const name = prompt('Название альбома'); if (!name?.trim()) return;
    const r = await run(() => createAlbum(token, name.trim()));
    if (r) setAlbum(r.id);
  };
  const rename = () => { const name = prompt('Новое название', cur.name); if (name?.trim()) run(() => renameAlbum(token, cur.id, name.trim())); };
  const removeAlbum = async () => {
    const n = sorted.length;
    if (!confirm(`Удалить альбом «${cur.name}»?`)) return;
    let withPhotos = false;
    if (n) withPhotos = confirm(`В альбоме ${n} фото.\nOK — удалить и фото тоже.\nОтмена — перенести фото в «Без альбома».`);
    if (withPhotos && !confirm(`Точно удалить ${n} фото навсегда?`)) return;
    if (await run(() => deleteAlbum(token, cur.id, withPhotos))) setAlbum(null);
  };
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const moveSel = async (to) => { if (await run(() => movePhotos(token, [...sel], to === NONE ? null : to))) setSel(null); };
  const delSel = async () => { if (confirm(`Удалить ${sel.size} фото навсегда?`) && await run(() => deletePhotos(token, [...sel]))) setSel(null); };

  const busy = progress && !progress.finished;
  const uploadCard = (
    <Card className={`mb-4 space-y-3 ${dragOver ? 'ring-2 ring-sky-400' : ''}`}>
      {token && album && <>
        <input ref={input} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
        <button disabled={busy} onClick={() => input.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500/90 hover:bg-sky-500 text-white font-medium disabled:opacity-60">
          <Upload size={18} /> {busy ? 'Загрузка…' : `Загрузить фото${cur ? ` в «${cur.name}»` : ''}`}
        </button>
        <div className="hidden md:block text-center text-xs text-slate-500">или перетащите файлы сюда</div>
      </>}
      {progress && <div className="text-sm">
        <div className="flex justify-between text-slate-300"><span>Загружено {progress.done} из {progress.total}</span>{busy && <span className="text-slate-500">обработано {progress.done + (progress.staged || 0) + progress.errors.length}</span>}</div>
        <div className="h-1.5 mt-1 rounded bg-white/10 overflow-hidden"><div className="h-full bg-sky-400 transition-all" style={{ width: `${(100 * (progress.done + (progress.staged || 0) + progress.errors.length)) / progress.total}%` }} /></div>
        {progress.errors.length > 0 && <ul className="mt-2 text-xs text-rose-300 space-y-0.5">{progress.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}</ul>}
        {progress.finished && <button className="mt-1 text-xs text-slate-500" onClick={() => setProgress(null)}>Скрыть</button>}
      </div>}
      <Connect token={token} onChange={setTok} />
    </Card>
  );
  const iconBtn = 'p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[.06] disabled:opacity-40';

  return (
    <div onDragOver={(e) => { if (!token || !album) return; e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { if (!token || !album) return; e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}>
      {!album ? <>
        <SectionHeader title="Фотки" subtitle={man ? `${photos.length} фото · ${albums.length} альб.` : 'Загрузка…'}
          right={<div className="flex gap-1">
            {token && <button disabled={busyOp} onClick={newAlbum} className={iconBtn} aria-label="Новый альбом"><FolderPlus size={18} /></button>}
            <button onClick={load} aria-label="Обновить" className={iconBtn}><RefreshCw size={16} /></button></div>} />
        {uploadCard}
        {err && <div className="text-sm text-rose-300 mb-3">{err}</div>}
        {man && <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          <AlbumCard name="Все фото" count={photos.length} cover={all[0]} onClick={() => setAlbum(ALL)} />
          {(all.some((p) => albumOf(p) === NONE) || !albums.length) && <AlbumCard name="Без альбома" count={all.filter((p) => albumOf(p) === NONE).length} cover={all.find((p) => albumOf(p) === NONE)} onClick={() => setAlbum(NONE)} />}
          {albums.map((a) => { const ps = all.filter((p) => p.album === a.id); return <AlbumCard key={a.id} name={a.name} count={ps.length} cover={ps[0]} onClick={() => setAlbum(a.id)} />; })}
          {token && <button disabled={busyOp} onClick={newAlbum} className="text-left"><div className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-slate-500"><FolderPlus size={32} /></div><div className="mt-1.5 text-sm text-slate-400">Новый альбом</div></button>}
        </div>}
      </> : <>
        <div className="flex items-center gap-1 mb-4">
          <button onClick={() => setAlbum(null)} className={iconBtn} aria-label="Альбомы"><ArrowLeft size={20} /></button>
          <div className="min-w-0 flex-1"><div className="text-xl font-semibold text-white truncate">{title}</div><div className="text-xs text-slate-500">{sorted.length} фото</div></div>
          {token && cur && <><button disabled={busyOp} onClick={rename} className={iconBtn} aria-label="Переименовать"><Pencil size={16} /></button>
            <button disabled={busyOp} onClick={removeAlbum} className={`${iconBtn} hover:text-rose-300`} aria-label="Удалить альбом"><Trash2 size={16} /></button></>}
          {token && sorted.length > 0 && <button onClick={() => setSel(sel ? null : new Set())} className="px-3 py-1.5 rounded-xl text-sm text-sky-300 hover:bg-white/[.06]">{sel ? 'Готово' : 'Выбрать'}</button>}
        </div>
        {!sel && uploadCard}
        {sorted.length === 0 && man && <div className="text-center py-16 text-slate-500"><Images className="mx-auto mb-3 opacity-50" size={40} />Пока нет фото{!token && <div className="text-xs mt-1">Подключите загрузку на экране альбомов</div>}</div>}
        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <div className="text-sm font-semibold text-slate-200 mb-2">{g.label}</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-0.5 -mx-4 md:mx-0">
              {g.items.map(({ p, i }) => (
                <button key={p.id} onClick={() => (sel ? toggle(p.id) : setView(i))} className="relative aspect-square bg-white/[.04] overflow-hidden">
                  <img src={rawUrl(p.thumb)} loading="lazy" decoding="async" alt="" className={`w-full h-full object-cover ${sel?.has(p.id) ? 'opacity-60 scale-95' : ''} transition`} />
                  {sel && <CheckCircle2 size={22} className={`absolute bottom-1 right-1 ${sel.has(p.id) ? 'text-sky-400 fill-white' : 'text-white/70'}`} />}
                </button>
              ))}
            </div>
          </div>
        ))}
        {sel && sel.size > 0 && <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] md:bottom-4 z-40 px-4">
          <div className="max-w-xl mx-auto flex items-center gap-2 bg-[#121a2b] border border-white/10 rounded-2xl p-2 shadow-xl">
            <span className="text-sm text-slate-300 px-2">{sel.size} выбр.</span>
            <select disabled={busyOp} value="" onChange={(e) => e.target.value && moveSel(e.target.value)} className="flex-1 min-w-0 bg-white/[.06] text-sm text-white rounded-xl px-2 py-2">
              <option value="">Переместить в…</option>
              <option value={NONE}>Без альбома</option>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button disabled={busyOp} onClick={delSel} className="p-2 rounded-xl text-rose-300 hover:bg-white/[.06]" aria-label="Удалить выбранные"><Trash2 size={18} /></button>
          </div>
        </div>}
      </>}
      {view != null && <Viewer photos={sorted} index={view} setIndex={setView} onClose={() => setView(null)} onDelete={onDelete} canDelete={!!token} />}
    </div>
  );
}
