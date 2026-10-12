import { browseRelations } from './browse-config.js';

// Object.hasOwn keeps inherited keys such as "constructor" or "__proto__" from resolving to a relation.
export function browseRelation(databaseId: string, table: string): string | undefined {
  const tables = Object.hasOwn(browseRelations, databaseId) ? browseRelations[databaseId] : undefined;
  return tables && Object.hasOwn(tables, table) ? tables[table] : undefined;
}
