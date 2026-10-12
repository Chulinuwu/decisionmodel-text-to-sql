import { execute } from '../db-client.js';
import type { BrowsePage, TableRowsPage } from '../../shared/schema.js';

// ponytail: ORDER BY 1 is not a stable key on tables with repeated first-column values, so page edges can shift; order by the primary key when exact paging matters.
export async function tableRows(relation: string, { offset, limit }: BrowsePage): Promise<TableRowsPage> {
  const { columns, rows } = await execute(`SELECT * FROM ${relation} ORDER BY 1 LIMIT $1 OFFSET $2`, [limit + 1, offset]);
  return { columns, rows: rows.slice(0, limit), offset, limit, hasMore: rows.length > limit };
}
