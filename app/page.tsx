'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Apple,
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronUp,
  CircleGauge,
  Command,
  Dumbbell,
  FileText,
  History,
  LayoutDashboard,
  LibraryBig,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';

type Mode = 'Исследовать' | 'Создать' | 'Проверить';
type Format = 'Reels' | 'Telegram' | 'Threads' | 'Карусель';
type View = 'workspace' | 'knowledge' | 'content' | 'history';
type Theme = 'light' | 'dark';

const modes: Array<{ name: Mode; index: string }> = [
  { name: 'Исследовать', index: '01' },
  { name: 'Создать', index: '02' },
  { name: 'Проверить', index: '03' },
];

const navItems: Array<{ id: View; icon: LucideIcon; label: string; count?: string }> = [
  { id: 'workspace', icon: LayoutDashboard, label: 'Рабочая область' },
  { id: 'knowledge', icon: LibraryBig, label: 'База знаний', count: '24' },
  { id: 'content', icon: FileText, label: 'Контент', count: '08' },
  { id: 'history', icon: History, label: 'История' },
];

const viewMeta: Record<View, { overline: string; title: string }> = {
  workspace: { overline: 'PERSONAL RESEARCH STUDIO', title: 'Новое исследование' },
  knowledge: { overline: 'VERIFIED KNOWLEDGE', title: 'База знаний' },
  content: { overline: 'CONTENT LIBRARY', title: 'Контент' },
  history: { overline: 'RESEARCH ARCHIVE', title: 'История' },
};

const claims = [
  {
    confidence: 'Высокая',
    tone: 'high',
    marker: 'A',
    topic: 'Гипертрофия',
    status: 'verified',
    text: 'Для роста мышц не обязательно доводить каждый подход до полного отказа.',
    evidence: 'Совокупность обзоров и контролируемых исследований',
  },
  {
    confidence: 'Умеренная',
    tone: 'moderate',
    marker: 'B',
    topic: 'Интенсивность',
    status: 'provisional',
    text: 'При лёгких весах близость к отказу, вероятно, становится важнее.',
    evidence: 'Ограниченное число прямых сравнений',
  },
  {
    confidence: 'Умеренная',
    tone: 'moderate',
    marker: 'C',
    topic: 'Восстановление',
    status: 'verified',
    text: 'Регулярный отказ повышает острую усталость и может замедлять восстановление.',
    evidence: 'Исследования нервно-мышечной усталости',
  },
  {
    confidence: 'Недостаточно данных',
    tone: 'limited',
    marker: 'D',
    topic: 'Авторегуляция',
    status: 'disputed',
    text: 'Нельзя назвать одно универсальное число повторов в запасе для всех упражнений и людей.',
    evidence: 'Высокая индивидуальная вариативность',
  },
];

const knowledgeClusters = [
  { name: 'Все темы', count: 24, icon: BookOpenText },
  { name: 'Гипертрофия', count: 7, icon: Dumbbell },
  { name: 'Питание', count: 6, icon: Apple },
  { name: 'Восстановление', count: 5, icon: BedDouble },
  { name: 'Интенсивность', count: 4, icon: Activity },
  { name: 'Авторегуляция', count: 2, icon: CircleGauge },
];

const trendTopics = [
  {
    title: 'Медленные повторы действительно дают больше мышц?',
    angle: 'Популярное визуально убедительное утверждение, которое удобно разобрать через темп, усилие и тренировочный объём.',
    platforms: ['Instagram', 'Threads'],
    signal: 'Сильный потенциал',
    science: 'Хорошая научная база',
  },
  {
    title: 'Стоит ли делать 10 000 шагов, если вы уже тренируетесь?',
    angle: 'Узнаваемая цифра, понятная практическая дилемма и возможность отделить здоровье от расхода калорий.',
    platforms: ['Threads', 'Instagram'],
    signal: 'Широкий интерес',
    science: 'Хорошая научная база',
  },
  {
    title: 'Почему «кортизольное лицо» — слишком простое объяснение?',
    angle: 'Тема с высоким любопытством и хорошим потенциалом для спокойного разбора популярного упрощения.',
    platforms: ['Instagram'],
    signal: 'Контринтуитивно',
    science: 'Нужен осторожный разбор',
  },
];

const libraryItems: Array<{ format: Format; title: string; state: string; claims: number; updated: string }> = [
  { format: 'Reels', title: 'Отказ — это не пропуск в гипертрофию', state: 'Черновик', claims: 3, updated: 'Сегодня, 18:40' },
  { format: 'Telegram', title: 'Подход работает и без последнего кривого повтора', state: 'Готово', claims: 2, updated: 'Сегодня, 17:12' },
  { format: 'Карусель', title: '7 слайдов про тренировки до отказа', state: 'Редактура', claims: 4, updated: 'Вчера, 21:08' },
  { format: 'Threads', title: 'Почему усталость — не мерило эффективности', state: 'Идея', claims: 2, updated: '24 августа' },
];

const historyItems = [
  { date: '26 авг', time: '18:32', title: 'Тренировки до отказа и гипертрофия', detail: '4 claims · 6 источников · высокая уверенность', state: 'Завершено' },
  { date: '25 авг', time: '12:15', title: 'Оптимальная частота тренировок', detail: '5 claims · 9 источников · умеренная уверенность', state: 'Завершено' },
  { date: '23 авг', time: '20:44', title: 'Белок перед сном', detail: '3 claims · 7 источников · требуется обновление', state: 'Перепроверить' },
  { date: '21 авг', time: '09:10', title: 'Локальное жиросжигание', detail: '4 claims · 11 источников · высокая уверенность', state: 'Завершено' },
];

const contentByFormat: Record<Format, { title: string; meta: string; body: string[] }> = {
  Reels: {
    title: 'Отказ — это не пропуск в гипертрофию',
    meta: '35–45 секунд · говорящая голова · простой монтаж',
    body: [
      'Хук: «Если ты не довёл подход до отказа — он был бесполезным? Нет. Но есть нюанс».',
      'Для роста мышц важен достаточно тяжёлый стимул, а не обязательный финальный повтор любой ценой. Если ты остановился примерно за 1–3 повтора до отказа, подход всё ещё может отлично работать.',
      'Чем легче вес, тем важнее подойти ближе к пределу. А постоянный отказ часто покупает немного стимула ценой заметно большей усталости.',
      'Финал: Отказ — полезный инструмент. Просто он не обязан быть правилом каждого подхода.',
    ],
  },
  Telegram: {
    title: 'Подход работает и без последнего кривого повтора',
    meta: 'Короткий пост · 1 главная мысль · блок с источниками',
    body: [
      'Подход не перестаёт работать только потому, что вы не сделали последний кривой повтор.',
      'Для гипертрофии обычно достаточно закончить рабочий подход близко к отказу. Это даёт мышце сильный стимул, но позволяет лучше управлять усталостью и качеством следующих подходов.',
      'Практический ориентир: в большинстве рабочих сетов оставляйте 1–3 возможных повтора. Полный отказ можно точечно использовать там, где цена ошибки и усталости невелика.',
      'Важная оговорка: это не магическое число. Лёгкие веса, выбор упражнения и опыт человека меняют контекст.',
    ],
  },
  Threads: {
    title: 'Отказ — не доказательство хорошего подхода',
    meta: 'Одна мысль · разговорный тон · короткая цепочка без лекции',
    body: [
      'Иногда мы оцениваем подход не по тому, дал ли он мышце стимул, а по тому, насколько драматично он закончился.',
      'Если не было гримасы и последнего кривого повтора — будто бы «не доработал».',
      'Но отказ не делает подход автоматически эффективным. Часто он просто делает следующий подход хуже.',
      'Остановиться за 1–3 возможных повтора до предела — не халтура. Для роста мышц этого обычно достаточно.',
      'Отказ полезен как инструмент. Странно только превращать инструмент в обязательный ритуал.',
    ],
  },
  Карусель: {
    title: 'Нужно ли каждый подход делать до отказа?',
    meta: '7 слайдов · одна идея · один запоминающийся вывод',
    body: [
      '01 — Нужно ли каждый подход делать до отказа?',
      '02 — Популярная идея: без последнего повтора мышцы «не поймут».',
      '03 — Реальность: важна достаточная близость к пределу, а не сам отказ.',
      '04 — Практический ориентир: 1–3 повтора в запасе.',
      '05 — Чем легче вес, тем ближе к отказу может понадобиться работать.',
      '06 — Постоянный отказ добавляет усталость и не всегда — результат.',
      '07 — Отказ — инструмент, а не обязательный ритуал.',
    ],
  },
};

export default function Home() {
  const hasHydratedPreferences = useRef(false);
  const [topic, setTopic] = useState('Нужно ли тренироваться до отказа для роста мышц?');
  const [activeMode, setActiveMode] = useState<Mode>('Исследовать');
  const [status, setStatus] = useState<'idle' | 'working' | 'ready'>('ready');
  const [showAllClaims, setShowAllClaims] = useState(false);
  const [activeFormat, setActiveFormat] = useState<Format | null>(null);
  const [activeView, setActiveView] = useState<View>('workspace');
  const [theme, setTheme] = useState<Theme>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [activeCluster, setActiveCluster] = useState('Все темы');
  const [confidenceFilter, setConfidenceFilter] = useState('Все уровни');
  const [statusFilter, setStatusFilter] = useState('Все статусы');
  const [trendScoutOpen, setTrendScoutOpen] = useState(false);
  const [trendSource, setTrendSource] = useState('Instagram + Threads');

  const visibleClaims = showAllClaims ? claims : claims.slice(0, 2);
  const filteredClaims = claims.filter((claim) => {
    const matchesQuery = (claim.text + claim.topic + claim.confidence).toLowerCase().includes(knowledgeQuery.toLowerCase());
    const matchesCluster = activeCluster === 'Все темы' || claim.topic === activeCluster;
    const matchesConfidence = confidenceFilter === 'Все уровни' || claim.confidence === confidenceFilter;
    const matchesStatus = statusFilter === 'Все статусы' || claim.status === statusFilter;
    return matchesQuery && matchesCluster && matchesConfidence && matchesStatus;
  });
  const selectedContent = useMemo(
    () => activeFormat ? contentByFormat[activeFormat] : null,
    [activeFormat],
  );

  useEffect(() => {
    const syncViewFromHash = () => {
      const hash = window.location.hash.replace('#', '') as View;
      if (navItems.some((item) => item.id === hash)) setActiveView(hash);
    };
    const frame = window.requestAnimationFrame(() => {
      const storedTheme = window.localStorage.getItem('forme-theme') as Theme | null;
      if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);
      const storedSidebar = window.localStorage.getItem('forme-sidebar');
      if (storedSidebar === 'expanded') setSidebarCollapsed(false);
      document.documentElement.style.colorScheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
      syncViewFromHash();
      hasHydratedPreferences.current = true;
    });
    window.addEventListener('hashchange', syncViewFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', syncViewFromHash);
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedPreferences.current) return;
    window.localStorage.setItem('forme-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (!hasHydratedPreferences.current) return;
    window.localStorage.setItem('forme-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
  }, [sidebarCollapsed]);

  function navigate(view: View) {
    setActiveView(view);
    window.history.replaceState(null, '', '#' + view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startWork() {
    if (!topic.trim()) return;
    setStatus('working');
    setActiveFormat(null);
    window.setTimeout(() => setStatus('ready'), 1100);
  }

  function openFormat(format: Format) {
    setActiveView('workspace');
    setActiveFormat(format);
    window.history.replaceState(null, '', '#workspace');
    window.setTimeout(() => document.querySelector('.content-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function chooseTrend(title: string) {
    setTopic(title);
    setActiveMode('Исследовать');
    setTrendScoutOpen(false);
    window.setTimeout(() => document.getElementById('topic')?.focus(), 0);
  }

  return (
    <main className="app-shell" data-theme={theme} data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('workspace')} aria-label="Forme, на главную">
          <span className="brand-mark">F</span>
          <span className="brand-copy"><strong>Forme</strong><small>Fitness Content OS</small></span>
        </button>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          aria-label={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </button>

        <nav className="nav-list" aria-label="Основная навигация">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={'nav-item ' + (activeView === item.id ? 'active' : '')}
                key={item.id}
                onClick={() => navigate(item.id)}
                aria-current={activeView === item.id ? 'page' : undefined}
                aria-label={item.label}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span><Icon aria-hidden="true" /></span><b>{item.label}</b>{item.count && <em>{item.count}</em>}
              </button>
            );
          })}
        </nav>

        <div className="side-spacer" />
        <div className="integrity-card">
          <div className="integrity-orbit"><i /><i /><i /></div>
          <span>Evidence first</span>
          <p>Источники, их качество и итоговый вывод никогда не смешиваются.</p>
        </div>
        <button className="user-card" type="button">
          <span>ЕР</span>
          <span><strong>Евгений</strong><small>Личный проект</small></span>
          <MoreHorizontal aria-hidden="true" />
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="overline">{viewMeta[activeView].overline}</p>
            <p className="page-context">{activeView === 'workspace' ? 'Рабочая область' : 'Forme'} <span>/</span> {viewMeta[activeView].title}</p>
          </div>
          <div className="top-actions">
            <span className="sync-state"><i /> Всё сохранено</span>
            <button
              className="theme-toggle"
              onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              <span>{theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</span>
              <b>{theme === 'dark' ? 'Light' : 'Dark'}</b>
            </button>
            <button className="quiet-button" type="button" aria-label="Открыть палитру команд"><Command aria-hidden="true" /> K</button>
          </div>
        </header>

        <div className="view-frame" key={activeView}>
          {activeView === 'workspace' && (
            <>
              <section className="research-console">
                <div className="console-grid" aria-hidden="true" />
                <div className="console-main">
                  <span className="console-index">FORME / 001</span>
                  <h1>Сначала выясняем,<br />что <em>правда.</em></h1>
                  <p className="console-copy">И только потом превращаем доказательства в ясный, интересный контент.</p>

                  <div className="mode-switch" role="tablist" aria-label="Режим работы">
                    {modes.map((mode) => (
                      <button
                        className={activeMode === mode.name ? 'selected' : ''}
                        key={mode.name}
                        onClick={() => setActiveMode(mode.name)}
                        role="tab"
                        aria-selected={activeMode === mode.name}
                      >
                        <small>{mode.index}</small>{mode.name}
                      </button>
                    ))}
                  </div>

                  <div className="command-box">
                    <label htmlFor="topic">
                      {activeMode === 'Исследовать' && 'Какой вопрос разберём?'}
                      {activeMode === 'Создать' && 'На какую тему создаём контент?'}
                      {activeMode === 'Проверить' && 'Какой тезис или текст проверяем?'}
                    </label>
                    <textarea
                      id="topic"
                      rows={2}
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') startWork();
                      }}
                    />
                    <div className="command-footer">
                      <span><Command aria-hidden="true" /> Enter, чтобы запустить</span>
                      <button onClick={startWork} disabled={status === 'working' || !topic.trim()}>
                        {status === 'working' ? 'Анализирую…' : 'Начать'} <ArrowUpRight aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <button className="trend-trigger" onClick={() => setTrendScoutOpen((value) => !value)} aria-expanded={trendScoutOpen}>
                    <span><Sparkles aria-hidden="true" /></span>
                    <p><strong>Подобрать актуальную тему</strong><small>Trend Scout · виральность + научный потенциал</small></p>
                    {trendScoutOpen ? <ChevronUp aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
                  </button>

                  {trendScoutOpen && (
                    <section className="trend-scout">
                      <div className="trend-header">
                        <div><span>DEMO SIGNALS</span><h2>Что сейчас стоит исследовать</h2></div>
                        <label>Источники
                          <select value={trendSource} onChange={(event) => setTrendSource(event.target.value)}>
                            <option>Instagram + Threads</option>
                            <option>Instagram</option>
                            <option>Threads</option>
                          </select>
                        </label>
                      </div>
                      <p className="trend-disclaimer">Пока показана продуктовая демонстрация отбора. Реальные показатели свежести и роста появятся после подключения live-источников.</p>
                      <div className="trend-list">
                        {trendTopics.map((trend, index) => (
                          <article key={trend.title}>
                            <span className="trend-rank">0{index + 1}</span>
                            <div>
                              <div className="trend-tags"><span>{trend.signal}</span><span>{trend.science}</span></div>
                              <h3>{trend.title}</h3>
                              <p>{trend.angle}</p>
                              <small>{trend.platforms.join(' · ')}</small>
                            </div>
                            <button onClick={() => chooseTrend(trend.title)}>Исследовать <ArrowUpRight aria-hidden="true" /></button>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                <aside className="signal-panel" aria-label="Карта доказательств">
                  <div className="signal-caption"><span>Evidence map</span><b>LIVE</b></div>
                  <div className={'evidence-orbit ' + (status === 'working' ? 'is-active' : '')}>
                    <div className="orbit orbit-one" />
                    <div className="orbit orbit-two" />
                    <div className="orbit orbit-three" />
                    <i className="node node-a">A</i><i className="node node-b">B</i>
                    <i className="node node-c">C</i><i className="node node-d">D</i>
                    <div className="signal-core"><strong>4</strong><span>claims</span></div>
                  </div>
                  <div className="signal-legend">
                    <span><i className="high-dot" />1 высокая</span>
                    <span><i className="medium-dot" />2 умеренные</span>
                    <span><i className="low-dot" />1 недостаточно</span>
                  </div>
                </aside>
              </section>

              <section className="flow-strip" aria-label="Исследовательский процесс">
                <div className={status === 'working' ? 'complete' : ''}><span>01</span><p><strong>Найти</strong><small>релевантные работы</small></p></div><i />
                <div className={status === 'working' ? 'current' : ''}><span>02</span><p><strong>Оценить</strong><small>качество данных</small></p></div><i />
                <div><span>03</span><p><strong>Утверждать</strong><small>только допустимое</small></p></div><i />
                <div><span>04</span><p><strong>Объяснить</strong><small>простым языком</small></p></div>
              </section>

              <section className={'result-section ' + (status === 'working' ? 'is-loading' : '')}>
                <div className="section-title">
                  <div><p className="overline">ТЕКУЩИЙ РАЗБОР · ДЕМО</p><h2>{topic || 'Новая тема'}</h2></div>
                  <span className="result-status"><i />{status === 'working' ? 'Идёт оценка' : 'Готово к редактуре'}</span>
                </div>
                <div className="insight-grid">
                  <article className="verdict-card">
                    <div className="verdict-top"><span className="card-number">01</span><span className="confidence-pill high">Высокая уверенность</span></div>
                    <div className="verdict-content">
                      <p className="overline">ЧТО МОЖНО УТВЕРЖДАТЬ</p>
                      <h3>Отказ — инструмент,<br />а не обязательное<br /><em>условие роста.</em></h3>
                      <p>Если подход заканчивается достаточно близко к отказу, мышцы получают сильный стимул. Постоянный полный отказ может добавить усталости быстрее, чем пользы.</p>
                    </div>
                    <div className="practical-note"><span>Практический смысл</span><p>Большинство рабочих подходов можно заканчивать, когда в запасе остаётся примерно 1–3 повтора.</p><ArrowDownRight aria-hidden="true" /></div>
                  </article>

                  <section className="evidence-card">
                    <div className="evidence-header">
                      <div><p className="overline">EVIDENCE LEDGER</p><h3>Проверенные тезисы</h3></div>
                      <button onClick={() => setShowAllClaims((value) => !value)}>
                        {showAllClaims ? 'Свернуть' : 'Показать все'}
                        {showAllClaims ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                      </button>
                    </div>
                    <div className="claim-list">
                      {visibleClaims.map((claim) => (
                        <article className="claim" key={claim.text}>
                          <span className={'claim-marker ' + claim.tone}>{claim.marker}</span>
                          <div><span className={'claim-confidence ' + claim.tone}>{claim.confidence}</span><p>{claim.text}</p><small>{claim.evidence}</small></div>
                          <ArrowUpRight aria-hidden="true" />
                        </article>
                      ))}
                    </div>
                    <div className="ledger-note"><span>Разделение сохранено</span><p>Найденные работы → оценка качества → допустимый вывод → человеческое объяснение.</p></div>
                  </section>
                </div>
              </section>

              <section className="content-launcher">
                <div className="launcher-copy"><span className="launcher-index">02</span><div><p className="overline">CONTENT ENGINE</p><h2>Упаковать правду интересно.</h2><p>Один вывод — разные углы для каждой платформы.</p></div></div>
                <div className="format-buttons">
                  {(Object.keys(contentByFormat) as Format[]).map((format) => (
                    <button className={activeFormat === format ? 'chosen' : ''} key={format} onClick={() => setActiveFormat(format)}>
                      <span>{format}</span><ArrowUpRight aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>

              {selectedContent && (
                <section className="content-studio">
                  <div className="studio-header">
                    <div><p className="overline">{activeFormat} · ЧЕРНОВИК</p><h2>{selectedContent.title}</h2><span>{selectedContent.meta}</span></div>
                    <button onClick={() => setActiveFormat(null)} aria-label="Закрыть редактор"><X aria-hidden="true" /></button>
                  </div>
                  <div className="draft">
                    {selectedContent.body.map((paragraph, index) => (
                      <article key={paragraph}><span>{String(index + 1).padStart(2, '0')}</span><p>{paragraph}</p></article>
                    ))}
                  </div>
                  <aside className="factcheck">
                    <div><span><Check aria-hidden="true" /></span><p><strong>Фактчек пройден</strong><small>Использовано 2 ключевых claim · высокая / умеренная уверенность</small></p></div>
                    <p>Личный опыт не используется как доказательство. Категоричных утверждений сверх данных нет.</p>
                  </aside>
                </section>
              )}
            </>
          )}

          {activeView === 'knowledge' && (
            <section className="product-view">
              <div className="view-hero">
                <div><p className="overline">KNOWLEDGE BASE</p><h1>Не архив PDF.<br /><em>Карта того, что мы знаем.</em></h1><p>Каждый тезис хранится вместе с уверенностью, контекстом, ограничениями и источниками.</p></div>
                <div className="view-metric"><strong>24</strong><span>проверенных claims</span><small>6 требуют обновления</small></div>
              </div>
              <div className="stats-row">
                <article><span>Высокая уверенность</span><strong>11</strong><i className="high-bar" /></article>
                <article><span>Умеренная уверенность</span><strong>8</strong><i className="medium-bar" /></article>
                <article><span>Спорные / временные</span><strong>5</strong><i className="low-bar" /></article>
              </div>
              <section className="cluster-panel">
                <div className="cluster-heading"><div><p className="overline">TOPIC MAP</p><h2>Тематические кластеры</h2></div><span>Автоматическая группировка + ручные теги</span></div>
                <div className="cluster-grid">
                  {knowledgeClusters.map((cluster) => {
                    const Icon = cluster.icon;
                    return (
                      <button className={activeCluster === cluster.name ? 'active' : ''} key={cluster.name} onClick={() => setActiveCluster(cluster.name)}>
                        <i><Icon aria-hidden="true" /></i><span><strong>{cluster.name}</strong><small>{cluster.count} claims</small></span><ArrowUpRight aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </section>
              <div className="library-panel">
                <div className="library-toolbar">
                  <div><p className="overline">CLAIM LIBRARY</p><h2>Проверенные утверждения <span>{filteredClaims.length}</span></h2></div>
                  <label><Search aria-hidden="true" /><input value={knowledgeQuery} onChange={(event) => setKnowledgeQuery(event.target.value)} placeholder="Найти claim или тему" /></label>
                </div>
                <div className="filter-row">
                  <div className="filter-group"><span>Уверенность</span>
                    <select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)}>
                      <option>Все уровни</option><option>Высокая</option><option>Умеренная</option><option>Недостаточно данных</option>
                    </select>
                  </div>
                  <div className="filter-group"><span>Статус</span>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                      <option>Все статусы</option><option>verified</option><option>provisional</option><option>disputed</option>
                    </select>
                  </div>
                  <div className="filter-group"><span>Обновление</span><select defaultValue="Сначала свежие"><option>Сначала свежие</option><option>Требуют проверки</option><option>Сначала старые</option></select></div>
                  <button onClick={() => { setKnowledgeQuery(''); setActiveCluster('Все темы'); setConfidenceFilter('Все уровни'); setStatusFilter('Все статусы'); }}><RotateCcw aria-hidden="true" /> Сбросить</button>
                </div>
                <div className="knowledge-list">
                  {filteredClaims.map((claim) => (
                    <article key={claim.text}>
                      <span className={'claim-marker ' + claim.tone}>{claim.marker}</span>
                      <div className="knowledge-main"><div><span>{claim.topic}</span><em>{claim.status}</em></div><h3>{claim.text}</h3><p>{claim.evidence}</p></div>
                      <span className={'knowledge-confidence ' + claim.tone}>{claim.confidence}</span>
                      <button aria-label="Открыть claim"><ArrowUpRight aria-hidden="true" /></button>
                    </article>
                  ))}
                  {filteredClaims.length === 0 && <div className="empty-knowledge"><span><Search aria-hidden="true" /></span><h3>Ничего не найдено</h3><p>Измените запрос или сбросьте часть фильтров.</p></div>}
                </div>
              </div>
            </section>
          )}

          {activeView === 'content' && (
            <section className="product-view">
              <div className="view-hero content-hero">
                <div><p className="overline">CONTENT LIBRARY</p><h1>Одна научная база.<br /><em>Много сильных историй.</em></h1><p>Все материалы сохраняют связь с claims и источниками — даже после публикации.</p></div>
                <button className="hero-action" onClick={() => navigate('workspace')}>Создать материал <ArrowUpRight aria-hidden="true" /></button>
              </div>
              <div className="content-summary">
                <article><span>Всего материалов</span><strong>08</strong><small>за последние 30 дней</small></article>
                <article><span>Готово к публикации</span><strong>03</strong><small>проверены фактчеком</small></article>
                <article><span>В работе</span><strong>04</strong><small>черновики и редактура</small></article>
                <article><span>Новые идеи</span><strong>01</strong><small>из базы знаний</small></article>
              </div>
              <section className="platform-lanes">
                <div className="cluster-heading"><div><p className="overline">FORMAT PLAYBOOKS</p><h2>Отдельный язык каждой платформы</h2></div><span>Не копируем один текст между соцсетями</span></div>
                <div>
                  <button onClick={() => openFormat('Reels')}><span>R</span><p><strong>Reels</strong><small>Хук · речь · визуал · удержание</small></p><ArrowUpRight aria-hidden="true" /></button>
                  <button onClick={() => openFormat('Telegram')}><span>TG</span><p><strong>Telegram</strong><small>Контекст · польза · ясный вывод</small></p><ArrowUpRight aria-hidden="true" /></button>
                  <button className="threads-lane" onClick={() => openFormat('Threads')}><span>Th</span><p><strong>Threads</strong><small>Одна мысль · живой голос · обсуждение</small></p><ArrowUpRight aria-hidden="true" /></button>
                  <button onClick={() => openFormat('Карусель')}><span>IG</span><p><strong>Карусель</strong><small>Слайды · логика · визуальный ритм</small></p><ArrowUpRight aria-hidden="true" /></button>
                </div>
              </section>
              <div className="library-panel">
                <div className="library-toolbar"><div><p className="overline">RECENT WORK</p><h2>Последние материалы</h2></div><button className="filter-button"><SlidersHorizontal aria-hidden="true" /> Все форматы <ChevronDown aria-hidden="true" /></button></div>
                <div className="content-table">
                  {libraryItems.map((item, index) => (
                    <article key={item.title}>
                      <span className="item-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="format-badge">{item.format}</span>
                      <div><h3>{item.title}</h3><p>{item.claims} связанных claims · {item.updated}</p></div>
                      <span className={'item-state state-' + item.state.toLowerCase()}>{item.state}</span>
                      <button onClick={() => openFormat(item.format)} aria-label={`Открыть материал: ${item.title}`}><ArrowUpRight aria-hidden="true" /></button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeView === 'history' && (
            <section className="product-view">
              <div className="view-hero history-hero">
                <div><p className="overline">RESEARCH ARCHIVE</p><h1>Каждый вывод<br /><em>оставляет след.</em></h1><p>История исследований сохраняет изменения, противоречия и причины пересмотра выводов.</p></div>
                <div className="history-orbit"><span>12</span><small>research runs</small><i /><i /></div>
              </div>
              <div className="history-layout">
                <aside className="history-filter">
                  <p className="overline">ПЕРИОД</p>
                  <button className="active">Все исследования <span>12</span></button>
                  <button>Последние 7 дней <span>04</span></button>
                  <button>Требуют внимания <span>02</span></button>
                  <button>Обновлённые выводы <span>01</span></button>
                </aside>
                <div className="history-feed">
                  <div className="history-heading"><div><p className="overline">TIMELINE</p><h2>Последние исследования</h2></div><button>Экспорт истории <ArrowUpRight aria-hidden="true" /></button></div>
                  {historyItems.map((item) => (
                    <article key={item.title}>
                      <div className="history-date"><strong>{item.date}</strong><span>{item.time}</span></div>
                      <i />
                      <div><span className={'history-state ' + (item.state === 'Перепроверить' ? 'attention' : '')}>{item.state}</span><h3>{item.title}</h3><p>{item.detail}</p></div>
                      <button aria-label="Открыть исследование"><ArrowUpRight aria-hidden="true" /></button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <footer>
          <span>Forme / private beta</span>
          <p>Интерактивный MVP. Показанные разборы демонстрируют структуру продукта и не являются новым автоматическим научным поиском.</p>
        </footer>
      </section>
    </main>
  );
}
