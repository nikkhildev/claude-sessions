import type { Session } from './types.js';

export function resolveSession(
  query: string,
  sessions: Session[],
): Session | null {
  if (!query || sessions.length === 0) return null;

  // 1. Exact UUID match
  const exact = sessions.find((s) => s.id === query);
  if (exact) return exact;

  // 2. Partial UUID prefix (minimum 4 chars)
  if (query.length >= 4 && /^[a-f0-9-]+$/i.test(query)) {
    const matches = sessions.filter((s) => s.id.startsWith(query));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return null; // Ambiguous
  }

  // 3. Custom name match
  const byName = sessions.find((s) => s.name === query);
  if (byName) return byName;

  // 4. Index number (#N, 1-based)
  if (query.startsWith('#')) {
    const idx = parseInt(query.slice(1), 10);
    if (!isNaN(idx) && idx >= 1 && idx <= sessions.length) {
      return sessions[idx - 1];
    }
    return null;
  }

  return null;
}
