import { pool } from './db-client.js';
import { relationNames, type Column, type DatabaseSchema } from '../shared/query-schema.js';
import { columnDescriptions, enumColumns, joinEdges, relationDescriptions } from './schema-config.js';
import { coverageWindow } from './coverage-window.js';

// Months without any order count as zero, so gaps inside the data range still enter the median.
const monthlyOrders = "SELECT to_char(m, 'YYYY-MM-DD') AS month, count(o.order_id)::int AS count FROM generate_series((SELECT date_trunc('month', min(purchased_at)) FROM analytics.orders), (SELECT date_trunc('month', max(purchased_at)) FROM analytics.orders), interval '1 month') AS m LEFT JOIN analytics.orders o ON date_trunc('month', o.purchased_at) = m GROUP BY m ORDER BY m";

let cached: DatabaseSchema | undefined;
export async function databaseSchema(): Promise<DatabaseSchema> {
  if (cached) return cached;
  const { rows } = await pool.query("SELECT c.relname relation, a.attname name, format_type(a.atttypid,a.atttypmod) sql_type, NOT a.attnotnull nullable FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='analytics' AND a.attnum>0 AND NOT a.attisdropped AND c.relname = ANY($1::text[]) ORDER BY c.relname,a.attnum", [relationNames]);
  const relations = relationNames.map(name => ({ name, ...relationDescriptions[name], columns: rows.filter(row => row.relation === name).map((row): Column => ({ name: row.name, type: /int|numeric|double|real/.test(row.sql_type) ? 'number' : row.sql_type.startsWith('timestamp') ? 'timestamp' : row.sql_type === 'date' ? 'date' : 'text', nullable: row.nullable, description: columnDescriptions[`${name}.${row.name}`] ?? row.name.replaceAll('_', ' '), values: [] })) }));
  if (relations.some(relation => !relation.columns.length)) throw new Error('Dataset schema incomplete. Re-run data import.');
  for (const relation of relations) {
    for (const column of relation.columns.filter(column => enumColumns[relation.name].includes(column.name))) {
      const result = await pool.query(`SELECT DISTINCT "${column.name}" value FROM analytics."${relation.name}" WHERE "${column.name}" IS NOT NULL ORDER BY 1 LIMIT 100`);
      column.values = result.rows.map(row => String(row.value));
    }
  }
  const months = await pool.query(monthlyOrders);
  cached = { relations, edges: joinEdges, coverage: coverageWindow(months.rows.map(row => ({ month: String(row.month), count: Number(row.count) }))) };
  return cached;
}
