type RateBucket = { count: number; resetAt: number };

const stores = new Map<string, Map<string, RateBucket>>();

function store(namespace: string) {
  let bucket = stores.get(namespace);
  if (!bucket) {
    bucket = new Map();
    stores.set(namespace, bucket);
  }
  return bucket;
}

/** Returns true when the request is within the limit. */
export function checkRateLimit(
  namespace: string,
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const buckets = store(namespace);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/** @internal test helper */
export function resetRateLimits(namespace?: string) {
  if (namespace) stores.delete(namespace);
  else stores.clear();
}
