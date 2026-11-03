import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextAnniversary, solarStrToLunar } from '../src/genealogy/lunar';

test('Rằm tháng 8 năm 2026 là 25/9/2026', () => {
  const r = nextAnniversary({ day: 15, month: 8, year: 1990, isLeap: false }, '2026-09-01');
  assert.equal(r?.solar, '2026-09-25');
  assert.equal(r?.daysUntil, 24);
});

test('Hôm nay đúng ngày giỗ thì daysUntil = 0', () => {
  const r = nextAnniversary({ day: 15, month: 8, year: 1990, isLeap: false }, '2026-09-25');
  assert.equal(r?.daysUntil, 0);
});

test('Mất tháng nhuận, năm không nhuận thì giỗ vào tháng thường cùng số', () => {
  // 2025 có tháng 6 nhuận; năm âm 2026 không có.
  const r = nextAnniversary({ day: 10, month: 6, year: 2025, isLeap: true }, '2026-03-01');
  assert.ok(r);
  const back = solarStrToLunar(r.solar);
  assert.deepEqual([back.day, back.month, back.isLeap], [10, 6, false]);
});

test('Mất ngày 30, tháng giỗ thiếu thì giỗ ngày cuối tháng, không trượt sang tháng sau', () => {
  for (const month of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const r = nextAnniversary({ day: 30, month, year: 1980, isLeap: false }, '2026-01-01');
    assert.ok(r, `tháng ${month}`);
    const back = solarStrToLunar(r.solar);
    assert.equal(back.month, month, `tháng ${month}`);
    assert.ok(back.day === 29 || back.day === 30, `tháng ${month}: ngày ${back.day}`);
  }
});
