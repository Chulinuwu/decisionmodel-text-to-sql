import type { DatabaseSchema, Field } from '../../shared/query-schema.js';
import type { Question } from '../decision-schema.js';
import type { Catalog, Condition, DecisionAnswers, DetailQuestions, DetailSpace, Distributions, ListMeasure, MissingBinding, ShapeSpace, Slot, SlotBinding, ValueLink } from './planning.types.js';
import { analysisCriteria, analysisInstructions, detailColumnInstruction, detailCriteria, detailSortInstruction, detailSortNone, enumInstruction, linkInstruction, linkModeInstruction, linkModes, numberInstruction, numberOperatorInstruction, periodInstruction, quotedInstruction, shapeCriteria, shapeInstructions } from './decision-prompts.js';
import { analyses, anomalyDirections, changeOrders, entityLabels, unlinkedDimensions, limitWords, numberOperators, operations, orderChoices, relativeChoices } from './catalog-config.js';
import { planningLimits } from './planning-limits.js';
import { dimensionValues, fieldLabel } from './semantic-catalog.js';

const choice = (instructions: string, criteria: Record<string, string>): Question => ({ type: 'choice', instructions, criteria });

function slotQuestion(slot: Slot, catalog: Catalog) {
  const bindings = new Map<string, SlotBinding>([['not_filter', { kind: 'none' }]]);
  const criteria: Record<string, string> = { not_filter: shapeCriteria.notFilter };
  const add = (key: string, text: string, binding: SlotBinding) => { criteria[key] = text; bindings.set(key, binding); };
  if (slot.kind === 'period') for (const anchor of catalog.anchors) add(`a_${anchor.id}`, anchor.label.en, { kind: 'period', anchor });
  if (slot.kind === 'number') {
    // Short index keys keep repeated per-number option lists inside the payload budget.
    catalog.numericFields.forEach((target, index) => add(`f${index}`, target.label.en, { kind: 'number', target }));
    add('limit_value', shapeCriteria.limitValue, { kind: 'limit' });
  }
  if (slot.kind === 'enum') for (const dimension of slot.dimensions) {
    add(`${dimension.id}_eq`, `${dimension.label.en} is ${slot.value}`, { kind: 'enum', dimension, operator: 'eq' });
    add(`${dimension.id}_ne`, `${dimension.label.en} is not ${slot.value}`, { kind: 'enum', dimension, operator: 'ne' });
  }
  if (slot.kind === 'quoted') for (const target of catalog.textTargets) {
    add(`${target.id}_contains`, `${target.label.en} contains`, { kind: 'quoted', target, operator: 'contains' });
    add(`${target.id}_eq`, `${target.label.en} equals`, { kind: 'quoted', target, operator: 'eq' });
  }
  const instruction = slot.kind === 'period' ? periodInstruction(slot.text) : slot.kind === 'number' ? numberInstruction(slot.text) : slot.kind === 'enum' ? enumInstruction(slot.text) : quotedInstruction(slot.text);
  return { question: choice(instruction, criteria), bindings };
}

function limitOptions(question: string, slots: Slot[]) {
  const limits = new Map<string, number | null>([['default', null], ['one', 1]]);
  const values = slots.flatMap(slot => slot.kind === 'number' && Number.isInteger(slot.value) ? [slot.value] : []);
  for (const [word, value] of Object.entries(limitWords)) if (new RegExp(`\\b${word}\\b`, 'i').test(question)) values.push(value);
  for (const value of values) if (value >= 2 && value <= planningLimits.maxLimit) limits.set(`n_${value}`, value);
  return limits;
}

// Value linking lets Clef map any wording ("ยกเลิก", "credit card") to a dataset value without a synonym table.
function valueLinks(schema: DatabaseSchema, catalog: Catalog): ValueLink[] {
  return catalog.dimensions.filter(dimension => dimension.unit === null && !unlinkedDimensions.includes(dimension.id)).flatMap(dimension => {
    const values = dimensionValues(schema, dimension);
    if (!values.length) return [];
    return [{ dimension, questionId: `link_${dimension.id}`, modeId: `link_${dimension.id}_mode`, values: new Map(values.map((value, index) => [/^[A-Za-z0-9_]{1,40}$/.test(value) && value !== 'none' ? value : `v_${index}`, value])) }];
  });
}

export function buildShapeQuestions(question: string, schema: DatabaseSchema, catalog: Catalog, slots: Slot[]) {
  const groups = { none: shapeCriteria.noGroup, ...Object.fromEntries(catalog.dimensions.map(dimension => [dimension.id, dimension.label.en])) };
  const missing = new Map<string, MissingBinding>([['none', null]]);
  for (const anchor of catalog.anchors) {
    missing.set(`${anchor.id}_is_null`, { anchor, operator: 'is_null' });
    missing.set(`${anchor.id}_not_null`, { anchor, operator: 'not_null' });
  }
  const limits = limitOptions(question, slots);
  const questions: Record<string, Question> = {
    target: choice(shapeInstructions.target, { ...Object.fromEntries(catalog.measures.map(measure => [measure.id, measure.label.en])), ...Object.fromEntries(catalog.intents.map(intent => [intent.id, intent.en])) }),
    operation: choice(shapeInstructions.operation, Object.fromEntries(Object.entries(operations).map(([key, entry]) => [key, entry.en]))),
    group1: choice(shapeInstructions.group1, groups),
    group2: choice(shapeInstructions.group2, groups),
    order: choice(shapeInstructions.order, orderChoices),
    limit: choice(shapeInstructions.limit, Object.fromEntries([...limits].map(([key, value]) => [key, value === null ? shapeCriteria.noLimit : value === 1 ? shapeCriteria.oneRow : shapeCriteria.topRows(value)]))),
    missing: choice(shapeInstructions.missing, Object.fromEntries([...missing].map(([key, binding]) => [key, binding ? `${binding.operator === 'is_null' ? 'no' : 'has'} ${binding.anchor.label.en}` : shapeCriteria.noMissing]))),
  };
  const slotBindings = slots.map((slot, index) => {
    const built = slotQuestion(slot, catalog);
    questions[`slot_${index}`] = built.question;
    if (slot.kind === 'number') questions[`slot_${index}_op`] = choice(numberOperatorInstruction(slot.text), numberOperators);
    return built.bindings;
  });
  const links = valueLinks(schema, catalog);
  for (const link of links) {
    questions[link.questionId] = choice(linkInstruction(link.dimension.label.en), { none: shapeCriteria.noLink, ...Object.fromEntries([...link.values].map(([key, value]) => [key, value.replaceAll('_', ' ')])) });
    questions[link.modeId] = choice(linkModeInstruction(link.dimension.label.en), linkModes);
  }
  const conditions = new Map<string, Condition | null>([['none', null], ...catalog.conditions.map((condition): [string, Condition] => [condition.id, condition])]);
  Object.assign(questions, {
    analysis: choice(analysisInstructions.analysis, analyses),
    relative_period: choice(analysisInstructions.relative, { none: analysisCriteria.noRelative, ...relativeChoices }),
    condition: choice(analysisInstructions.condition, Object.fromEntries([...conditions].map(([key, condition]) => [key, condition ? condition.label.en : analysisCriteria.noCondition]))),
    anomaly_direction: choice(analysisInstructions.direction, anomalyDirections),
    change_order: choice(analysisInstructions.changeOrder, { none: analysisCriteria.noChangeOrder, ...changeOrders }),
  });
  const space: ShapeSpace = { slots, slotBindings, missing, limits, links, conditions };
  return { questions, space };
}

export function buildDetailQuestions(measures: ListMeasure[], schema: DatabaseSchema) {
  const questions: Record<string, Question> = {}, built: DetailQuestions[] = [];
  for (const measure of measures) {
    const relation = schema.relations.find(entry => entry.name === measure.root);
    if (!relation) throw new Error('List measure root is missing from the schema');
    const entity = entityLabels[measure.root].en, sortId = `${measure.id}__sort`;
    const columns = relation.columns.map(column => ({ field: { relation: measure.root, column: column.name }, column })).filter(({ field }) => !measure.keys.some(key => key.column === field.column));
    const fields = columns.map(({ field }, index) => ({ field, questionId: `${measure.id}__col_${index}` }));
    for (const { field, questionId } of fields) questions[questionId] = { type: 'noul', instructions: detailColumnInstruction(fieldLabel(field).en, entity), criteria: detailCriteria };
    const sortFields = new Map<string, Field | null>([['none', null]]);
    for (const { field, column } of columns) if (column.type !== 'text') sortFields.set(`s_${field.column}`, field);
    questions[sortId] = choice(detailSortInstruction, Object.fromEntries([...sortFields].map(([key, field]) => [key, field ? fieldLabel(field).en : detailSortNone])));
    built.push({ measure, sortId, fields, sortFields });
  }
  return { questions, built };
}

export function parseDetails(answers: DecisionAnswers, built: DetailQuestions[]) {
  return new Map(built.map((entry): [string, DetailSpace] => {
    const columns = entry.fields.flatMap(({ field, questionId }) => {
      const answer = answers[questionId];
      return answer?.type === 'noul' && answer.noul >= planningLimits.detailDisplay ? [{ field, p: answer.noul }] : [];
    }).sort((a, b) => b.p - a.p).map(column => column.field);
    return [entry.measure.id, { measure: entry.measure, sortId: entry.sortId, columns, sortFields: entry.sortFields }];
  }));
}

export function toDistributions(answers: DecisionAnswers, questions: Record<string, Question>): Distributions {
  const result: Distributions = {};
  for (const [id, question] of Object.entries(questions)) {
    const answer = answers[id];
    if (question.type !== 'choice' || answer?.type !== 'choice') continue;
    const options = Object.entries(answer.probabilities).filter(([key]) => key in question.criteria).map(([key, p]) => ({ key, p })).sort((a, b) => b.p - a.p);
    result[id] = options.length ? options : [{ key: answer.choice, p: 1 }];
  }
  return result;
}
