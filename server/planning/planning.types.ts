import type { DatabaseSchema, Expression, Field, Literal, Plan, Predicate, RelationName, RelativePeriodKind } from '../../shared/query-schema.js';
import type { QueryResponse } from '../../shared/schema.js';
import type { DecisionResponse } from '../decision-schema.js';

export type Label = { th: string; en: string };
export type DateUnit = 'day' | 'month' | 'year';

type Configured = { id: string; th: string; en: string };
export type CountConfig = Configured & { realizations: { root: RelationName; field: string | null }[] };
export type FieldsConfig = Configured & { fields: string[] };
export type ListConfig = Configured & { root: RelationName; keys: string[] };
export type IntentConfig = { id: string; en: string };
export type ComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
export type ConditionConfig = { id: string; field: string; operator: ComparisonOperator; other: string; th: string; en: string; negated: { operator: ComparisonOperator; th: string; en: string } };
export type Analysis = 'select' | 'anomaly' | 'period_change';
export type ChangeOrder = 'change_desc' | 'change_asc' | 'pct_desc' | 'pct_asc';
export type RelativeChoice = Exclude<RelativePeriodKind, 'coverage'>;

export type CountMeasure = { kind: 'count'; id: string; label: Label; realizations: { root: RelationName; field: Field | null }[] };
export type NumericMeasure = { kind: 'numeric'; id: string; label: Label; realizations: { root: RelationName; field: Field }[] };
export type ListMeasure = { kind: 'list'; id: string; label: Label; root: RelationName; keys: Field[] };
export type Measure = CountMeasure | NumericMeasure | ListMeasure;
export type Intent = { id: string; en: string; reason: string };
export type Dimension = { id: string; label: Label; fields: Field[]; unit: DateUnit | null; identity: boolean };
export type Condition = { id: string; label: Label; field: Field; operator: ComparisonOperator; other: Field };
export type Anchor = { id: string; label: Label; fields: Field[] };
export type TextTarget = { id: string; label: Label; fields: Field[] };
export type NumericField = { id: string; label: Label; field: Field };
export type Catalog = { measures: Measure[]; intents: Intent[]; dimensions: Dimension[]; anchors: Anchor[]; textTargets: TextTarget[]; numericFields: NumericField[]; conditions: Condition[] };

export type Span = { text: string; start: number; end: number };
export type Slot =
  | ({ kind: 'period' } & Span)
  | ({ kind: 'number'; value: number } & Span)
  | ({ kind: 'enum'; value: string; dimensions: Dimension[] } & Span)
  | ({ kind: 'quoted'; value: string } & Span);

export type Operation = 'total' | 'average' | 'minimum' | 'maximum';
export type OrderChoice = 'none' | 'value_desc' | 'value_asc' | 'time_asc' | 'time_desc';
export type NumberOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
export type LinkMode = 'eq' | 'ne' | 'eq_several' | 'ne_several';
export type SlotBinding =
  | { kind: 'none' }
  | { kind: 'limit' }
  | { kind: 'period'; anchor: Anchor }
  | { kind: 'number'; target: NumericField }
  | { kind: 'enum'; dimension: Dimension; operator: 'eq' | 'ne' }
  | { kind: 'quoted'; target: TextTarget; operator: 'eq' | 'contains' };
export type MissingBinding = { anchor: Anchor; operator: 'is_null' | 'not_null' } | null;
export type ValueLink = { dimension: Dimension; questionId: string; modeId: string; values: Map<string, string> };

export type ShapeSpace = {
  slots: Slot[];
  slotBindings: Map<string, SlotBinding>[];
  missing: Map<string, MissingBinding>;
  limits: Map<string, number | null>;
  links: ValueLink[];
  conditions: Map<string, Condition | null>;
};
export type DetailSpace = { measure: ListMeasure; sortId: string; columns: Field[]; sortFields: Map<string, Field | null> };
export type DetailQuestions = { measure: ListMeasure; sortId: string; fields: { field: Field; questionId: string }[]; sortFields: Map<string, Field | null> };

export type DecisionAnswers = DecisionResponse['answers'];
// keep marks an option the beam must retain regardless of rank (the unlinked reading of an evidence-less value link).
export type Option = { key: string; p: number; keep?: boolean };
export type Distributions = Record<string, Option[]>;
export type Combo = Record<string, string>;
export type HeapEntry = { indices: number[]; score: number };

export type Resolver = {
  root: RelationName;
  field: (fields: Field[], accepts?: (field: Field) => boolean) => Field | null;
  reaches: (field: Field) => boolean;
};
export type BuildContext = { question: string; schema: DatabaseSchema; catalog: Catalog; space: ShapeSpace; details: Map<string, DetailSpace>; distributions: Distributions };
export type NumberUse = { value: number; use: 'filter' | 'limit' | 'none' };
export type SlotPredicates = { predicates: Predicate[]; numberUses: NumberUse[] };
export type EnumGroup = { field: Field; operator: 'eq' | 'ne'; values: Literal[] };
export type ValidatedPlan = { plan: Plan; key: string };
export type RankedCandidate = { plan: Plan; key: string; p: number };

type WithoutRequest<T> = T extends unknown ? Omit<T, 'question' | 'offerId'> : never;
type Answer = Extract<QueryResponse, { status: 'ok' }>;
export type PlanResult =
  | (Pick<Answer, 'status' | 'alternatives' | 'trace' | 'usage'> & { chosen: Answer['interpretation'] })
  | WithoutRequest<Extract<QueryResponse, { status: 'choose' }>>
  | WithoutRequest<Extract<QueryResponse, { status: 'unsupported' }>>;
export type PlanParts = { resolver: Resolver; groups: Expression[]; predicates: Predicate[]; limit: number; limitStated: boolean; relative: RelativeChoice | null };
