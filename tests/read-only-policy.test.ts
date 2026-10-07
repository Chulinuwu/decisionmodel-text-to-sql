import { test } from 'node:test';
import assert from 'node:assert/strict';
import { violatesReadOnlyPolicy } from '../server/planning/read-only-policy.js';

test('data modification requests violate the read-only policy in English and Thai', () => {
  for (const question of ['Delete all canceled orders', 'update orders set status = 1', 'DROP TABLE orders', 'ลบคำสั่งซื้อที่ยกเลิก', 'อัปเดตสถานะออเดอร์']) assert.equal(violatesReadOnlyPolicy(question), true, question);
});

test('analytical wording that merely resembles a verb is allowed', () => {
  for (const question of ['Which month had the biggest drop in sales?', 'ยอดขายไม่รวมออเดอร์ยกเลิก', 'Count orders delivered in 2017']) assert.equal(violatesReadOnlyPolicy(question), false, question);
});
