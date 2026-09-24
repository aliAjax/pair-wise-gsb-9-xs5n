import { useMemo, useState } from 'react';
import CitationPanel from './CitationPanel';
import { archive, isArchived, isCited, unarchive } from '../model/citations';

export default function LibraryPage({
  items, selected, onSelect, relations,
  onUpdateItems, onUpdateRelations, onNotify,
  onAddEdge, onRemoveEdge,
}) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });

  const tags = ['全部', ...new Set(items.flatMap((x) => x.tags))];
  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          (tag === '全部' || x.tags.includes(tag)) &&
          `${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, tag, query],
  );
  const cur = items.find((x) => x.id === selected) || items[0];

  const update = (k, v) =>
    onUpdateItems(items.map((x) => (x.id === cur.id ? { ...x, [k]: v } : x)));

  const add = () => {
    if (!form.title) return;
    const p = {
      ...form,
      id: Date.now(),
      year: +form.year,
      tags: form.tags.split(',').map((x) => x.trim()).filter(Boolean),
      status: '待读',
      cite: `${form.authors} (${form.year}). ${form.title}. ${form.venue}.`,
    };
    onUpdateItems([...items, p]);
    onSelect(p.id);
    setForm({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });
    setShow(false);
    onNotify('文献已加入研究库');
  };

  const bib = () => {
    navigator.clipboard?.writeText(cur.cite);
    onNotify('引用文本已复制');
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([items.map((x) => x.cite).join('\n')], { type: 'text/plain' }),
    );
    a.download = 'references.txt';
    a.click();
    onNotify('引用列表已导出');
  };

  // 关系模型是唯一裁判：页面不预判成环/重复，结果由模型返回、面板负责提示

  return (
    <>
      <header>
        <div>
          <span className="crumb">RESEARCH / LIBRARY</span>
          <h1>所有文献</h1>
        </div>
        <div className="actions">
          <button className="outline" onClick={download}>↓ 导出引用</button>
          <button className="primary" onClick={() => setShow(true)}>＋ 添加文献</button>
        </div>
      </header>
      <div className="toolbar">
        <div className="search">⌕
          <input placeholder="搜索标题、作者或摘要…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button onClick={() => setQuery('')}>×</button>}
        </div>
        <div className="tag-filter">
          {tags.map((t) => (
            <button className={tag === t ? 'on' : ''} onClick={() => setTag(t)} key={t}>{t}</button>
          ))}
        </div>
      </div>
      <div className="body">
        <section className="paper-list">
          {filtered.map((p) => (
            <button className={'paper ' + (selected === p.id ? 'selected' : '')} onClick={() => onSelect(p.id)} key={p.id}>
              <div className="paper-year">{p.year}</div>
              <div className="paper-copy">
                <h3>{p.title}</h3>
                <p>{p.authors}</p>
                <div>
                  {p.tags.map((t) => <span key={t}>#{t}</span>)}
                  {isArchived(relations, p.id) && <span className="arch-inline">已归档</span>}
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
                <span className="status reading">{cur.status}</span>
                <div className="detail-top-right">
                  {isArchived(relations, cur.id) && <b className="arch-inline">已归档 · 旧引用可查</b>}
                  <button onClick={() => onNotify('已加入收藏')}>☆ 收藏</button>
                </div>
              </div>
              <h2>{cur.title}</h2>
              <p className="authors">{cur.authors}</p>
              <div className="cite-actions">
                <button onClick={bib}>▣ 复制引用</button>
                <button onClick={() => update('status', cur.status === '已读' ? '待读' : '已读')}>
                  {cur.status === '已读' ? '标记为待读' : '标记为已读'}
                </button>
                {isArchived(relations, cur.id) ? (
                  <button onClick={() => { onUpdateRelations(unarchive(relations, cur.id)); onNotify('已取消归档，重新进入阅读顺序'); }}>
                    取消归档
                  </button>
                ) : (
                  <button
                    disabled={!isCited(relations, cur.id)}
                    title={isCited(relations, cur.id) ? '归档后不再进入新的阅读顺序，旧引用保留可查' : '已被库内文献引用的文献才能归档'}
                    onClick={() => { onUpdateRelations(archive(relations, cur.id)); onNotify('已归档：不再进入新的阅读顺序，旧引用仍可查'); }}
                  >
                    归档
                  </button>
                )}
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

              <CitationPanel
                items={items}
                relations={relations}
                currentId={cur.id}
                onOpen={onSelect}
                onAdd={onAddEdge}
                onRemove={(from, to) => { onRemoveEdge(from, to); onNotify('引用关系已移除'); }}
              />

              <div className="detail-section">
                <h4>引用文本 <span>BIBTEX / TEXT</span></h4>
                <div className="cite-box">
                  {cur.cite}
                  <button onClick={bib}>复制</button>
                </div>
              </div>
              <div className="detail-section">
                <h4>我的笔记 <span>PRIVATE</span></h4>
                <textarea className="notes" placeholder="记录你的阅读想法…" value={cur.notes || ''} onChange={(e) => update('notes', e.target.value)} />
              </div>
            </>
          )}
        </section>
      </div>

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
    </>
  );
}
