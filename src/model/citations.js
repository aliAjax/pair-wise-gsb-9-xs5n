// 关系模型层：库内引用图（纯数据、纯函数，不涉及存储与页面）
// 边 { from, to } 语义：from 这篇文献引用了 to 这篇文献
// 归档只影响阅读顺序的生成，不删除任何边；因此环路检测也始终基于完整关系记录。

export const emptyRelations = () => ({ edges: [], archived: [] });

export const isArchived = (rel, id) => rel.archived.includes(id);

const hasEdge = (rel, from, to) =>
  rel.edges.some((e) => e.from === from && e.to === to);

// 邻接表：id -> 它引用的文献 id 列表
const adjacency = (rel) => {
  const map = new Map();
  for (const e of rel.edges) {
    if (!map.has(e.from)) map.set(e.from, []);
    map.get(e.from).push(e.to);
  }
  return map;
};

// 广度优先寻找 start -> goal 的一条路径，返回 id 序列（含两端）；找不到返回 null
function findPath(rel, start, goal) {
  if (start === goal) return [start];
  const adj = adjacency(rel);
  const queue = [[start, [start]]];
  const seen = new Set([start]);
  while (queue.length) {
    const [cur, path] = queue.shift();
    for (const next of adj.get(cur) || []) {
      if (next === goal) return [...path, next];
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([next, [...path, next]]);
      }
    }
  }
  return null;
}

// 登记一条引用。返回：
//  { status:'added', rel }                     已保存（新关系对象，原数据不变）
//  { status:'duplicate' }                      关系已存在，记录不变
//  { status:'cycle', cycle:[id,...] }          会成环，记录不变；
//                                              cycle 按引用先后列出，首尾同一篇
export function addEdge(rel, from, to, now = Date.now()) {
  if (from === to) return { status: 'cycle', cycle: [from, from] };
  if (hasEdge(rel, from, to)) return { status: 'duplicate' };
  // 新边 from->to，若 to 已能沿旧引用走到 from，则合围成环
  const path = findPath(rel, to, from);
  if (path) return { status: 'cycle', cycle: [from, ...path] };
  return {
    status: 'added',
    rel: { ...rel, edges: [...rel.edges, { from, to, at: now }] },
  };
}

export function removeEdge(rel, from, to) {
  return { ...rel, edges: rel.edges.filter((e) => !(e.from === from && e.to === to)) };
}

// 本文引用了哪些库内文献
export const outgoing = (rel, id) =>
  rel.edges.filter((e) => e.from === id).map((e) => e.to);

// 本文被哪些库内文献引用
export const incoming = (rel, id) =>
  rel.edges.filter((e) => e.to === id).map((e) => e.from);

export const isCited = (rel, id) => rel.edges.some((e) => e.to === id);

export function archive(rel, id) {
  if (rel.archived.includes(id)) return rel;
  return { ...rel, archived: [...rel.archived, id] };
}

export function unarchive(rel, id) {
  return { ...rel, archived: rel.archived.filter((x) => x !== id) };
}
