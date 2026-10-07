import type { Combo, Distributions, HeapEntry, Option } from './planning.types.js';
import { planningLimits } from './planning-limits.js';

function prune(options: Option[]) {
  const kept = options.filter(option => option.p >= planningLimits.minOptionProbability).slice(0, planningLimits.maxOptionsPerQuestion);
  const forced = options.filter(option => option.keep && !kept.includes(option));
  const room = Math.max(planningLimits.maxOptionsPerQuestion - forced.length, 0);
  const result = [...kept.slice(0, room), ...forced].sort((a, b) => b.p - a.p);
  return result.length ? result : options.slice(0, 1);
}

class MaxHeap {
  private readonly items: HeapEntry[] = [];
  get size() { return this.items.length; }
  push(entry: HeapEntry) {
    const items = this.items;
    items.push(entry);
    for (let index = items.length - 1; index > 0;) {
      const parent = (index - 1) >> 1;
      if (items[parent].score >= items[index].score) break;
      [items[parent], items[index]] = [items[index], items[parent]];
      index = parent;
    }
  }
  pop() {
    const items = this.items, top = items[0], last = items.pop();
    if (!top || !last || !items.length) return top;
    items[0] = last;
    for (let index = 0; ;) {
      const left = index * 2 + 1, right = left + 1;
      let largest = index;
      if (left < items.length && items[left].score > items[largest].score) largest = left;
      if (right < items.length && items[right].score > items[largest].score) largest = right;
      if (largest === index) break;
      [items[largest], items[index]] = [items[index], items[largest]];
      index = largest;
    }
    return top;
  }
}

// Best-first enumeration of the product space by joint log-probability. canonicalKey returns null for a combo that
// yields no valid plan; such combos never count toward maxCombos, and combos sharing a key (choices irrelevant to the
// plan) count once. Total work is bounded by maxBeamPops.
export function enumerateCombos(distributions: Distributions, canonicalKey: (combo: Combo) => string | null): Combo[] {
  const ids = Object.keys(distributions), options = ids.map(id => prune(distributions[id]));
  const scoreOf = (indices: number[]) => indices.reduce((sum, choice, position) => sum + Math.log(Math.max(options[position][choice].p, 1e-9)), 0);
  const heap = new MaxHeap(), seen = new Set<string>(), result: Combo[] = [];
  const start = ids.map(() => 0);
  heap.push({ indices: start, score: scoreOf(start) });
  for (let pops = 0; heap.size && pops < planningLimits.maxBeamPops && result.length < planningLimits.maxCombos; pops++) {
    const entry = heap.pop();
    if (!entry) break;
    const combo: Combo = Object.fromEntries(ids.map((id, position) => [id, options[position][entry.indices[position]].key]));
    const key = canonicalKey(combo);
    if (key !== null && !seen.has(key)) { seen.add(key); result.push(combo); }
    const pivot = entry.indices.reduce((last, choice, position) => choice > 0 ? position : last, 0);
    for (let position = pivot; position < ids.length; position++) {
      if (entry.indices[position] + 1 >= options[position].length) continue;
      const indices = [...entry.indices];
      indices[position]++;
      heap.push({ indices, score: scoreOf(indices) });
    }
  }
  return result;
}
