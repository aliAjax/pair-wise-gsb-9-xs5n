// 保存层：localStorage 读写。文献仍用原 research-library 键、原结构；
// 引用关系单独存 research-library-relations，互不影响，现有数据无缝读取。

import { emptyRelations } from './citations';

export const LIB_KEY = 'research-library';
export const REL_KEY = 'research-library-relations';

export const seed = [
  {
    id: 1,
    title: 'The Extended Mind',
    authors: 'Clark, A. & Chalmers, D.',
    year: 1998,
    venue: 'Analysis',
    tags: ['具身认知', '经典'],
    abstract:
      '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',
    status: '阅读中',
    cite: 'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.',
  },
  {
    id: 2,
    title: 'Situated Learning',
    authors: 'Lave, J. & Wenger, E.',
    year: 1991,
    venue: 'Cambridge University Press',
    tags: ['学习科学', '社会'],
    abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
    status: '待读',
    cite: 'Lave, J. & Wenger, E. (1991). Situated Learning.',
  },
  {
    id: 3,
    title: 'Designing with Data',
    authors: 'Miller, S.',
    year: 2022,
    venue: 'MIT Press',
    tags: ['设计研究', '方法'],
    abstract:
      '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',
    status: '已读',
    cite: 'Miller, S. (2022). Designing with Data.',
  },
];

// 初始示例：1998 的 The Extended Mind 引用 1991 的 Situated Learning；
// Designing with Data 与它们无引用关系，阅读顺序中应排在后面。
export const seedRelations = () => ({
  edges: [{ from: 1, to: 2, at: 1 }],
  archived: [],
});

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function loadLibrary() {
  return readJSON(LIB_KEY, seed);
}

export function saveLibrary(items) {
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(items));
  } catch {
    /* 存储不可用时仅影响持久化，页面状态仍可用 */
  }
}

export function loadRelations() {
  const data = readJSON(REL_KEY, null);
  if (!data) {
    // 首次使用（且库也是初始数据）时给出一条示例关系；老库无关系数据则为空
    const lib = readJSON(LIB_KEY, null);
    return !lib ? seedRelations() : emptyRelations();
  }
  return {
    edges: Array.isArray(data.edges)
      ? data.edges
          .filter((e) => Number.isFinite(e?.from) && Number.isFinite(e?.to))
          .map((e) => ({ from: e.from, to: e.to, at: e.at }))
      : [],
    archived: Array.isArray(data.archived) ? data.archived : [],
  };
}

export function saveRelations(rel) {
  try {
    localStorage.setItem(REL_KEY, JSON.stringify(rel));
  } catch {
    /* 同上 */
  }
}
