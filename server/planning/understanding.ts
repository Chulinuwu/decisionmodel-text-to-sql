import type { Catalog, Distributions, ShapeSpace } from './planning.types.js';
import { messages } from './planning-messages.js';

// Explains the top reading of each decision so an unsupported answer still shows what the system understood.
export function understoodSummary(distributions: Distributions, catalog: Catalog, space: ShapeSpace) {
  const top = (id: string) => distributions[id]?.[0]?.key;
  const measure = catalog.measures.find(entry => entry.id === top('target'));
  const groups = ['group1', 'group2'].flatMap(id => catalog.dimensions.find(dimension => dimension.id === top(id))?.label.th ?? []);
  const values = space.slots.map(slot => slot.text);
  const parts = [
    measure ? `วัด ${measure.label.th}` : '',
    groups.length ? `แยกตาม ${[...new Set(groups)].join(' และ ')}` : '',
    values.length ? `ค่าที่พบในคำถาม ${values.join(', ')}` : '',
  ].filter(Boolean);
  return parts.length ? `${messages.understood}: ${parts.join('; ')}` : '';
}
