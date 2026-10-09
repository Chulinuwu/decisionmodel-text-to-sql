import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatThread } from './ChatThread';
import { anomalyColumns, anomalyPlan, anomalyRows, answered, interpretations } from '../../test/fixtures';
import type { ChatTurn } from '../../types/state';

const usage = { input_tokens: 0, output_tokens: 0, cost: 0 };
const ok = { ...answered(anomalyPlan, anomalyColumns, anomalyRows(true)), question: 'รัฐไหนขายผิดปกติ', answer: 'พบรัฐของผู้ขายที่ผิดปกติ 1 รายการ' };
const turns: ChatTurn[] = [
  { id: 1, request: { kind: 'question', question: ok.question }, reply: { status: 'done', response: ok } },
  { id: 2, request: { kind: 'question', question: 'ยอดขายเดือนไหนดีสุด' }, reply: { status: 'done', response: {
    status: 'choose', question: 'ยอดขายเดือนไหนดีสุด', message: 'คำถามนี้ตีความได้หลายแบบ', interpretations, offerId: '0123456789abcdef0123456789abcdef', trace: [], usage } } },
  { id: 3, request: { kind: 'question', question: 'พยากรณ์ยอดขายปีหน้า' }, reply: { status: 'done', response: {
    status: 'unsupported', question: 'พยากรณ์ยอดขายปีหน้า', message: 'ยังพยากรณ์ไม่ได้', detail: 'ระบบตอบจากข้อมูลในอดีตเท่านั้น', trace: [], usage } } },
  { id: 4, request: { kind: 'question', question: 'จำนวนคำสั่งซื้อ' }, reply: { status: 'loading' } },
];

test('chat thread renders each question with its ok, choose, unsupported and pending reply in order', () => {
  const html = renderToStaticMarkup(<ChatThread turns={turns} disabled={false} onCancel={() => {}} onRetry={() => {}}
    onExecute={() => { throw new Error('Must not execute while rendering'); }} />);
  assert.equal(html.match(/class="user-bubble"/g)?.length, turns.length);
  for (const turn of turns) assert.ok(html.includes(`<p class="user-bubble">${turn.request.question}</p>`));
  const order = ['พบรัฐของผู้ขายที่ผิดปกติ 1 รายการ', 'class="result-card"', 'หมายถึงแบบไหนคะ', 'ยังพยากรณ์ไม่ได้', 'ยกเลิก'].map(text => html.indexOf(text));
  assert.ok(order.every((position, index) => position >= 0 && (index === 0 || position > order[index - 1])), String(order));
  assert.ok(html.indexOf('<p class="answer-text">') < html.indexOf('class="result-card"'));
  assert.equal(html.match(/ใช้แบบนี้/g)?.length, interpretations.length);
  assert.ok(html.includes('ระบบตอบจากข้อมูลในอดีตเท่านั้น'));
  assert.equal(html.match(/<details class="query-details"/g)?.length, 3);
});

test('while a turn is pending, older turns cannot pick an interpretation but the pending one can still be cancelled', () => {
  const render = (disabled: boolean) => renderToStaticMarkup(<ChatThread turns={turns} disabled={disabled} onCancel={() => {}} onRetry={() => {}} onExecute={() => {}} />);
  assert.equal(render(true).match(/disabled="">ใช้แบบนี้/g)?.length, interpretations.length);
  assert.equal(render(false).match(/disabled="">ใช้แบบนี้/g), null);
  assert.ok(render(true).includes('<button class="secondary-button">ยกเลิก</button>'));
});
