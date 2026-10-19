// A small in-memory stand-in for the Supabase client, used only by the UI smoke test.
// It imitates the parts of the database the app relies on (including the completion-time rule).
import type { Friendship, Profile, Task } from '../lib/types';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null };
interface Filter { op: 'eq' | 'gte' | 'lte'; col: string; val: unknown }

export interface FakeDb {
  tasks: Task[];
  profiles: Profile[];
  friendship: Friendship | null;
  me: string;
  calls: string[];
}

export function createFake(db: FakeDb) {
  let seq = 1000;

  class Query implements PromiseLike<Result> {
    action: 'select' | 'insert' | 'update' | 'delete' = 'select';
    filters: Filter[] = [];
    payload: unknown;
    orderBy: string[] = [];
    from = 0;
    to = Infinity;
    max = Infinity;
    mode: 'single' | 'maybe' | null = null;
    constructor(public table: 'tasks' | 'profiles' | 'friendships' | 'task_events') {}

    select() { return this; }
    insert(rows: Row | Row[]) { this.action = 'insert'; this.payload = rows; return this; }
    update(patch: Row) { this.action = 'update'; this.payload = patch; return this; }
    delete() { this.action = 'delete'; return this; }
    eq(col: string, val: unknown) { this.filters.push({ op: 'eq', col, val }); return this; }
    gte(col: string, val: unknown) { this.filters.push({ op: 'gte', col, val }); return this; }
    lte(col: string, val: unknown) { this.filters.push({ op: 'lte', col, val }); return this; }
    order(col: string) { this.orderBy.push(col); return this; }
    range(a: number, b: number) { this.from = a; this.to = b; return this; }
    limit(n: number) { this.max = n; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybe'; return this; }

    private rows(): Row[] {
      const all = this.table === 'task_events' || this.table === 'friendships' ? [] : (db[this.table] as unknown as Row[]);
      return all.filter((r) => this.filters.every((f) => {
        const v = r[f.col] as string;
        return f.op === 'eq' ? v === f.val : f.op === 'gte' ? v >= (f.val as string) : v <= (f.val as string);
      }));
    }

    private run(): { data: unknown; error: { message: string } | null } {
      db.calls.push(`${this.table}.${this.action}`);
      if (this.table === 'tasks') {
        // Mimics RLS: friends can read but not write.
        const writable = (r: Row) => r.owner_id === db.me;
        if (this.action === 'insert') {
          const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
          for (const r of rows) {
            if (r.owner_id !== db.me) return { data: null, error: { message: 'new row violates row-level security policy' } };
            db.tasks.push({ completed: false, completed_at: null, series_id: null, task_time: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...r, id: `new-${seq++}` } as Task);
          }
          return { data: null, error: null };
        }
        if (this.action === 'update') {
          const hit = this.rows().filter(writable);
          for (const r of hit) {
            Object.assign(r, this.payload);
            if ('completed' in (this.payload as Row)) r.completed_at = r.completed ? new Date().toISOString() : null;
          }
          return this.finish(hit);
        }
        if (this.action === 'delete') {
          const hit = new Set(this.rows().filter(writable));
          db.tasks = db.tasks.filter((t) => !hit.has(t as unknown as Row));
          return { data: null, error: null };
        }
      }
      if (this.table === 'profiles' && this.action === 'update') {
        const hit = this.rows();
        hit.forEach((r) => Object.assign(r, this.payload));
        return this.finish(hit);
      }
      if (this.table === 'friendships' && this.action === 'delete') {
        db.friendship = null;
        return { data: null, error: null };
      }
      let list = this.rows().slice();
      for (const col of [...this.orderBy].reverse()) list = list.sort((a, b) => ((a[col] as string) < (b[col] as string) ? -1 : 1));
      list = list.slice(this.from, Math.min(this.to + 1, this.from + this.max));
      return this.finish(list);
    }

    private finish(list: Row[]) {
      if (this.mode === 'single') return list[0] ? { data: list[0], error: null } : { data: null, error: { message: 'no rows' } };
      if (this.mode === 'maybe') return { data: list[0] ?? null, error: null };
      return { data: list, error: null };
    }

    then<A = Result, B = never>(
      ok?: ((v: Result) => A | PromiseLike<A>) | null,
      bad?: ((e: unknown) => B | PromiseLike<B>) | null,
    ): Promise<A | B> {
      return Promise.resolve(this.run()).then(ok, bad);
    }
  }

  const session = { user: { id: db.me, email: 'alice@example.com' }, access_token: 't' };
  const listeners: Array<(e: string, s: unknown) => void> = [];

  return {
    from: (t: Query['table']) => new Query(t),
    rpc: async (name: string, args?: Row) => {
      db.calls.push(`rpc.${name}`);
      if (name === 'get_friendship') return { data: db.friendship ? [db.friendship] : [], error: null };
      if (name === 'send_friend_request') return { data: 'ok', error: null, args };
      return { data: null, error: null };
    },
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      signUp: async () => ({ data: { session: null }, error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
      updateUser: async () => ({ error: null }),
    },
  };
}
