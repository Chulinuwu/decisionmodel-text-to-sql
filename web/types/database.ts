import type { MeterDataset } from '../../shared/meter-api';
import type { DatasetInfo } from '../../shared/schema';

// description is the one-line sidebar summary; about and examples belong to the browse dialog.
type DatabaseBase = { id: string; name: string; description: string; about: string; examples: readonly string[]; placeholder: string };
export type ChatDatabase = DatabaseBase & { engine: 'chat'; endpoints: { detail: string; query: string; execute: string } };
export type MeterDatabase = DatabaseBase & { engine: 'meter'; endpoints: { detail: string; query: string } };
export type DatabaseEntry = ChatDatabase | MeterDatabase;

export type DatabaseDetail = { engine: 'chat'; info: DatasetInfo } | { engine: 'meter'; info: MeterDataset };
export type DatabaseDetailState =
  | { status: 'loading' }
  | { status: 'ready'; data: DatabaseDetail }
  | { status: 'error'; message: string };
export type DatabaseStatus = 'loading' | 'ready' | 'offline';
