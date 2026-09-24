import { useState } from 'react';
import { incoming, outgoing } from '../model/citations';

// Chip：一篇库内文献的关系条目，点击可跳转到该文献，可删除这条引用
function RefChip({ paper, archived, onOpen, onRemove, verb }) {
  return (
    <span className={'ref-chip' + (archived ? ' is-archived' : '')}>
      <button className="ref-chip-main" onClick={onOpen} title={`${paper.authors} · ${paper.year}`}>
        <b>{paper.title}</b>
        <small>{paper.year} · {paper.authors}</small>
      </button>
      {archived && <span className="arch-tag">已归档</span>}
      {onRemove && (
        <button className="ref-chip-del" title={verb} onClick={onRemove}>
          移除
        </button>
      )}
    </span>
  );
}

export default function CitationPanel({ items, relations, currentId, onOpen, onAdd, onRemove }) {
  const [target, setTarget] = useState('');
  const [error, setError] = useState(null); // {cycle:[title...]}

  const byId = new Map(items.map((x) => [x.id, x]));
  const refsOut = outgoing(relations, currentId); // 本文引用
  const refsIn = incoming(relations, currentId); // 引用本文
  const linked = new Set([...refsOut, ...refsIn, currentId]);
  const choices = items.filter((x) => !linked.has(x.id));

  const submit = () => {
    const to = Number(target);
    if (!Number.isFinite(to)) return;
    const res = onAdd(currentId, to);
    if (res.status === 'cycle') {
      setError({ cycle: res.cycle.map((id) => byId.get(id)?.title || `#${id}`) });
    } else {
      setError(null);
      setTarget('');
    }
  };

  return (
    <div className="detail-section">
      <h4>库内引用 <span>CITATIONS</span></h4>

      <div className="cite-register">
        <select value={target} onChange={(e) => { setTarget(e.target.value); setError(null); }}>
          <option value="">选择本文引用的库内文献…</option>
          {choices.map((p) => (
            <option key={p.id} value={p.id}>{p.title}（{p.year}）</option>
          ))}
        </select>
        <button className="primary" onClick={submit} disabled={!target}>登记引用</button>
      </div>

      {error && (
        <div className="cycle-warn">
          <strong>该引用会形成循环，未保存：</strong>
          <span>{error.cycle.join('  →  ')}</span>
          <small>原引用记录保持不变</small>
        </div>
      )}

      <div className="cite-group">
        <small>本文引用了 {refsOut.length} 篇（应先读）</small>
        {refsOut.length === 0 && <p className="cite-empty">尚未登记本文引用的库内文献</p>}
        {refsOut.map((id) => {
          const p = byId.get(id);
          if (!p) return null;
          return (
            <RefChip key={id} paper={p} archived={relations.archived.includes(id)}
              onOpen={() => onOpen(id)} verb="移除这条引用"
              onRemove={() => onRemove(currentId, id)} />
          );
        })}
      </div>

      <div className="cite-group">
        <small>{refsIn.length} 篇文献引用了本文</small>
        {refsIn.length === 0 && <p className="cite-empty">还没有库内文献引用本文</p>}
        {refsIn.map((id) => {
          const p = byId.get(id);
          if (!p) return null;
          return (
            <RefChip key={id} paper={p} archived={relations.archived.includes(id)}
              onOpen={() => onOpen(id)} verb="移除这条引用"
              onRemove={() => onRemove(id, currentId)} />
          );
        })}
      </div>
    </div>
  );
}
