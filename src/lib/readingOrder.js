// 排序判断层：根据库内引用关系生成阅读顺序。
// 规则：
//   1. 被引用的文献排在引用它的文献之前（引用先后）；
//      有引用关系的部分用拓扑排序确定顺序。
//   2. 与其他在库文献没有引用关系的，放到后面，按年份、题目排序。
//   3. 已归档文献不进入新的阅读顺序，但其引用记录仍保留可查。
// 本层为纯函数，不涉及保存与页面。

import { referencesOf } from './citations.js';

const collator = new Intl.Collator(['zh-Hans-CN', 'en'], {
  numeric: true,
  sensitivity: 'base',
});

// 年份升序、题目升序（稳定兜底用 id）
export function byYearTitle(papers) {
  return [...papers].sort((a, b) => {
    if (a.year !== b.year) return (a.year ?? 0) - (b.year ?? 0);
    const t = collator.compare(a.title || '', b.title || '');
    return t !== 0 ? t : a.id - b.id;
  });
}

// 生成阅读计划。
// 返回 { ordered, unconnected, archived }，均为文献数组。
export function buildReadingPlan(papers) {
  const active = papers.filter((p) => !p.archived);
  const activeIds = new Set(active.map((p) => p.id));
  const byId = new Map(active.map((p) => [p.id, p]));

  // 只统计「在库且未归档」文献之间的边
  const indegree = new Map(active.map((p) => [p.id, 0]));
  const adjacency = new Map(active.map((p) => [p.id, []]));

  for (const p of active) {
    for (const citedId of referencesOf(p)) {
      if (activeIds.has(citedId) && citedId !== p.id) {
        adjacency.get(citedId).push(p.id); // 被引 -> 引用者
        indegree.set(p.id, (indegree.get(p.id) || 0) + 1);
      }
    }
  }

  // 在先后图（被引 -> 引用者）中：入度>0 表示引用了别人；有后继表示被别人引用。
  const connectedIds = new Set();
  for (const p of active) {
    if ((indegree.get(p.id) || 0) > 0 || adjacency.get(p.id).length > 0) {
      connectedIds.add(p.id);
    }
  }

  // Kahn 拓扑排序：被引文献入度先归零，先读；同层候选按年份、题目取最先。
  const pick = (ids) =>
    byYearTitle([...ids].map((id) => byId.get(id))).map((p) => p.id);

  let ready = pick([...indegree.keys()].filter((id) => indegree.get(id) === 0 && connectedIds.has(id)));
  const orderedIds = [];
  while (ready.length) {
    const id = ready.shift();
    orderedIds.push(id);
    for (const nextId of adjacency.get(id)) {
      indegree.set(nextId, indegree.get(nextId) - 1);
      if (indegree.get(nextId) === 0 && connectedIds.has(nextId)) {
        ready = pick([...ready, nextId]);
      }
    }
  }

  // 防御：理论上登记时已禁止成环；若残留成环数据，也补在后面保证不漏文献。
  for (const id of connectedIds) {
    if (!orderedIds.includes(id)) orderedIds.push(id);
  }

  const unconnectedPapers = byYearTitle(
    active.filter((p) => !connectedIds.has(p.id))
  );
  const archivedPapers = byYearTitle(papers.filter((p) => p.archived));

  return {
    ordered: orderedIds.map((id) => byId.get(id)),
    unconnected: unconnectedPapers,
    archived: archivedPapers,
  };
}
