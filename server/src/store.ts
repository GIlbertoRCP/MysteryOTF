import { createClient } from 'redis';

/**
 * Where rooms are saved so a case survives server restarts, sleeps and redeploys.
 * With REDIS_URL set (Render Key Value in production) rooms go to Redis.
 * Without it (local development) nothing is saved and rooms live in memory only.
 */
export interface RoomStore {
  readonly durable: boolean;
  load(code: string): Promise<string | null>;
  save(code: string, json: string): Promise<void>;
  exists(code: string): Promise<boolean>;
}

/** Saved cases expire after two days without any activity. */
const TTL_SECONDS = 2 * 24 * 60 * 60;
const key = (code: string) => `dbs:room:${code}`;

class MemoryStore implements RoomStore {
  readonly durable = false;
  async load() {
    return null;
  }
  async save() {}
  async exists() {
    return false;
  }
}

class RedisStore implements RoomStore {
  readonly durable = true;
  private client;
  private ready: Promise<void>;

  constructor(url: string) {
    this.client = createClient({
      url,
      socket: { reconnectStrategy: (retries) => Math.min(retries * 200, 5000) },
    });
    this.client.on('error', (err) => console.error('[Store] Redis error:', err.message));
    this.ready = this.client.connect().then(
      () => console.log('[Store] Connected to Redis; cases will survive restarts'),
      (err) => console.error('[Store] Could not connect to Redis:', err.message)
    );
  }

  // Storage problems must never take the game down, so every call fails soft.
  async load(code: string) {
    try {
      await this.ready;
      return await this.client.get(key(code));
    } catch (err) {
      console.error('[Store] load failed:', (err as Error).message);
      return null;
    }
  }

  async save(code: string, json: string) {
    try {
      await this.ready;
      await this.client.set(key(code), json, { EX: TTL_SECONDS });
    } catch (err) {
      console.error('[Store] save failed:', (err as Error).message);
    }
  }

  async exists(code: string) {
    try {
      await this.ready;
      return (await this.client.exists(key(code))) === 1;
    } catch {
      return false;
    }
  }
}

export function createStore(): RoomStore {
  const url = process.env.REDIS_URL;
  if (url) return new RedisStore(url);
  console.log('[Store] No REDIS_URL; cases live in memory only');
  return new MemoryStore();
}
