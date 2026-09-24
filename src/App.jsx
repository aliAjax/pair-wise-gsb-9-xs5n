import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import LibraryPage from './pages/LibraryPage';
import ReadingPage from './pages/ReadingPage';
import { addEdge, archive, removeEdge } from './model/citations';
import { readingPlan } from './model/readingOrder';
import { loadLibrary, loadRelations, saveLibrary, saveRelations } from './model/storage';

export default function App() {
  const [items, setItems] = useState(loadLibrary);
  const [relations, setRelations] = useState(loadRelations);
  const [selected, setSelected] = useState(1);
  const [page, setPage] = useState('library'); // library | reading
  const [notice, setNotice] = useState('');

  // 保存与数据分离：文献、关系各自落盘，互不改动结构
  useEffect(() => saveLibrary(items), [items]);
  useEffect(() => saveRelations(relations), [relations]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const plan = useMemo(() => readingPlan(items, relations), [items, relations]);
  const readingCount = plan.order.length + plan.isolated.length;
  const tags = ['全部', ...new Set(items.flatMap((x) => x.tags))];

  const addCiteEdge = (from, to) => {
    const res = addEdge(relations, from, to);
    if (res.status === 'added') {
      setRelations(res.rel);
      setNotice('引用关系已登记');
    } else if (res.status === 'duplicate') {
      setNotice('该引用关系已存在，记录不变');
    }
    // 成环时不带提示文案，由面板展示回路篇名；记录不变
    return res;
  };

  const removeCiteEdge = (from, to) => setRelations(removeEdge(relations, from, to));
  const doArchive = (id) => {
    setRelations(archive(relations, id));
    setNotice('已归档：旧引用仍可查，不再进入新的阅读顺序');
  };
  const doUnarchive = (id) => {
    setRelations((r) => ({ ...r, archived: r.archived.filter((x) => x !== id) }));
    setNotice('已取消归档，重新进入阅读顺序');
  };

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> LITERATURE</div>
        <div className="library-head">
          <span>我的研究库</span>
          <strong>{items.length}<small> 篇文献</small></strong>
        </div>
        <nav>
          <button className={page === 'library' ? 'active' : ''} onClick={() => setPage('library')}>
            ▤ <span>所有文献</span><b>{items.length}</b>
          </button>
          <button className={page === 'reading' ? 'active' : ''} onClick={() => setPage('reading')}>
            ⇄ <span>阅读顺序</span><b>{readingCount}</b>
          </button>
          <button>▥ <span>待读</span><b>{items.filter((x) => x.status === '待读').length}</b></button>
          <button>✓ <span>已读</span></button>
          <button>☆ <span>收藏</span></button>
        </nav>
        <div className="side-tags">
          <small>标签</small>
          {tags.slice(1, 5).map((t) => (
            <button key={t} onClick={() => { setPage('library'); }}># {t}</button>
          ))}
        </div>
        <div className="side-foot">
          <button>⚙ 偏好设置</button>
          <small>本地数据库 · 已同步</small>
        </div>
      </aside>

      <main>
        {page === 'library' ? (
          <LibraryPage
            items={items}
            selected={selected}
            onSelect={setSelected}
            relations={relations}
            onUpdateItems={setItems}
            onUpdateRelations={setRelations}
            onNotify={setNotice}
            onAddEdge={addCiteEdge}
            onRemoveEdge={removeCiteEdge}
          />
        ) : (
          <ReadingPage
            items={items}
            relations={relations}
            onOpen={(id) => { setSelected(id); setPage('library'); }}
            onArchive={doArchive}
            onUnarchive={doUnarchive}
            onRegister={() => setPage('library')}
          />
        )}
      </main>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
