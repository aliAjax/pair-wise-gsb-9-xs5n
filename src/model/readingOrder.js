// 排序判断层：按引用先后生成阅读顺序（纯函数）
// 边 from -> to 表示 from 引用 to，故被引文献 to 必须先读（拓扑序）。
// 没有任何引用关系的文献放在最后，按年份升序、题目升序排。
// 已归档文献不参与新的阅读顺序，但其引用关系仍保留在关系模型中可查。

import { emptyRelations } from './citations';

// 稳定的次序键：年份升序，题目升序（中文按本地拼音习惯比较）
export const byYearTitle = (a, b) =>
  (a.year ?? 0) - (b.year ?? 0) ||
  String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hans-CN');

const nodeMap = (items) => new Map(items.map((x) => [x.id, x]));

// 计算一篇（活动）文献的引用者：引用了 id、且仍在活动集合内的文献
const citersOf = (edges, activeIds, id) =>
  edges
    .filter((e) => e.to === id && activeIds.has(e.from))
    .map((e) => e.from);

// 返回 { order:[id...], isolated:[id...], ready:[id...], archived:[id...] }
// - order:    有关系、且未归档文献的阅读顺序（被引者在先）
// - isolated: 与任何库内文献都没有引用关系的活动文献（供页面排到后面）
// - ready:    当前可优先归档的文献（未归档且仍被库内文献引用）
export function readingPlan(items, rel = emptyRelations()) {
  const byId = nodeMap(items);
  const archivedSet = new Set(rel.archived);
  const active = items.filter((x) => !archivedSet.has(x.id));
  const activeIds = new Set(active.map((x) => x.id));

  // 只看活动文献之间的边，归档文献相当于从排序图中摘下
  const activeEdges = rel.edges.filter(
    (e) => activeIds.has(e.from) && activeIds.has(e.to),
  );

  // 活动子图里出现过的文献 = 有关系的文献
  const connectedIds = new Set();
  activeEdges.forEach((e) => {
    connectedIds.add(e.from);
    connectedIds.add(e.to);
  });

  // remaining[id] = id 还引用多少篇活动文献（它的“先读”前提）；
  // 为 0 时说明 id 引用的都已排定，可以排 id —— 于是被引者恒在引用者之前。
  const remaining = new Map();
  connectedIds.forEach((id) => remaining.set(id, 0));
  activeEdges.forEach((e) => remaining.set(e.from, (remaining.get(e.from) || 0) + 1));

  // Kahn 拓扑：每一步先放“已无先读前提”的文献；多个可选项按年份、题目定先后
  const takeReady = () =>
    [...remaining.keys()]
      .filter((id) => remaining.get(id) === 0)
      .sort((a, b) => byYearTitle(byId.get(a), byId.get(b)));

  const order = [];
  let queue = takeReady();
  while (queue.length) {
    const id = queue.shift();
    remaining.delete(id);
    order.push(id);
    // id 已排定，所有引用 id 的文献都少一篇待读前提
    for (const citer of citersOf(activeEdges, activeIds, id)) {
      if (remaining.has(citer)) remaining.set(citer, remaining.get(citer) - 1);
    }
    queue = takeReady();
  }
  // 防御：登记时已禁止成环，活动子图理应无环；若有残余则兜底追加，不丢文献
  if (remaining.size) {
    [...remaining.keys()]
      .sort((a, b) => byYearTitle(byId.get(a), byId.get(b)))
      .forEach((id) => order.push(id));
  }

  const isolated = active
    .filter((x) => !connectedIds.has(x.id))
    .sort(byYearTitle)
    .map((x) => x.id);

  // 归档候选：未归档，且在完整关系记录中仍被某篇库内文献引用
  const citedSet = new Set(rel.edges.map((e) => e.to));
  const ready = active
    .filter((x) => citedSet.has(x.id))
    .sort(byYearTitle)
    .map((x) => x.id);

  return {
    order,
    isolated,
    ready,
    archived: rel.archived.filter((id) => byId.has(id)),
  };
}
