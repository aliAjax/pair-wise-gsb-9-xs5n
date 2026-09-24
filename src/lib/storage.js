// 保存层：文献库的本地持久化。
// 沿用原有 localStorage 键，旧记录（没有 references / archived 字段）读出时原样保留。

import { seed } from '../data/seed.js';

const STORAGE_KEY = 'research-library';

function normalize(raw) {
  if (!Array.isArray(raw)) return seed;
  return raw.map((p) => ({
    ...p,
    references: Array.isArray(p.references) ? p.references : [],
    archived: Boolean(p.archived),
  }));
}

export function loadPapers() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw) return seed;
    return normalize(raw);
  } catch {
    return seed;
  }
}

export function savePapers(papers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(papers));
  } catch {
    // 存储不可用时静默：本次会话内仍可用
  }
}
