import { uploadBlob, commitChange, newId } from './api.js';

export const MAX_SIDE = 2560, THUMB_SIDE = 400, QUALITY = 0.85, THUMB_QUALITY = 0.75, CHUNK = 20;

// Дата съёмки из EXIF (DateTimeOriginal) — только JPEG, без зависимостей.
export async function exifDate(file) {
  try {
    const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (v.getUint16(0) !== 0xffd8) return null;
    let o = 2;
    while (o < v.byteLength - 4) {
      const marker = v.getUint16(o), len = v.getUint16(o + 2);
      if (marker === 0xffe1 && v.getUint32(o + 4) === 0x45786966) {
        const t = o + 10, le = v.getUint16(t) === 0x4949;
        const u16 = (p) => v.getUint16(p, le), u32 = (p) => v.getUint32(p, le);
        const readIfd = (ifd, want) => {
          const n = u16(ifd);
          for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === want) return e; }
          return null;
        };
        const ifd0 = t + u32(t + 4);
        const exifPtr = readIfd(ifd0, 0x8769);
        const entry = exifPtr ? readIfd(t + u32(exifPtr + 8), 0x9003) : readIfd(ifd0, 0x0132);
        if (!entry) return null;
        let s = ''; const p = t + u32(entry + 8);
        for (let i = 0; i < 19; i++) s += String.fromCharCode(v.getUint8(p + i));
        const m = s.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
        if (!m || m[1] === '0000') return null;
        return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
      }
      if ((marker & 0xff00) !== 0xff00) break;
      o += 2 + len;
    }
  } catch { /* ignore */ }
  return null;
}

async function decode(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fallback */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.decoding = 'async'; img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error(/heic|heif/i.test(file.type + file.name) ? 'HEIC не поддерживается этим браузером — выберите «Наиболее совместимый» формат или JPEG' : 'Не удалось прочитать изображение');
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function render(src, w, h, maxSide, q) {
  const k = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(src, 0, 0, cw, ch);
  return new Promise((res, rej) => c.toBlob((b) => { c.width = c.height = 0; b ? res({ blob: b, w: cw, h: ch }) : rej(new Error('Не удалось сжать')); }, 'image/jpeg', q));
}

export async function processImage(file) {
  const src = await decode(file);
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  if (!w || !h) throw new Error('Пустое изображение');
  const full = await render(src, w, h, MAX_SIDE, QUALITY);
  const thumb = await render(src, w, h, THUMB_SIDE, THUMB_QUALITY);
  src.close?.();
  return { full, thumb, takenAt: await exifDate(file) };
}


// Загрузка пачки: файлы обрабатываются по очереди (экономим память на iPhone), коммит на каждые CHUNK фото.
export async function uploadFiles(token, files, onProgress = () => {}, album = null) {
  const errors = []; let done = 0, pending = [];
  const flush = async () => {
    if (!pending.length) return;
    const batch = pending; pending = [];
    await commitChange(token, {
      build: (m) => ({
        files: batch.flatMap((b) => b.files),
        manifest: { ...m, photos: [...batch.map((b) => ({ ...b.entry, album: album && m.albums.some((a) => a.id === album) ? album : null })), ...m.photos] },
      }),
      message: `Upload ${batch.length} photo(s)`,
    });
    done += batch.length;
    onProgress({ done, total: files.length, errors });
  };
  for (const file of files) {
    try {
      const { full, thumb, takenAt } = await processImage(file);
      const id = newId(), ym = album || 'unsorted';
      const path = `photos/${ym}/${id}.jpg`, tpath = `thumbs/${ym}/${id}.jpg`;
      const [s1, s2] = await Promise.all([uploadBlob(token, full.blob), uploadBlob(token, thumb.blob)]);
      pending.push({
        files: [{ path, sha: s1 }, { path: tpath, sha: s2 }],
        entry: { id, path, thumb: tpath, sha: s1, tsha: s2, w: full.w, h: full.h, size: full.blob.size, name: file.name || '', takenAt, uploadedAt: new Date().toISOString() },
      });
    } catch (e) {
      errors.push({ name: file.name || 'файл', error: e.message });
      onProgress({ done, total: files.length, errors, processing: true });
    }
    if (pending.length >= CHUNK) {
      try { await flush(); } catch (e) { errors.push({ name: 'коммит', error: e.message }); if (e.status === 401 || e.status === 403) throw e; }
    } else onProgress({ done, total: files.length, errors, staged: pending.length });
  }
  await flush();
  return { done, errors };
}
