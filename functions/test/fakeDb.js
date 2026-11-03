// Testler için bellek içi Firestore benzeri (yalnızca app.js'in kullandığı özellikler)
export class Ts { constructor(ms) { this.ms = ms; } toMillis() { return this.ms; } toDate() { return new Date(this.ms); } valueOf() { return this.ms; } }
let saat = Date.UTC(2026, 10, 1, 9, 0, 0);
export const zaman = { simdi: () => saat, ileri: (ms) => { saat += ms; } };
const SERVER = Symbol('server'); const UNION = Symbol('union');
export const FieldValue = { serverTimestamp: () => ({ [SERVER]: true }), arrayUnion: (...a) => ({ [UNION]: a }) };
export const Timestamp = { now: () => new Ts(saat), fromMillis: (n) => new Ts(n) };
const kopya = (o) => (o == null ? o : structuredClone(o));
function uygula(eski, yeni) {
  const out = { ...(eski || {}) };
  for (const [k, v] of Object.entries(yeni)) {
    if (v && typeof v === 'object' && v[SERVER]) out[k] = new Ts(saat);
    else if (v && typeof v === 'object' && v[UNION]) out[k] = [...(Array.isArray(out[k]) ? out[k] : []), ...v[UNION].filter((x) => !(out[k] || []).some((y) => JSON.stringify(y) === JSON.stringify(x)))];
    else out[k] = v;
  }
  return out;
}
const al = (o, f) => o?.[f];
const kars = (a, b) => (a instanceof Ts ? a.ms : a) - (b instanceof Ts ? b.ms : b);
export class FakeDb {
  constructor() { this.v = new Map(); this.n = 0; }
  collection(p) { return new Coll(this, p); }
  async runTransaction(fn) { return fn({ get: (r) => r.get(), set: (r, d) => r.set(d), update: (r, d) => r.update(d) }); }
  dump(prefix) { return [...this.v.entries()].filter(([k]) => k.startsWith(prefix)); }
}
class Snap { constructor(ref, d) { this.ref = ref; this.id = ref.id; this._d = d; this.exists = d !== undefined; } data() { return this._d === undefined ? undefined : this._d; } }
class Doc {
  constructor(db, path) { this.db = db; this.path = path; this.id = path.split('/').pop(); }
  collection(n) { return new Coll(this.db, `${this.path}/${n}`); }
  async get() { return new Snap(this, this.db.v.has(this.path) ? this.db.v.get(this.path) : undefined); }
  async set(d, o = {}) { this.db.v.set(this.path, uygula(o.merge ? this.db.v.get(this.path) : {}, d)); }
  async update(d) { if (!this.db.v.has(this.path)) throw new Error('NOT_FOUND ' + this.path); this.db.v.set(this.path, uygula(this.db.v.get(this.path), d)); }
  async delete() { this.db.v.delete(this.path); }
}
class Query {
  constructor(db, path, f = [], o = null, l = Infinity) { Object.assign(this, { db, path, f, o, l }); }
  where(a, op, b) { return new Query(this.db, this.path, [...this.f, [a, op, b]], this.o, this.l); }
  orderBy(a, dir = 'asc') { return new Query(this.db, this.path, this.f, [a, dir], this.l); }
  limit(n) { return new Query(this.db, this.path, this.f, this.o, n); }
  async get() {
    const depth = this.path.split('/').length + 1;
    let docs = [...this.db.v.entries()].filter(([k]) => k.startsWith(this.path + '/') && k.split('/').length === depth).map(([k, d]) => new Snap(new Doc(this.db, k), d));
    for (const [a, op, b] of this.f) docs = docs.filter((s) => { const x = al(s.data(), a); if (op === '==') return x === b; if (op === 'array-contains') return Array.isArray(x) && x.includes(b); if (x == null) return false; const c = kars(x, b); return op === '<=' ? c <= 0 : op === '>=' ? c >= 0 : op === '<' ? c < 0 : c > 0; });
    if (this.o) { const [a, dir] = this.o; docs = docs.filter((s) => al(s.data(), a) != null).sort((x, y) => kars(al(x.data(), a), al(y.data(), a)) * (dir === 'desc' ? -1 : 1)); }
    docs = docs.slice(0, this.l);
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}
class Coll extends Query {
  constructor(db, path) { super(db, path); }
  doc(id) { if (id !== undefined && (typeof id !== 'string' || !id || id.includes('/'))) throw new Error('Value for argument "documentPath" is not a valid resource path.'); return new Doc(this.db, `${this.path}/${id || 'ID' + String(++this.db.n).padStart(6, '0') + Math.random().toString(36).slice(2, 8)}`); }
  async add(d) { const r = this.doc(); await r.set(d); return r; }
}
export function res() {
  return { statusCode: 0, body: null, h: {}, status(c) { this.statusCode = c; return this; }, set(k, v) { this.h[k.toLowerCase()] = v; return this; }, getHeader(k) { return this.h[k.toLowerCase()]; }, json(b) { this.body = b; return this; } };
}
