import { randomBytes } from 'node:crypto';
import type { MeterConversation } from '../../shared/meter-api.js';
import { config } from '../config.js';

export class MeterContextStore {
  private readonly entries = new Map<string, { value: MeterConversation; expires: number }>();
  constructor(private readonly now = Date.now) {}
  get(id: string) {
    const entry = this.entries.get(id);
    if (!entry || entry.expires <= this.now()) { this.entries.delete(id); return null; }
    return structuredClone(entry.value);
  }
  save(value: MeterConversation) {
    for (const [id, entry] of this.entries) if (entry.expires <= this.now()) this.entries.delete(id);
    while (this.entries.size >= config.offerLimit) this.entries.delete(this.entries.keys().next().value!);
    const id = randomBytes(16).toString('hex');
    this.entries.set(id, { value: structuredClone(value), expires: this.now() + config.offerTtlMs });
    return id;
  }
}
