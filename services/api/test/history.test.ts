import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffFields, staleFields } from '../src/genealogy/history';
import { foldVietnamese } from '../src/common/text';

test('diffFields chỉ giữ trường đổi, kèm giá trị cũ', () => {
  const current = { fullName: 'Cụ Tổ', dateOfBirth: new Date('1890-01-01'), bio: null };
  const next = { fullName: 'Cụ Tổ', dateOfBirth: new Date('1887-01-01'), bio: null, updatedBy: 'u' };
  assert.deepEqual(diffFields(current, next), {
    before: { dateOfBirth: '1890-01-01' },
    after: { dateOfBirth: '1887-01-01' },
  });
});

test('staleFields phát hiện sửa chen giữa', () => {
  const snapshot = { fullName: 'A', dateOfBirth: '1890-01-01T00:00:00.000Z' };
  assert.deepEqual(
    staleFields(snapshot, { fullName: 'A', dateOfBirth: new Date('1890-01-01') }, ['fullName', 'dateOfBirth']),
    [],
  );
  assert.deepEqual(
    staleFields(snapshot, { fullName: 'B', dateOfBirth: new Date('1890-01-01') }, ['fullName']),
    ['fullName'],
  );
});

test('foldVietnamese bỏ dấu cho tìm kiếm', () => {
  assert.equal(foldVietnamese('  Nguyễn  Văn Đạt '), 'nguyen van dat');
  assert.ok(foldVietnamese('Phùng Bá Phụng').includes(foldVietnamese('phung ba phung')));
});
