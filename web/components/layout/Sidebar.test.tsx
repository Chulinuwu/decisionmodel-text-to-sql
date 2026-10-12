import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Sidebar } from './Sidebar';
import { databases } from '../../config/databases';
import type { DatabaseDetailState } from '../../types/database';
import type { ThreadRecord } from '../../types/state';

const [chatDatabase, meterDatabase] = databases;
if (chatDatabase.engine !== 'chat' || meterDatabase.engine !== 'meter') throw new Error('Registry order changed');
const threads: ThreadRecord[] = [
  { id: 'fresh', createdAt: 3, database: chatDatabase, turns: [] },
  { id: 'meter', createdAt: 2, database: meterDatabase, turns: [{ id: 1, request: { kind: 'question', question: 'Which meters are abnormal today?' }, reply: { status: 'cancelled' } }] },
  { id: 'chat', createdAt: 1, database: chatDatabase, turns: [{ id: 1, request: { kind: 'question', question: 'จำนวนคำสั่งซื้อ' }, reply: { status: 'cancelled' } }] },
];
const details: Record<string, DatabaseDetailState> = { [chatDatabase.id]: { status: 'loading' }, [meterDatabase.id]: { status: 'error', message: 'down' } };
const noop = () => {};

test('sidebar lists started threads newest first with the active one marked, and every database with its status and actions', () => {
  const html = renderToStaticMarkup(<Sidebar threads={threads} activeId="meter" onOpen={noop} onNewChat={noop}
    connectedId={meterDatabase.id} detailOf={id => details[id]} onConnect={noop} onBrowse={noop} />);
  const chats = html.indexOf('>แชท</h2>'), databasesHeading = html.indexOf('>ฐานข้อมูล</h2>');
  assert.ok(chats >= 0 && databasesHeading > chats);
  assert.ok(html.indexOf('แชทใหม่') > chats);
  assert.equal(html.match(/class="thread-item/g)?.length, 2);
  assert.ok(html.indexOf('Which meters are abnormal today?') < html.indexOf('จำนวนคำสั่งซื้อ'));
  assert.match(html, /class="thread-item active" aria-current="true"><span class="thread-title">Which meters are abnormal today\?/);
  for (const database of databases) assert.ok(html.indexOf(database.name, databasesHeading) > 0 && html.includes(database.description));
  assert.equal(html.match(/>เชื่อมต่อ</g)?.length, databases.length);
  assert.equal(html.match(/>ดูข้อมูล</g)?.length, databases.length);
  assert.match(html, /class="database-item connected">.*Synthetic meters.*เชื่อมต่ออยู่/);
  assert.match(html, /status-dot loading/);
  assert.match(html, /status-dot offline/);
});

test('sidebar shows an empty-chat hint until a thread has a question', () => {
  const html = renderToStaticMarkup(<Sidebar threads={[threads[0]]} activeId="fresh" onOpen={noop} onNewChat={noop}
    connectedId={chatDatabase.id} detailOf={id => details[id]} onConnect={noop} onBrowse={noop} />);
  assert.equal(html.match(/class="thread-item/g), null);
  assert.ok(html.includes('ยังไม่มีแชท'));
});
