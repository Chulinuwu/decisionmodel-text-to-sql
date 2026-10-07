import type { Literal, Predicate } from '../../shared/query-schema.js';
import type { BuildContext, Combo, Distributions, EnumGroup, NumberOperator, NumberUse, Resolver, SlotPredicates, Span, ValueLink } from './planning.types.js';
import { containsValue, datasetLiteral, questionLiteral } from './field-resolution.js';
import { numberOperators } from './catalog-config.js';
import { planningLimits } from './planning-limits.js';

const isNumberOperator = (key: string | undefined): key is NumberOperator => key !== undefined && key in numberOperators;
const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

class EnumGroups {
  private readonly groups = new Map<string, EnumGroup>();
  add(field: EnumGroup['field'], operator: EnumGroup['operator'], literal: Literal, fromLink: boolean) {
    const key = `${field.relation}.${field.column}:${operator}`, group = this.groups.get(key) ?? { field, operator, values: [] };
    // A linked value restates a value the question may already contain verbatim; only add it when it is new.
    if (fromLink && group.values.some(existing => existing.value === literal.value)) return;
    group.values.push(literal);
    this.groups.set(key, group);
  }
  predicates(): Predicate[] | null {
    const result: Predicate[] = [];
    for (const { field, operator, values } of this.groups.values()) {
      if (values.length > planningLimits.maxInValues) return null;
      const [first] = values;
      if (values.length === 1 && first) result.push({ field, operator, value: first });
      else result.push({ field, operator: operator === 'eq' ? 'in' : 'not_in', values });
    }
    return result;
  }
}

function linkedValues(link: ValueLink, combo: Combo, distributions: Distributions) {
  const chosen = combo[link.questionId], mode = combo[link.modeId] ?? 'eq';
  const value = chosen === undefined || chosen === 'none' ? undefined : link.values.get(chosen);
  if (value === undefined) return null;
  const several = mode === 'eq_several' || mode === 'ne_several';
  const keys = several ? (distributions[link.questionId] ?? []).filter(option => option.key !== 'none' && option.p >= planningLimits.linkFloor).map(option => option.key) : [];
  const values = [value, ...keys.flatMap(key => link.values.get(key) ?? [])];
  return { values: [...new Set(values)], operator: mode.startsWith('ne') ? 'ne' as const : 'eq' as const };
}

function addLinks(ctx: BuildContext, combo: Combo, resolver: Resolver, groups: EnumGroups) {
  for (const link of ctx.space.links) {
    const linked = linkedValues(link, combo, ctx.distributions);
    if (!linked) continue;
    for (const value of linked.values) {
      const field = resolver.field(link.dimension.fields, containsValue(ctx.schema, value));
      const literal = field && datasetLiteral(ctx.schema, field, value);
      if (!field || !literal) return false;
      groups.add(field, linked.operator, literal, true);
    }
  }
  return true;
}

// Cross-field conditions are always ANDed; a question meaning "state SP or category X" is a known limit of this grammar.
export function slotPredicates(ctx: BuildContext, combo: Combo, resolver: Resolver): SlotPredicates | null {
  const { question, schema, space } = ctx;
  const predicates: Predicate[] = [], numberUses: NumberUse[] = [], used: Span[] = [];
  const groups = new EnumGroups();
  for (const [index, slot] of space.slots.entries()) {
    const binding = space.slotBindings[index]?.get(combo[`slot_${index}`] ?? 'not_filter') ?? { kind: 'none' };
    if (slot.kind === 'number') numberUses.push({ value: slot.value, use: binding.kind === 'limit' ? 'limit' : binding.kind === 'number' ? 'filter' : 'none' });
    if (binding.kind === 'none') continue;
    // One token (a bare 4-digit year-like number) may surface as two slots; it can carry only one meaning.
    if (used.some(span => overlaps(span, slot))) return null;
    used.push(slot);
    if (binding.kind === 'limit') continue;
    if (binding.kind === 'period') {
      const field = resolver.field(binding.anchor.fields);
      const value = field && questionLiteral(question, schema, field, slot, literal => literal.upper !== undefined);
      if (!field || !value) return null;
      predicates.push({ field, operator: 'period', value });
    } else if (binding.kind === 'number') {
      const operator = combo[`slot_${index}_op`];
      if (!resolver.reaches(binding.target.field) || !isNumberOperator(operator)) return null;
      const value = questionLiteral(question, schema, binding.target.field, slot, literal => typeof literal.value === 'number');
      if (!value) return null;
      predicates.push({ field: binding.target.field, operator, value });
    } else if (binding.kind === 'quoted') {
      const field = resolver.field(binding.target.fields);
      const value = field && slot.kind === 'quoted' ? questionLiteral(question, schema, field, slot, literal => literal.value === slot.value) : null;
      if (!field || !value) return null;
      predicates.push({ field, operator: binding.operator, value });
    } else if (slot.kind === 'enum') {
      const field = resolver.field(binding.dimension.fields, containsValue(schema, slot.value));
      const value = field && datasetLiteral(schema, field, slot.value);
      if (!field || !value) return null;
      groups.add(field, binding.operator, value, false);
    } else return null;
  }
  if (!addLinks(ctx, combo, resolver, groups)) return null;
  const grouped = groups.predicates();
  if (!grouped) return null;
  predicates.push(...grouped);
  return predicates.length > planningLimits.maxPredicates ? null : { predicates, numberUses };
}

export function waivedSpans(space: BuildContext['space'], combo: Combo, distributions: Distributions): Span[] {
  return space.slots.flatMap((slot, index) => {
    const id = `slot_${index}`, key = combo[id] ?? 'not_filter';
    const p = distributions[id]?.find(option => option.key === key)?.p ?? 0;
    return key === 'not_filter' && (slot.kind === 'enum' || slot.kind === 'quoted') && p >= planningLimits.waiveFloor ? [slot] : [];
  });
}
