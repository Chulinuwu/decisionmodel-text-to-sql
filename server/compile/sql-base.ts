import type { DatabaseSchema, Plan } from '../../shared/query-schema.js';
import { expressionSql, fieldSql } from '../expression.js';
import { predicateSql } from '../predicate.js';
import { requiredJoins } from '../schema-graph.js';
import type { SqlBase } from './compile.types.js';

export function sqlBase(plan: Plan, schema: DatabaseSchema, question: string): SqlBase {
  const joins = requiredJoins(plan, schema);
  if (JSON.stringify(joins) !== JSON.stringify(plan.joins)) throw new Error('Join paths must exactly match declared required edges');
  const values: (string | number)[] = [];
  const bind = (value: string | number) => { values.push(value); return `$${values.length}`; };
  const joinSql = joins.map(id => {
    const edge = schema.edges.find(entry => entry.id === id);
    if (!edge) throw new Error('Unknown join edge');
    return `LEFT JOIN analytics."${edge.to}" AS "${edge.to}" ON ${fieldSql({ relation: edge.from, column: edge.fromColumn })} = ${fieldSql({ relation: edge.to, column: edge.toColumn })}`;
  });
  const predicates = plan.where.predicates.map(predicate => predicateSql(predicate, question, schema, bind));
  const filter = predicates.length ? [`(${predicates.join(` ${plan.where.connector.toUpperCase()} `)})`] : [];
  return {
    values, bind,
    render: expression => expressionSql(expression, plan.from, schema),
    from: [`FROM analytics."${plan.from}" AS "${plan.from}"`, ...joinSql],
    where: (extra = []) => [...filter, ...extra].length ? `WHERE ${[...filter, ...extra].join(' AND ')}` : '',
  };
}

export const grainOf = (plan: Plan, schema: DatabaseSchema) => schema.relations.find(relation => relation.name === plan.from)?.grain ?? plan.from;
