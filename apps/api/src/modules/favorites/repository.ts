export interface ApiFavoritesRepository {
  getByUserId(userId: string): Promise<readonly string[]>;
  replaceForUser(userId: string, propertyIds: readonly string[]): Promise<readonly string[]>;
  mergeForUser(userId: string, incomingIds: readonly string[]): Promise<readonly string[]>;
  toggleForUser(userId: string, propertyId: string): Promise<readonly string[]>;
}

function dedupe(ids: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return Object.freeze(out);
}

export function createInMemoryFavoritesRepository(): ApiFavoritesRepository {
  const byUser = new Map<string, readonly string[]>();

  return {
    async getByUserId(userId) {
      return byUser.get(userId) ?? Object.freeze([]);
    },
    async replaceForUser(userId, propertyIds) {
      const next = dedupe(propertyIds);
      byUser.set(userId, next);
      return next;
    },
    async mergeForUser(userId, incomingIds) {
      const existing = byUser.get(userId) ?? [];
      const merged = dedupe([...existing, ...incomingIds]);
      byUser.set(userId, merged);
      return merged;
    },
    async toggleForUser(userId, propertyId) {
      const target = propertyId.trim();
      const existing = byUser.get(userId) ?? [];
      const next = existing.includes(target)
        ? Object.freeze(existing.filter((id) => id !== target))
        : dedupe([...existing, target]);
      byUser.set(userId, next);
      return next;
    },
  };
}
