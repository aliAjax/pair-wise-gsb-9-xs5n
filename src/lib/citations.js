// 关系模型层：文献之间「谁引用了谁」。
// 数据形态：papers 为文献数组，每篇可带 references:number[]（库内被引文献的 id）。
// 边的含义：references 里的 id 是被引文献，即 citedId <- citingId。
// 本层只做纯数据计算与变更，不碰 localStorage，也不依赖 React。

export const referencesOf = (paper) =>
  Array.isArray(paper?.references) ? paper.references : [];

// 引用该篇的库内文献 id（入边来源）
export function citingIds(papers, id) {
  return papers
    .filter((p) => referencesOf(p).includes(id))
    .map((p) => p.id);
}

// 该篇引用的库内文献 id（出边目标）
export function citedIds(papers, id) {
  const paper = papers.find((p) => p.id === id);
  return paper ? [...referencesOf(paper)] : [];
}

// 在 edges 中找一条 from -> to 的引用路径（BFS），找不到返回 null。
// edges 为 Map：sourceId -> Set(targetId)，方向为「引用者 -> 被引者」。
function findPath(edges, from, to) {
  if (from === to) return [from];
  const queue = [[from]];
  const seen = new Set([from]);
  for (const path of queue) {
    const node = path[path.length - 1];
    for (const next of edges.get(node) || []) {
      if (next === to) return [...path, to];
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

function buildEdges(papers) {
  const edges = new Map();
  for (const p of papers) {
    edges.set(p.id, new Set(referencesOf(p)));
  }
  return edges;
}

// 登记一条库内引用：citingId 引用 citedId。
// 返回 {ok, papers, error, cycle}。
// 成环时不改动任何数据，cycle 按引用先后给出回路的文献 id（首尾为同一篇）。
export function addCitation(papers, citingId, citedId) {
  if (citingId === citedId) {
    return { ok: false, papers, error: '不能登记文献引用自身', cycle: null };
  }
  const citing = papers.find((p) => p.id === citingId);
  const cited = papers.find((p) => p.id === citedId);
  if (!citing || !cited) {
    return { ok: false, papers, error: '引用的文献不在库中', cycle: null };
  }

  const current = referencesOf(citing);
  if (current.includes(citedId)) {
    return { ok: false, papers, error: '该引用关系已登记', cycle: null };
  }

  // 若被引文献已能（沿已有引用）回到引用文献，加上这条边就会成环。
  const edges = buildEdges(papers);
  const backPath = findPath(edges, citedId, citingId);
  if (backPath) {
    return {
      ok: false,
      papers,
      error: '新增引用会形成回路，未登记',
      cycle: [...backPath, citedId],
    };
  }

  const next = papers.map((p) =>
    p.id === citingId ? { ...p, references: [...current, citedId] } : p
  );
  return { ok: true, papers: next, error: null, cycle: null };
}

// 删除一条库内引用，其余原记录保持不变。
export function removeCitation(papers, citingId, citedId) {
  return papers.map((p) =>
    p.id === citingId
      ? { ...p, references: referencesOf(p).filter((id) => id !== citedId) }
      : p
  );
}

// 已被库内其他文献引用的文献 id（归档候选：被引用者先归档）。
export function citedPaperIds(papers) {
  const cited = new Set();
  for (const p of papers) {
    for (const id of referencesOf(p)) {
      if (id !== p.id) cited.add(id);
    }
  }
  return [...cited];
}

// 把「已被引用」的文献整体归档：返回新数组，仅追加 archived 标记。
export function archiveCitedPapers(papers) {
  const cited = new Set(citedPaperIds(papers));
  return papers.map((p) =>
    cited.has(p.id) && !p.archived ? { ...p, archived: true } : p
  );
}

export function setArchived(papers, id, archived) {
  return papers.map((p) => (p.id === id ? { ...p, archived } : p));
}
