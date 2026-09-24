import { useMemo } from 'react';
import { readingPlan, byYearTitle } from '../model/readingOrder';
import { incoming, outgoing } from '../model/citations';

function PlanItem({ index, paper, relations, byId, onOpen }) {
  const archivedSet = new Set(relations.archived);
  const out = outgoing(relations, paper.id).filter(
    (id) => byId.has(id) && !archivedSet.has(id),
  );
  return (
    <button className="plan-item" onClick={() => onOpen(paper.id)}>
      <span className="plan-no">{String(index).padStart(2, '0')}</span>
      <span className="plan-body">
        <b>{paper.title}</b>
        <small>{paper.authors} · {paper.year} · {paper.venue}</small>
        {out.length > 0 && (
          <em>
            先读其引用：
            {out.map((id) => byId.get(id)?.title).filter(Boolean).join('；')}
          </em>
        )}
      </span>
      <span className={'status ' + paper.status}>{paper.status}</span>
    </button>
  );
}

export default function ReadingPage({ items, relations, onOpen, onArchive, onUnarchive, onRegister }) {
  const plan = useMemo(() => readingPlan(items, relations), [items, relations]);
  const byId = useMemo(() => new Map(items.map((x) => [x.id, x])), [items]);

  let n = 0;
  const renderPlan = (id) => {
    n += 1;
    const paper = byId.get(id);
    if (!paper) return null;
    return <PlanItem key={id} index={n} paper={paper} relations={relations} byId={byId} onOpen={onOpen} />;
  };

  return (
    <>
      <header>
        <div>
          <span className="crumb">RESEARCH / READING ORDER</span>
          <h1>阅读顺序</h1>
        </div>
        <div className="actions">
          <button className="outline" onClick={onRegister}>▤ 登记引用</button>
        </div>
      </header>

      <div className="reading-page">
        <p className="order-note">
          按引用先后排列：被引用的文献先读；没有引用关系的文献排在后面，按年份、题目排序。
          共 {plan.order.length + plan.isolated.length} 篇待读顺序，已归档 {plan.archived.length} 篇不进入顺序。
        </p>

        <section className="plan-block">
          <h3>按引用先后 <small>{plan.order.length} 篇</small></h3>
          {plan.order.length === 0 && (
            <div className="no-result">还没有文献建立库内引用关系</div>
          )}
          {plan.order.map(renderPlan)}
        </section>

        <section className="plan-block dim">
          <h3>无引用关系 <small>按年份、题目排序 · {plan.isolated.length} 篇</small></h3>
          {plan.isolated.length === 0 && <div className="no-result">所有文献都已建立引用关系</div>}
          {plan.isolated.map(renderPlan)}
        </section>

        <section className="plan-block archive-block">
          <h3>优先归档 <small>已被库内文献引用 · {plan.ready.length} 篇</small></h3>
          {plan.ready.length === 0 && (
            <div className="no-result">暂无“已被引用”的活动文献可归档</div>
          )}
          {[...plan.ready]
            .sort(
              (a, b) =>
                incoming(relations, b).length - incoming(relations, a).length ||
                byYearTitle(byId.get(a), byId.get(b)),
            )
            .map((id) => {
            const p = byId.get(id);
            return (
              <div className="plan-item static" key={id}>
                <button className="plan-body plan-link" onClick={() => onOpen(id)}>
                  <b>{p.title}</b>
                  <small>被 {incoming(relations, id).length} 篇库内文献引用 · {p.year}</small>
                </button>
                <button className="primary" onClick={() => onArchive(id)}>归档</button>
              </div>
            );
          })}
        </section>

        <section className="plan-block archive-block">
          <h3>归档记录 <small>旧引用仍可查，不再进入阅读顺序 · {plan.archived.length} 篇</small></h3>
          {plan.archived.length === 0 && <div className="no-result">还没有归档文献</div>}
          {plan.archived.map((id) => {
            const p = byId.get(id);
            if (!p) return null;
            const oldIn = incoming(relations, id).filter((x) => byId.has(x));
            const oldOut = outgoing(relations, id).filter((x) => byId.has(x));
            return (
              <div className="archived-card" key={id}>
                <div className="archived-head">
                  <button className="plan-link" onClick={() => onOpen(id)}>
                    <b>{p.title}</b>
                    <small>{p.authors} · {p.year}</small>
                  </button>
                  <button className="outline" onClick={() => onUnarchive(id)}>取消归档</button>
                </div>
                <div className="archived-old">
                  <small>旧引用关系：</small>
                  {oldOut.length > 0 && (
                    <span>引用过 {oldOut.map((x) => byId.get(x)?.title).join('；')}</span>
                  )}
                  {oldIn.length > 0 && (
                    <span>被引于 {oldIn.map((x) => byId.get(x)?.title).join('；')}</span>
                  )}
                  {oldOut.length + oldIn.length === 0 && <span>无</span>}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
