import { z } from 'zod';

export const relationNames = ['orders', 'items', 'customers', 'products', 'sellers', 'payments', 'reviews', 'geolocation', 'category_translation'] as const;
export const relativePeriodKinds = ['latest_month', 'previous_month', 'latest_year', 'previous_year', 'coverage'] as const;
export const fieldSchema = z.object({ relation: z.enum(relationNames), column: z.string().regex(/^[a-z_]+$/) }).strict();
export const expressionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('column'), field: fieldSchema }).strict(),
  z.object({ kind: z.literal('aggregate'), fn: z.enum(['count', 'sum', 'avg', 'min', 'max']), field: fieldSchema.nullable(), distinct: z.boolean() }).strict(),
  z.object({ kind: z.literal('bucket'), field: fieldSchema, unit: z.enum(['day', 'month', 'year']) }).strict(),
]);
export const literalSchema = z.object({
  value: z.union([z.string(), z.number()]), source: z.enum(['question', 'dataset', 'relative']),
  text: z.string(), start: z.number().int().min(0).nullable(), end: z.number().int().min(0).nullable(),
  upper: z.string().optional(),
}).strict();
export const comparisonOperators = ['gt', 'gte', 'lt', 'lte', 'eq', 'ne'] as const;
export const predicateSchema = z.union([
  z.object({ field: fieldSchema, operator: z.enum(['is_null', 'not_null']) }).strict(),
  z.object({ field: fieldSchema, operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'period']), value: literalSchema }).strict(),
  z.object({ field: fieldSchema, operator: z.enum(['in', 'not_in']), values: z.array(literalSchema).min(2).max(10) }).strict(),
  z.object({ field: fieldSchema, operator: z.enum(comparisonOperators), other: fieldSchema }).strict(),
]);
const relationSchema = z.enum(relationNames);
const joinsSchema = z.array(z.string().regex(/^[a-z_]+$/)).max(3);
const whereSchema = z.object({ connector: z.enum(['and', 'or']), predicates: z.array(predicateSchema).max(4) }).strict();
const limitSchema = z.number().int().min(1).max(100);
export const selectPlanSchema = z.object({
  kind: z.literal('select'), from: relationSchema,
  select: z.array(expressionSchema).min(1).max(6), joins: joinsSchema, where: whereSchema,
  groupBy: z.array(expressionSchema).max(2),
  orderBy: z.object({ expression: expressionSchema, direction: z.enum(['asc', 'desc']) }).strict().nullable(),
  limit: limitSchema,
}).strict();
export const anomalyPlanSchema = z.object({
  kind: z.literal('anomaly'), from: relationSchema, joins: joinsSchema, where: whereSchema,
  unit: expressionSchema, measure: expressionSchema, direction: z.enum(['both', 'high', 'low']), limit: limitSchema,
}).strict();
export const periodChangePlanSchema = z.object({
  kind: z.literal('period_change'), from: relationSchema, joins: joinsSchema, where: whereSchema,
  measure: expressionSchema, anchor: fieldSchema, current: literalSchema, previous: literalSchema.nullable(),
  groupBy: z.array(expressionSchema).max(1),
  orderBy: z.enum(['change_desc', 'change_asc', 'pct_desc', 'pct_asc']).nullable(),
  limit: limitSchema,
}).strict();
export const queryPlanSchema = z.discriminatedUnion('kind', [selectPlanSchema, anomalyPlanSchema, periodChangePlanSchema]);

export type RelationName = typeof relationNames[number];
export type RelativePeriodKind = typeof relativePeriodKinds[number];
export type Field = z.infer<typeof fieldSchema>;
export type Expression = z.infer<typeof expressionSchema>;
export type Literal = z.infer<typeof literalSchema>;
export type Predicate = z.infer<typeof predicateSchema>;
export type SelectPlan = z.infer<typeof selectPlanSchema>;
export type AnomalyPlan = z.infer<typeof anomalyPlanSchema>;
export type PeriodChangePlan = z.infer<typeof periodChangePlanSchema>;
export type Plan = z.infer<typeof queryPlanSchema>;
export type Column = { name: string; type: 'text' | 'number' | 'timestamp' | 'date'; nullable: boolean; description: string; values: string[] };
export type Relation = { name: RelationName; description: string; grain: string; columns: Column[] };
export type JoinEdge = { id: string; from: RelationName; to: RelationName; fromColumn: string; toColumn: string; cardinality: 'many-to-one' };
export type Coverage = { start: string; end: string };
export type DatabaseSchema = { relations: Relation[]; edges: JoinEdge[]; coverage: Coverage };
