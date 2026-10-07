import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChooseCard } from './ChooseCard';
import { interpretations } from '../../test/fixtures';
import type { ChooseResponse } from '../../types/state';

const response: ChooseResponse = {
  status: 'choose',
  question: 'ยอดขายปี 2017 เดือนไหนขายดีสุดอะ',
  message: 'คำถามนี้ตีความได้หลายแบบ',
  interpretations,
  offerId: '0123456789abcdef0123456789abcdef',
  trace: [],
  usage: { input_tokens: 0, output_tokens: 0, cost: 0 },
};

test('choose card lists every interpretation with parts and a run button without executing while rendering', () => {
  const html = renderToStaticMarkup(<ChooseCard response={response} onExecute={() => { throw new Error('Must not execute while rendering'); }} />);
  assert.ok(html.includes('หมายถึงแบบไหนคะ'));
  assert.ok(html.includes(response.question));
  for (const interpretation of interpretations) {
    assert.ok(html.includes(interpretation.summary));
    for (const part of interpretation.parts) assert.ok(html.includes(`<dt>${part.label}</dt><dd>${part.value}</dd>`));
  }
  assert.equal(html.match(/ใช้แบบนี้/g)?.length, interpretations.length);
  assert.ok(html.includes('48.0%'));
  assert.equal(html.match(/class="probability"/g)?.length, 1);
  assert.ok(!html.includes('<textarea'));
});
