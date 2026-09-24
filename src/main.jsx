import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { seed } from './data/seed.js';
import { loadPapers, savePapers } from './lib/storage.js';
import {
  addCitation,
  removeCitation,
  archiveCitedPapers,
  citedPaperIds,
  citingIds,
  setArchived,
  referencesOf,
} from './lib/citations.js';
import { buildReadingPlan } from './lib/readingOrder.js';

function App() {
  const [items, setItems] = useState(loadPapers);
  const [selected, setSelected] = useState(1);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState('');
  const [view, setView] = useState('library');
  const [cycle, setCycle] = useState(null);
  const [form, setForm] = useState({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });

  useEffect(() => savePapers(items), [items]);

  const tags = ['全部', ...new Set(items.flatMap((x) => x.tags))];
  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          (tag === '全部' || x.tags.includes(tag)) &&
          `${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase())
      ),
    [items, tag, query]
  );
  const cur = items.find((x) => x.id === selected) || items[0];
  const plan = useMemo(() => buildReadingPlan(items), [items]);
  const activeCount = plan.ordered.length + plan.unconnected.length;

  const citedHere = cur
    ? referencesOf(cur).map((id) => items.find((p) => p.id === id)).filter(Boolean)
    : [];
  const citingHere = cur ? citingIds(items, cur.id).map((id) => items.find((p) => p.id === id)).filter(Boolean) : [];
  const citeCandidates = cur
    ? items.filter((p) => p.id !== cur.id && !referencesOf(cur).includes(p.id))
    : [];
  const [citingTarget, setCitingTarget] = useState('');

  const update = (k, v) => setItems(items.map((x) => (x.id === cur.id ? { ...x, [k]: v } : x)));

  const add = () => {
    if (!form.title) return;
    const p = {
      ...form,
      id: Date.now(),
      year: +form.year,
      tags: form.tags.split(',').map((x) => x.trim()).filter(Boolean),
      status: '待读',
      references: [],
      archived: false,
      cite: `${form.authors} (${form.year}). ${form.title}. ${form.venue}.`,
    };
    setItems([...items, p]);
    setSelected(p.id);
    setForm({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });
    setShow(false);
    setView('library');
    setNotice('文献已加入研究库');
  };

  const bib = () => {
    navigator.clipboard?.writeText(cur.cite);
    setNotice('引用文本已复制');
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([items.map((x) => x.cite).join('\n')], { type: 'text/plain' }));
    a.download = 'references.txt';
    a.click();
    setNotice('引用列表已导出');
  };

  const registerCitation = () => {
    const citedId = +citingTarget;
    if (!citedId || !cur) return;
    const result = addCitation(items, cur.id, citedId);
    if (result.ok) {
      setItems(result.papers);
      setCitingTarget('');
      setNotice(`已登记：《${cur.title}》引用《${items.find((p) => p.id === citedId).title}》`);
    } else if (result.cycle) {
      setCycle(result.cycle);
    } else {
      setNotice(result.error || '引用未登记');
    }
  };

  const dropCitation = (citedId) => {
    setItems(removeCitation(items, cur.id, citedId));
    setNotice('已移除该条库内引用');
  };

  const archiveAllCited = () => {
    const already = new Set(items.filter((p) => p.archived).map((p) => p.id));
    const n = citedPaperIds(items).filter((id) => !already.has(id)).length;
    if (!n) {
      setNotice('没有新的被引用文献需要归档');
      return;
    }
    setItems(archiveCitedPapers(items));
    setNotice(`已归档 ${n} 篇被引用文献，旧引用仍可查，不再进入阅读顺序`);
  };

  const toggleArchived = (id, archived) => {
    setItems(setArchived(items, id, archived));
    setNotice(archived ? '文献已归档' : '文献已恢复，重新进入阅读顺序');
  };

  const openPaper = (id) => {
    setSelected(id);
    setView('library');
  };

  const cycleTitles = cycle ? cycle.map((id) => items.find((p) => p.id === id)).filter(Boolean) : [];

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> LITERATURE</div>
        <div className="library-head">
          <span>我的研究库</span>
          <strong>{items.length}<small> 篇文献</small></strong>
        </div>
        <nav>
          <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>▤ <span>所有文献</span><b>{items.length}</b></button>
          <button>▥ <span>待读</span><b>{items.filter((x) => x.status === '待读').length}</b></button>
          <button>✓ <span>已读</span></button>
          <button className={view === 'order' ? 'active' : ''} onClick={() => setView('order')}>⏲ <span>阅读顺序</span><b>{activeCount}</b></button>
          <button>☆ <span>收藏</span></button>
        </nav>
        <div className="side-tags">
          <small>标签</small>
          {tags.slice(1, 5).map((t) => (
            <button onClick={() => { setTag(t); setView('library'); }} key={t}># {t}</button>
          ))}
        </div>
        <div className="side-foot">
          <button>⚙ 偏好设置</button>
          <small>本地数据库 · 已同步</small>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <span className="crumb">RESEARCH / {view === 'order' ? 'READING ORDER' : 'LIBRARY'}</span>
            <h1>{view === 'order' ? '阅读顺序' : '所有文献'}</h1>
          </div>
          <div className="actions">
            <button className="outline" onClick={download}>↓ 导出引用</button>
            <button className="primary" onClick={() => setShow(true)}>＋ 添加文献</button>
          </div>
        </header>

        {view === 'library' && (
          <>
            <div className="toolbar">
              <div className="search">⌕<input placeholder="搜索标题、作者或摘要…" value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button onClick={() => setQuery('')}>×</button>}</div>
              <div className="tag-filter">
                {tags.map((t) => <button className={tag === t ? 'on' : ''} onClick={() => setTag(t)} key={t}>{t}</button>)}
              </div>
            </div>
            <div className="body">
              <section className="paper-list">
                {filtered.map((p) => (
                  <button className={'paper ' + (selected === p.id ? 'selected ' : '') + (p.archived ? 'archived' : '')} onClick={() => setSelected(p.id)} key={p.id}>
                    <div className="paper-year">{p.year}</div>
                    <div className="paper-copy">
                      <h3>{p.title}</h3>
                      <p>{p.authors}</p>
                      <div>
                        {p.tags.map((t) => <span key={t}>#{t}</span>)}
                        {p.archived && <span className="archived-tag">已归档</span>}
                      </div>
                    </div>
                    <small className={'status ' + p.status}>{p.status}</small>
                  </button>
                ))}
                {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
              </section>

              <section className="detail">
                {cur && (
                  <>
                    <div className="detail-top">
                      <span className={'status ' + (cur.archived ? 'archived-status' : 'reading')}>{cur.archived ? '已归档' : cur.status}</span>
                      <button onClick={() => setNotice('已加入收藏')}>☆ 收藏</button>
                    </div>
                    <h2>{cur.title}</h2>
                    <p className="authors">{cur.authors}</p>
                    <div className="cite-actions">
                      <button onClick={bib}>▣ 复制引用</button>
                      <button onClick={() => update('status', cur.status === '已读' ? '待读' : '已读')}>{cur.status === '已读' ? '标记为待读' : '标记为已读'}</button>
                      <button onClick={() => toggleArchived(cur.id, !cur.archived)}>{cur.archived ? '↺ 恢复文献' : '▣ 归档文献'}</button>
                    </div>

                    <div className="detail-section">
                      <h4>库内引用 <span>WHO CITES WHOM</span></h4>
                      <div className="ref-block">
                        <small className="ref-label">本篇引用（{citedHere.length}）</small>
                        {citedHere.length ? citedHere.map((p) => (
                          <div className="ref-row" key={p.id}>
                            <button className="ref-title" onClick={() => setSelected(p.id)} title="查看被引文献">
                              <span className="ref-year">{p.year}</span> {p.title}
                            </button>
                            <button className="ref-del" onClick={() => dropCitation(p.id)}>移除</button>
                          </div>
                        )) : <p className="ref-empty">尚未登记本篇引用的库内文献。</p>}
                        {citeCandidates.length > 0 && (
                          <div className="ref-add">
                            <select value={citingTarget} onChange={(e) => setCitingTarget(e.target.value)}>
                              <option value="">选择一篇库内文献登记引用…</option>
                              {citeCandidates.map((p) => (
                                <option value={p.id} key={p.id}>{p.year} · {p.title}</option>
                              ))}
                            </select>
                            <button className="primary" onClick={registerCitation} disabled={!citingTarget}>登记引用</button>
                          </div>
                        )}
                      </div>
                      <div className="ref-block">
                        <small className="ref-label">引用本篇（{citingHere.length}）</small>
                        {citingHere.length ? citingHere.map((p) => (
                          <div className="ref-row" key={p.id}>
                            <button className="ref-title" onClick={() => setSelected(p.id)} title="查看引用文献">
                              <span className="ref-year">{p.year}</span> {p.title}
                            </button>
                          </div>
                        )) : <p className="ref-empty">库内还没有文献引用本篇。</p>}
                      </div>
                    </div>

                    <div className="detail-section">
                      <h4>摘要 <span>ABSTRACT</span></h4>
                      <p>{cur.abstract}</p>
                    </div>
                    <div className="detail-section">
                      <h4>出版信息 <span>PUBLICATION</span></h4>
                      <div className="pub-grid">
                        <div><small>出版物</small><strong>{cur.venue}</strong></div>
                        <div><small>年份</small><strong>{cur.year}</strong></div>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4>引用文本 <span>BIBTEX / TEXT</span></h4>
                      <div className="cite-box">{cur.cite}<button onClick={bib}>复制</button></div>
                    </div>
                    <div className="detail-section">
                      <h4>我的笔记 <span>PRIVATE</span></h4>
                      <textarea className="notes" placeholder="记录你的阅读想法…" value={cur.notes || ''} onChange={(e) => update('notes', e.target.value)} />
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}

        {view === 'order' && (
          <div className="order-wrap">
            <div className="order-card">
              <div>
                <strong>按引用先后生成阅读顺序</strong>
                <p>被引用的文献排在前；没有引用关系的文献殿后，并按年份、题目排序。已归档文献不进入新的阅读顺序，旧引用仍可在文献详情中查到。</p>
              </div>
              <div className="order-stats">
                <span><b>{activeCount}</b> 篇待排</span>
                <span><b>{plan.archived.length}</b> 篇已归档</span>
                <button className="primary" onClick={archiveAllCited}>归档已被引用的文献</button>
              </div>
            </div>

            <section className="order-section">
              <h4>按引用先后 <span>CITATION ORDER</span></h4>
              {plan.ordered.length ? plan.ordered.map((p, i) => (
                <OrderRow key={p.id} index={i + 1} paper={p} onOpen={openPaper} />
              )) : <p className="ref-empty">库内还没有引用关系，去文献详情中登记吧。</p>}
            </section>

            <section className="order-section">
              <h4>无引用关系 · 按年份、题目 <span>UNCONNECTED</span></h4>
              {plan.unconnected.length ? plan.unconnected.map((p, i) => (
                <OrderRow key={p.id} index={plan.ordered.length + i + 1} paper={p} onOpen={openPaper} />
              )) : <p className="ref-empty">没有无引用关系的未归档文献。</p>}
            </section>

            <section className="order-section archived-section">
              <details>
                <summary><h4>已归档（{plan.archived.length}） <span>ARCHIVED · 不进入阅读顺序</span></h4></summary>
                {plan.archived.map((p) => (
                  <div className="ref-row" key={p.id}>
                    <button className="ref-title" onClick={() => openPaper(p.id)}>
                      <span className="ref-year">{p.year}</span> {p.title}
                    </button>
                    <button className="ref-del" onClick={() => toggleArchived(p.id, false)}>恢复</button>
                  </div>
                ))}
                {!plan.archived.length && <p className="ref-empty">暂无归档文献。</p>}
              </details>
            </section>
          </div>
        )}
      </main>

      {show && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close" onClick={() => setShow(false)}>×</button>
            <span className="crumb">NEW REFERENCE</span>
            <h2>添加一篇文献</h2>
            <label>标题<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="论文或书籍标题" /></label>
            <label>作者<input value={form.authors} onChange={(e) => setForm({ ...form, authors: e.target.value })} /></label>
            <div className="two">
              <label>年份<input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></label>
              <label>出版物<input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></label>
            </div>
            <label>关键词<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="用逗号分隔" /></label>
            <label>摘要<textarea rows="3" value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} /></label>
            <button className="primary full" onClick={add}>保存文献</button>
          </div>
        </div>
      )}

      {cycle && (
        <div className="modal-bg" onClick={() => setCycle(null)}>
          <div className="modal cycle-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setCycle(null)}>×</button>
            <span className="crumb">CITATION CYCLE</span>
            <h2>该引用会形成回路</h2>
            <p>按引用先后，回路如下；最后一条是本次拟新增的引用，原记录未改动。</p>
            <ol className="cycle-path">
              {cycleTitles.map((p, i) => (
                <li key={i} className={i === cycleTitles.length - 1 ? 'cycle-back' : ''}>
                  <span className="cycle-no">{i + 1}</span>
                  <div>
                    <strong>{p.title}</strong>
                    {i < cycleTitles.length - 1 && (
                      <small>引用了 ↓ {i === cycleTitles.length - 2 ? '（拟新增，未登记）' : ''}</small>
                    )}
                    {i === cycleTitles.length - 1 && <small>回到回路起点</small>}
                  </div>
                </li>
              ))}
            </ol>
            <button className="primary full" onClick={() => setCycle(null)}>知道了</button>
          </div>
        </div>
      )}

      {notice && <div className="toast" key={notice}>{notice}</div>}
    </div>
  );
}

function OrderRow({ index, paper, onOpen }) {
  return (
    <button className="order-row" onClick={() => onOpen(paper.id)}>
      <span className="order-no">{String(index).padStart(2, '0')}</span>
      <span className="order-title">{paper.title}</span>
      <span className="order-meta">{paper.authors} · {paper.year}</span>
    </button>
  );
}

createRoot(document.getElementById('root')).render(<App />);
