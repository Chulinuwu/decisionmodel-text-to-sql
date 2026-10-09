import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextMeterContextId } from './conversation';

const meta = { question: 'q', trace: [], usage: { input_tokens: 0, output_tokens: 0, cost: 0 }, provider: '' };

test('client replaces or drops a stale meter context instead of resending it', () => {
  const ok = { ...meta, status: 'ok' as const, contextReset: true, contextId: 'new', synthetic: true as const, datasetFingerprint: 'f',
    context: { asOf: '2026-10-09T05:00:00Z', timezone: 'Asia/Bangkok' as const },
    result: { status: 'ok' as const, text: '', warnings: [], evidence: [], window: { start: '', end: '', previousStart: '', previousEnd: '' },
      plan: { intent: 'total' as const, period: 'today' as const, resource: null, building: null, floor: null, limit: 10, staleMinutes: 60 } } };
  assert.equal(nextMeterContextId('old', ok), 'new');
  assert.equal(nextMeterContextId('old', { ...meta, status: 'clarify', message: 'm', contextReset: true }), undefined);
  assert.equal(nextMeterContextId('old', { ...meta, status: 'clarify', message: 'm', contextReset: false }), 'old');
});
