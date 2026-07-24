import NodeCache from "node-cache";

const TTL = Number(process.env.CACHE_TTL_SECONDS ?? 60);

// Single in-memory cache shared across routes. Keyed by `route:args`.
// checkperiod keeps memory tidy by purging expired keys periodically.
// useClones:false skips NodeCache's default deep-clone on every get/set —
// real CPU+RAM overhead on the larger payloads (news, financials) — safe
// here since every route handler only reads cached data, never mutates it
// in place.
const cache = new NodeCache({ stdTTL: TTL, checkperiod: Math.max(30, TTL), useClones: false });

/**
 * Return a cached value if present, otherwise run `producer`, cache and
 * return its result. Errors from `producer` are NOT cached.
 */
export async function cached<T>(
  key: string,
  producer: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;

  const value = await producer();
  cache.set(key, value, ttlSeconds ?? TTL);
  return value;
}

export default cache;
