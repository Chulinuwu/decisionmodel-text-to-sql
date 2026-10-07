import pg from 'pg';
import { config } from './config.js';
import type { DatasetInfo } from '../shared/schema.js';
import { databaseSchema } from './schema-client.js';

pg.types.setTypeParser(1082, value => value);
pg.types.setTypeParser(1114, value => value);

export const pool = new pg.Pool({ host: config.dbHost, port: config.dbPort, database: config.database, ...config.analyst, max: 4, connectionTimeoutMillis: 3000 });

export async function execute(sql: string, values: (string | number)[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query(`SET LOCAL statement_timeout = '${config.statementTimeoutMs}ms'`);
    const result = await client.query(sql, values);
    await client.query('COMMIT');
    return { columns: result.fields.map(field => field.name), rows: result.rows };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function datasetInfo(): Promise<DatasetInfo> {
  const [{ rows: [summary] }, { rows: tables }, schema] = await Promise.all([
    pool.query('SELECT count(*)::int orders, count(DISTINCT customer_unique_id)::int customers, sum(item_count)::int items, min(purchased_at)::date::text "minDate", max(purchased_at)::date::text "maxDate" FROM analytics.orders'),
    pool.query('SELECT name, row_count::int rows FROM analytics.import_manifest ORDER BY name'),
    databaseSchema(),
  ]);
  return { ...summary, tables, schema, source: config.datasetUrl, model: config.model, provider: config.provider, ready: true };
}
