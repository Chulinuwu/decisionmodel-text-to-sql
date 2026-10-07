import type { DatabaseSchema, Field, Literal, RelationName } from '../../shared/query-schema.js';
import { literalCandidates } from '../literal-candidates.js';
import { fieldColumn, reachableRelations } from '../schema-graph.js';
import type { Resolver, Span } from './planning.types.js';

export function resolverFor(schema: DatabaseSchema, root: RelationName): Resolver {
  const reachable = reachableRelations(schema, root);
  return {
    root,
    field: (fields, accepts = () => true) => {
      const usable = fields.filter(accepts);
      return usable.find(field => field.relation === root) ?? usable.find(field => reachable.has(field.relation)) ?? null;
    },
    reaches: field => reachable.has(field.relation),
  };
}

// Scoping to the slot span keeps repeated values (two "20"s, "SP or SP") bound to their own occurrence.
export function questionLiteral(question: string, schema: DatabaseSchema, field: Field, span: Span, matches: (literal: Literal) => boolean) {
  return literalCandidates(question, fieldColumn(schema, field), { start: span.start, end: span.end }).find(literal => literal.source === 'question' && literal.start === span.start && literal.text === span.text && matches(literal)) ?? null;
}

export function datasetLiteral(schema: DatabaseSchema, field: Field, value: string): Literal | null {
  return fieldColumn(schema, field).values.includes(value) ? { value, source: 'dataset', text: value, start: null, end: null } : null;
}

export const containsValue = (schema: DatabaseSchema, value: string) => (field: Field) => fieldColumn(schema, field).values.includes(value);
