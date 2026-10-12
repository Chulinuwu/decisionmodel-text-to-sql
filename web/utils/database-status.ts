import type { DatabaseDetailState, DatabaseStatus } from '../types/database';

// A loaded chat dataset can still report its PostgreSQL tables as not ready; the meter fixture is ready once it loads.
export function databaseStatus(state: DatabaseDetailState): DatabaseStatus {
  if (state.status === 'loading') return 'loading';
  return state.status === 'ready' && (state.data.engine === 'meter' || state.data.info.ready) ? 'ready' : 'offline';
}
