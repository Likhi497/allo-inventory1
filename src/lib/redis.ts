/**
 * Redis abstraction layer.
 *
 * In production (Vercel) this uses Upstash Redis REST API.
 * In local dev (no Redis server) we fall back to an in-process Map,
 * which is sufficient for a single-process dev server.
 */

// ─── In-memory fallback (local dev) ──────────────────────────────────────────

const memStore = new Map<string, { value: string; expiresAt: number }>();

function memSet(key: string, value: string, exSeconds: number) {
  memStore.set(key, { value, expiresAt: Date.now() + exSeconds * 1000 });
  return "OK";
}

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
  return entry.value;
}

function memDel(key: string) {
  memStore.delete(key);
}

// SET NX — only set if key doesn't exist
function memSetNx(key: string, value: string, exSeconds: number): "OK" | null {
  const existing = memGet(key); // also handles expiry check
  if (existing !== null) return null;
  memSet(key, value, exSeconds);
  return "OK";
}

// ─── Upstash Redis (production) ──────────────────────────────────────────────

let _redisClient: import("@upstash/redis").Redis | null = null;

function isUpstashConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  return url.startsWith("https://");
}

async function getRedis() {
  if (!isUpstashConfigured()) return null;
  if (!_redisClient) {
    const { Redis } = await import("@upstash/redis");
    _redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redisClient;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function acquireLock(key: string, ttlSeconds = 5): Promise<boolean> {
  const redis = await getRedis();
  if (redis) {
    const result = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
    return result === "OK";
  }
  // local fallback
  return memSetNx(key, "1", ttlSeconds) === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  const redis = await getRedis();
  if (redis) { await redis.del(key); return; }
  memDel(key);
}

export async function redisGet(key: string): Promise<string | null> {
  const redis = await getRedis();
  if (redis) return redis.get<string>(key);
  return memGet(key);
}

export async function redisSet(key: string, value: string, exSeconds: number): Promise<void> {
  const redis = await getRedis();
  if (redis) { await redis.set(key, value, { ex: exSeconds }); return; }
  memSet(key, value, exSeconds);
}

export function stockLockKey(productId: string, warehouseId: string): string {
  return `lock:stock:${productId}:${warehouseId}`;
}

export function idempotencyKey(key: string): string {
  return `idempotency:${key}`;
}
