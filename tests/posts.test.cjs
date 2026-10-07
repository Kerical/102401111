const test = require('node:test');
const assert = require('node:assert/strict');
const Posts = require('../js/posts.js');

function post(fields = {}) {
  return { id: 'test-1', type: 'lost', name: '黑色雨伞', category: '雨伞', place: '图书馆', time: '2026-10-06T08:00', createdAt: '2026-10-07T09:00:00+08:00', status: '寻找中', desc: '银色伞柄', contact: '微信：test', ...fields };
}

function storage(value) {
  return { getItem(key) { assert.equal(key, Posts.STORAGE_KEY); return value; }, setItem() { assert.fail('Reading data must never write to storage'); } };
}

test('首页只展示进行中的寻物和招领信息', () => {
  const records = [post(), post({ id: 2, status: '已找到' }), post({ id: 3, type: 'found', status: '招领中' }), post({ id: 4, type: 'found', status: '已归还' })];
  assert.deepEqual(Posts.filterPosts(records).map(p => p.id), ['test-1', 3]);
});

test('信息类型筛选排除另一类信息', () => {
  const records = [post(), post({ id: 2, type: 'found', status: '招领中' })];
  assert.deepEqual(Posts.filterPosts(records, { type: 'found' }).map(p => p.id), [2]);
});

test('类别与地点条件同时生效，地点首尾空格被忽略', () => {
  const records = [post(), post({ id: 2, place: '食堂' }), post({ id: 3, category: '钥匙' })];
  assert.deepEqual(Posts.filterPosts(records, { category: '雨伞', place: ' 图书馆 ' }).map(p => p.id), ['test-1']);
});

test('按发布时间而非丢失时间排序，不修改输入数组', () => {
  const records = [post({ id: 'early', time: '2026-10-07T12:00', createdAt: '2026-10-07T08:00:00+08:00' }), post({ id: 'late', time: '2026-10-01T08:00', createdAt: '2026-10-07T09:00:00+08:00' })];
  const snapshot = JSON.stringify(records);
  assert.deepEqual(Posts.filterPosts(records).map(p => p.id), ['late', 'early']);
  assert.equal(JSON.stringify(records), snapshot);
});

test('旧数据没有发布时间时兼容丢失/拾取时间', () => {
  const records = [post({ id: 1, createdAt: undefined, time: '2026-10-06 08:00' }), post({ id: 2, createdAt: undefined, time: '2026-10-07 08:00' })];
  assert.deepEqual(Posts.filterPosts(records).map(p => p.id), [2, 1]);
});

test('无匹配条件和空列表均返回空数组', () => {
  assert.deepEqual(Posts.filterPosts([post()], { place: '体育馆' }), []);
  assert.deepEqual(Posts.filterPosts([]), []);
});

test('首次打开读取演示数据，每次返回独立副本', () => {
  const first = Posts.loadPosts(storage(null));
  first.posts[0].name = 'modified';
  const second = Posts.loadPosts(storage(null));
  assert.equal(second.source, 'demo');
  assert.equal(second.error, '');
  assert.notEqual(second.posts[0].name, 'modified');
});

test('已有本地发布数据会替换演示数据并保留发布者字段', () => {
  const record = post({ ownerId: 'student-1' });
  const result = Posts.loadPosts(storage(JSON.stringify([record])));
  assert.equal(result.source, 'local');
  assert.deepEqual(result.posts, [record]);
});

test('本地空数组不重新补入演示信息', () => {
  assert.deepEqual(Posts.loadPosts(storage('[]')).posts, []);
});

test('损坏的 JSON 给出读取错误，不覆写原始存储', () => {
  const result = Posts.loadPosts(storage('{broken'));
  assert.equal(result.source, 'demo');
  assert.match(result.error, /无法读取/);
});

test('非数组、缺少必需字段和类型状态不一致均拒绝读取', () => {
  for (const value of [{}, [null], [post({ name: '' })], [post({ type: 'found', status: '已找到' })]]) {
    assert.notEqual(Posts.loadPosts(storage(JSON.stringify(value))).error, '');
  }
});

test('数值与字符串相同的重复 ID 会被拒绝', () => {
  const result = Posts.loadPosts(storage(JSON.stringify([post({ id: 1 }), post({ id: '1' })])));
  assert.notEqual(result.error, '');
});

test('存储访问被禁用时页面仍可读取演示信息', () => {
  const result = Posts.loadPosts({ getItem() { throw new Error('Access denied'); } });
  assert.equal(result.source, 'demo');
  assert.notEqual(result.error, '');
});

test('类别选项去重，未知类别使用通用物品图标', () => {
  assert.deepEqual(Posts.categories([post(), post(), post({ category: '钥匙' })]).sort(), ['钥匙', '雨伞'].sort());
  assert.equal(Posts.iconFor(post({ category: '其他' })), '🔎');
});
