import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCsv } from './csv';
import { numericValue } from '../../shared/result-cells';

test('CSV preserves columns, Thai text, nulls and escaped multiline values', () => {
  assert.equal(toCsv(['name', 'amount'], [{ name: 'ไทย,"line"\nnext', amount: null }]), '"name","amount"\r\n"ไทย,""line""\nnext",""');
});

test('CSV prevents spreadsheet formulas while preserving numeric negatives', () => {
  assert.equal(toCsv(['value'], [{ value: '=HYPERLINK("url")' }, { value: '-12.5' }, { value: ' @SUM(A1)' }]), '"value"\r\n"\'=HYPERLINK(""url"")"\r\n"-12.5"\r\n"\' @SUM(A1)"');
});

test('chart numeric values reject empty, nonnumeric and nonfinite data', () => {
  assert.equal(numericValue(''), null);
  assert.equal(numericValue('123abc'), null);
  assert.equal(numericValue('1e400'), null);
  assert.equal(numericValue(null), null);
  assert.equal(numericValue('12.50'), 12.5);
});
