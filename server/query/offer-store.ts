import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import type { Interpretation } from '../../shared/schema.js';
import type { Offer, OfferStoreOptions } from './query.types.js';

export function createOfferStore({ limit, ttlMs, now = Date.now }: OfferStoreOptions) {
  const offers = new Map<string, Offer>();
  const expired = (offer: Offer) => now() - offer.createdAt > ttlMs;

  // Map iteration follows insertion order, so the first entries are always the oldest.
  function prune() {
    for (const [id, offer] of offers) {
      if (!expired(offer) && offers.size < limit) return;
      offers.delete(id);
    }
  }

  return {
    save(question: string, interpretations: Interpretation[]) {
      prune();
      const id = randomUUID().replaceAll('-', '');
      offers.set(id, { question, interpretations, createdAt: now() });
      return id;
    },
    find(id: string) {
      const offer = offers.get(id);
      if (offer && expired(offer)) offers.delete(id);
      return offer && !expired(offer) ? offer : undefined;
    },
    get size() { return offers.size; },
  };
}

export const offers = createOfferStore({ limit: config.offerLimit, ttlMs: config.offerTtlMs });
