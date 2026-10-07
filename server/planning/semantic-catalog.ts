import { relationNames, type DatabaseSchema, type Field } from '../../shared/query-schema.js';
import { fieldColumn } from '../schema-graph.js';
import type { Catalog, Condition, Dimension, FieldsConfig, Intent, Label, Measure, NumericField } from './planning.types.js';
import { anchors, categoricalDimensions, conditions, countMeasures, dateUnits, identityDimensions, excludedNumericColumns, excludedRelations, extraTextTargets, fieldLabels, intents, listMeasures, numericMeasures } from './catalog-config.js';
import { intentReasons } from './planning-messages.js';

export function fieldLabel(field: Field): Label {
  return fieldLabels[`${field.relation}.${field.column}`] ?? fieldLabels[field.column] ?? { th: field.column, en: field.column.replaceAll('_', ' ') };
}

function parseField(schema: DatabaseSchema, text: string): Field {
  const [relation, column] = text.split('.');
  const name = relationNames.find(candidate => candidate === relation);
  if (!name || !column) throw new Error(`Semantic config field ${text} is malformed`);
  const field = { relation: name, column };
  try { fieldColumn(schema, field); } catch { throw new Error(`Semantic config field ${text} is missing from the introspected schema`); }
  return field;
}

const label = (entry: { th: string; en: string }): Label => ({ th: entry.th, en: entry.en });
const fieldsOf = (schema: DatabaseSchema, entry: FieldsConfig) => entry.fields.map(text => parseField(schema, text));

function intentList(): Intent[] {
  return intents.map(entry => {
    const reason = intentReasons[entry.id];
    if (!reason) throw new Error(`Intent ${entry.id} has no user-facing reason`);
    return { id: entry.id, en: entry.en, reason };
  });
}

function conditionList(schema: DatabaseSchema): Condition[] {
  return conditions.flatMap(entry => {
    const field = parseField(schema, entry.field), other = parseField(schema, entry.other);
    return [
      { id: entry.id, label: { th: entry.th, en: entry.en }, field, operator: entry.operator, other },
      { id: `${entry.id}_not`, label: { th: entry.negated.th, en: entry.negated.en }, field, operator: entry.negated.operator, other },
    ];
  });
}

function build(schema: DatabaseSchema): Catalog {
  const measures: Measure[] = [
    ...countMeasures.map((entry): Measure => ({ kind: 'count', id: entry.id, label: label(entry), realizations: entry.realizations.map(realization => ({ root: realization.root, field: realization.field ? parseField(schema, realization.field) : null })) })),
    ...numericMeasures.map((entry): Measure => ({ kind: 'numeric', id: entry.id, label: label(entry), realizations: fieldsOf(schema, entry).map(field => ({ root: field.relation, field })) })),
  ];
  const curated = new Set(numericMeasures.flatMap(entry => entry.fields));
  for (const relation of schema.relations.filter(relation => !excludedRelations.includes(relation.name))) for (const column of relation.columns) {
    if (column.type !== 'number' || excludedNumericColumns.includes(column.name) || curated.has(`${relation.name}.${column.name}`)) continue;
    const field = { relation: relation.name, column: column.name }, named = fieldLabel(field);
    measures.push({ kind: 'numeric', id: `${relation.name}_${column.name}`, label: { th: named.th, en: `${named.en}: ${column.description}` }, realizations: [{ root: relation.name, field }] });
  }
  measures.push(...listMeasures.map((entry): Measure => ({ kind: 'list', id: entry.id, label: label(entry), root: entry.root, keys: entry.keys.map(text => parseField(schema, text)) })));
  const anchorList = anchors.map(entry => ({ id: entry.id, label: label(entry), fields: fieldsOf(schema, entry) }));
  const categorical = categoricalDimensions.map((entry): Dimension => ({ id: entry.id, label: label(entry), fields: fieldsOf(schema, entry), unit: null, identity: false }));
  const identities = identityDimensions.map((entry): Dimension => ({ id: entry.id, label: label(entry), fields: fieldsOf(schema, entry), unit: null, identity: true }));
  const dates = anchorList.flatMap(anchor => (['month', 'year', 'day'] as const).map((unit): Dimension => ({ id: `${unit}_${anchor.id}`, label: { th: `${dateUnits[unit].th}ของ${anchor.label.th}`, en: `${dateUnits[unit].en} of ${anchor.label.en}` }, fields: anchor.fields, unit, identity: false })));
  // Only each measure's canonical (first) field is a filter target, so one meaning never appears as two options.
  const numericFields = [...new Map(measures.flatMap(measure => {
    const first = measure.kind === 'numeric' ? measure.realizations[0] : undefined;
    return first ? [{ id: `${first.field.relation}_${first.field.column}`, label: fieldLabel(first.field), field: first.field } satisfies NumericField] : [];
  }).map(entry => [entry.id, entry])).values()];
  return {
    measures, intents: intentList(), anchors: anchorList, dimensions: [...categorical, ...identities, ...dates], numericFields, conditions: conditionList(schema),
    textTargets: [...categorical.filter(dimension => dimension.fields.every(field => fieldColumn(schema, field).type === 'text')), ...extraTextTargets.map(entry => ({ id: entry.id, label: label(entry), fields: fieldsOf(schema, entry) }))],
  };
}

const cache = new WeakMap<DatabaseSchema, Catalog>();
export function buildCatalog(schema: DatabaseSchema) {
  const cached = cache.get(schema);
  if (cached) return cached;
  const catalog = build(schema);
  cache.set(schema, catalog);
  return catalog;
}

export function dimensionValues(schema: DatabaseSchema, dimension: Dimension) {
  return [...new Set(dimension.fields.flatMap(field => fieldColumn(schema, field).values))];
}
