import type { MeterResponse } from '../../shared/meter-api';

export function nextMeterContextId(current: string | undefined, response: MeterResponse) {
  if (response.status === 'ok') return response.contextId;
  return response.contextReset ? undefined : current;
}
