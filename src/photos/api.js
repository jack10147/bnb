// Хранилище фото: публичный репозиторий GitHub (jack10147/bnb-photos).
// Чтение — без токена (raw по SHA коммита), запись — fine-grained токен из localStorage этого устройства.
export const OWNER = 'jack10147';
export const REPO = 'bnb-photos';
export const BRANCH = 'main';
export const TOKEN_KEY = 'bnb-photos-token';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}`;

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

export const rawUrl = (path, ref = BRANCH) => `${RAW}/${ref}/${path.split('/').map(encodeURIComponent).join('/')}`;

async function gh(path, { token, method = 'GET', body } = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  if (!r.ok) {
    let msg = ''; try { msg = (await r.json()).message || ''; } catch { /* ignore */ }
    const e = new Error(`GitHub ${r.status}${msg ? `: ${msg}` : ''}`); e.status = r.status; throw e;
  }
  return r.status === 204 ? null : r.json();
}

export async function headSha(token) {
  const ref = await gh(`/git/ref/heads/${BRANCH}`, { token });
  return ref.object.sha;
}

async function manifestAt(sha) {
  const r = await fetch(rawUrl('photos.json', sha), { cache: 'no-store' });
  if (r.status === 404) return { version: 1, photos: [] };
  if (!r.ok) throw new Error(`photos.json: HTTP ${r.status}`);
  const m = await r.json();
  return { version: 1, photos: Array.isArray(m.photos) ? m.photos : [] };
}

// Свежий манифест: SHA ветки через API (по нему raw неизменяем и не кешируется устаревшим),
// при лимите API без токена — raw ветки с cache-bust.
export async function loadManifest(token = getToken()) {
  try {
    const sha = await headSha(token);
    return { sha, ...(await manifestAt(sha)) };
  } catch (e) {
    if (token && (e.status === 401 || e.status === 403)) throw e;
    const r = await fetch(`${rawUrl('photos.json')}?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`photos.json: HTTP ${r.status}`);
    const m = await r.json();
    return { sha: null, version: 1, photos: m.photos || [] };
  }
}

export async function checkToken(token) {
  const repo = await gh('', { token });
  if (!repo.permissions?.push) throw new Error('У токена нет права записи (Contents: Read and write)');
  return true;
}

const toB64 = async (blob) => {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH) s += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
  return btoa(s);
};

export async function uploadBlob(token, blob) {
  const r = await gh('/git/blobs', { token, method: 'POST', body: { content: await toB64(blob), encoding: 'base64' } });
  return r.sha;
}

// Один коммит: файлы (blob sha или null = удалить) + изменение манифеста. Повтор при конфликте.
export async function commitChange(token, { files = [], mutate, message }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const parent = await headSha(token);
    const pc = await gh(`/git/commits/${parent}`, { token });
    const m = await manifestAt(parent);
    const next = mutate(m.photos.slice());
    const manifestSha = await uploadBlob(token, new Blob([JSON.stringify({ version: 1, photos: next }, null, 1)]));
    const tree = [
      ...files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', sha: f.sha })),
      { path: 'photos.json', mode: '100644', type: 'blob', sha: manifestSha },
    ];
    const t = await gh('/git/trees', { token, method: 'POST', body: { base_tree: pc.tree.sha, tree } });
    const c = await gh('/git/commits', { token, method: 'POST', body: { message, tree: t.sha, parents: [parent] } });
    try {
      await gh(`/git/refs/heads/${BRANCH}`, { token, method: 'PATCH', body: { sha: c.sha, force: false } });
      return { sha: c.sha, photos: next };
    } catch (e) {
      if ((e.status === 409 || e.status === 422) && attempt < 4) { await new Promise((r) => setTimeout(r, 800 * (attempt + 1))); continue; }
      throw e;
    }
  }
}

export async function deletePhotos(token, ids) {
  const set = new Set(ids);
  const cur = await loadManifest(token);
  const files = cur.photos.filter((p) => set.has(p.id)).flatMap((p) => [p.path, p.thumb]).filter(Boolean).map((path) => ({ path, sha: null }));
  return commitChange(token, { files, mutate: (ph) => ph.filter((p) => !set.has(p.id)), message: `Delete ${ids.length} photo(s)` });
}
