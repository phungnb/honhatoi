import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createsCycle, toParentEdge } from '../src/genealogy/lineage-graph';

// Ông → Cha → Con → Cháu
const tree = [
  { parentId: 'ong', childId: 'cha' },
  { parentId: 'cha', childId: 'con' },
  { parentId: 'con', childId: 'chau' },
];

test('khai cháu là cha của ông thì bị chặn', () => {
  assert.equal(createsCycle(tree, { parentId: 'chau', childId: 'ong' }), true);
});

test('khai con là cha của cha thì bị chặn', () => {
  assert.equal(createsCycle(tree, { parentId: 'con', childId: 'cha' }), true);
});

test('tự làm cha mình thì bị chặn', () => {
  assert.equal(createsCycle(tree, { parentId: 'cha', childId: 'cha' }), true);
});

test('thêm con thứ hai, thêm mẹ, thêm cụ là hợp lệ', () => {
  assert.equal(createsCycle(tree, { parentId: 'cha', childId: 'con2' }), false);
  assert.equal(createsCycle(tree, { parentId: 'me', childId: 'con' }), false);
  assert.equal(createsCycle(tree, { parentId: 'cu', childId: 'ong' }), false);
});

test('quan hệ con được quy về cạnh cha mẹ → con; vợ chồng thì bỏ qua', () => {
  assert.deepEqual(toParentEdge('a', 'b', 'child'), { parentId: 'b', childId: 'a' });
  assert.deepEqual(toParentEdge('a', 'b', 'adoptive_parent'), { parentId: 'a', childId: 'b' });
  assert.equal(toParentEdge('a', 'b', 'spouse'), null);
});
