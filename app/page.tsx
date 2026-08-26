'use client';

import { useMemo, useState } from 'react';

type Mode = 'Исследовать' | 'Создать' | 'Проверить';
type Format = 'Reels' | 'Telegram' | 'Карусель';

const modes: Array<{ name: Mode; index: string }> = [
  { name: 'Исследовать', index: '01' },
  { name: 'Создать', index: '02' },
  { name: 'Проверить', index: '03' },
];

const claims = [
  {
    confidence: 'Высокая',
    tone: 'high',
    marker: 'A',
    text: 'Для роста мышц не обязательно доводить каждый подход до полного отказа.',
    evidence: 'Совокупность обзоров и контролируемых исследований',
  },
  {
    confidence: 'Умеренная',
    tone: 'moderate',
    marker: 'B',
    text: 'При лёгких весах близость к отказу, вероятно, становится важнее.',
    evidence: 'Ограниченное число прямых сравнений',
  },
  {
    confidence: 'Умеренная',
    tone: 'moderate',
    marker: 'C',
    text: 'Регулярный отказ повышает острую усталость и может замедлять восстановление.',
    evidence: 'Исследования нервно-мышечной усталости',
  },
  {
    confidence: 'Недостаточно данных',
    tone: 'limited',
    marker: 'D',
    text: 'Нельзя назвать одно универсальное число повторов в запасе для всех упражнений и людей.',
    evidence: 'Высокая индивидуальная вариативность',
  },
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
  const [topic, setTopic] = useState('Нужно ли тренироваться до отказа для роста мышц?');
  const [activeMode, setActiveMode] = useState<Mode>('Исследовать');
  const [status, setStatus] = useState<'idle' | 'working' | 'ready'>('ready');
  const [showAllClaims, setShowAllClaims] = useState(false);
  const [activeFormat, setActiveFormat] = useState<Format | null>(null);
  const visibleClaims = showAllClaims ? claims : claims.slice(0, 2);
  const selectedContent = useMemo(
    () => activeFormat ? contentByFormat[activeFormat] : null,
    [activeFormat],
  );

  function startWork() {
    if (!topic.trim()) return;
    setStatus('working');
    setActiveFormat(null);
    window.setTimeout(() => setStatus('ready'), 1100);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Forme, на главную">
          <span className="brand-mark">F</span>
          <span className="brand-copy"><strong>Forme</strong><small>Fitness Content OS</small></span>
        </a>

        <nav className="nav-list" aria-label="Основная навигация">
          <a className="nav-item active" href="#workspace"><span>⌁</span><b>Рабочая область</b></a>
          <a className="nav-item" href="#knowledge"><span>◫</span><b>База знаний</b><em>24</em></a>
          <a className="nav-item" href="#content"><span>◇</span><b>Контент</b><em>08</em></a>
          <a className="nav-item" href="#roadmap"><span>↗</span><b>История</b></a>
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
          <b>•••</b>
        </button>
      </aside>

      <section className="workspace" id="workspace">
        <header className="topbar" id="top">
          <div>
            <p className="overline">PERSONAL RESEARCH STUDIO</p>
            <p className="page-context">Рабочая область <span>/</span> Новое исследование</p>
          </div>
          <div className="top-actions">
            <span className="sync-state"><i /> Всё сохранено</span>
            <button className="quiet-button" type="button">⌘ K</button>
          </div>
        </header>

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
                <span>⌘ Enter, чтобы запустить</span>
                <button onClick={startWork} disabled={status === 'working' || !topic.trim()}>
                  {status === 'working' ? 'Анализирую…' : 'Начать'} <i>↗</i>
                </button>
              </div>
            </div>
          </div>

          <aside className="signal-panel" aria-label="Карта доказательств">
            <div className="signal-caption"><span>Evidence map</span><b>LIVE</b></div>
            <div className={"evidence-orbit " + (status === 'working' ? 'is-active' : '')}>
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <i className="node node-a">A</i>
              <i className="node node-b">B</i>
              <i className="node node-c">C</i>
              <i className="node node-d">D</i>
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
          <div className={status === 'working' ? 'complete' : ''}><span>01</span><p><strong>Найти</strong><small>релевантные работы</small></p></div>
          <i />
          <div className={status === 'working' ? 'current' : ''}><span>02</span><p><strong>Оценить</strong><small>качество данных</small></p></div>
          <i />
          <div><span>03</span><p><strong>Утверждать</strong><small>только допустимое</small></p></div>
          <i />
          <div><span>04</span><p><strong>Объяснить</strong><small>простым языком</small></p></div>
        </section>

        <section className={"result-section " + (status === 'working' ? 'is-loading' : '')} id="knowledge">
          <div className="section-title">
            <div>
              <p className="overline">ТЕКУЩИЙ РАЗБОР · ДЕМО</p>
              <h2>{topic || 'Новая тема'}</h2>
            </div>
            <span className="result-status"><i />{status === 'working' ? 'Идёт оценка' : 'Готово к редактуре'}</span>
          </div>

          <div className="insight-grid">
            <article className="verdict-card">
              <div className="verdict-top">
                <span className="card-number">01</span>
                <span className="confidence-pill high">Высокая уверенность</span>
              </div>
              <div className="verdict-content">
                <p className="overline">ЧТО МОЖНО УТВЕРЖДАТЬ</p>
                <h3>Отказ — инструмент,<br />а не обязательное<br /><em>условие роста.</em></h3>
                <p>Если подход заканчивается достаточно близко к отказу, мышцы получают сильный стимул. Постоянный полный отказ может добавить усталости быстрее, чем пользы.</p>
              </div>
              <div className="practical-note">
                <span>Практический смысл</span>
                <p>Большинство рабочих подходов можно заканчивать, когда в запасе остаётся примерно 1–3 повтора.</p>
                <b>↘</b>
              </div>
            </article>

            <section className="evidence-card">
              <div className="evidence-header">
                <div><p className="overline">EVIDENCE LEDGER</p><h3>Проверенные тезисы</h3></div>
                <button onClick={() => setShowAllClaims((value) => !value)}>
                  {showAllClaims ? 'Свернуть' : 'Показать все'} <span>{showAllClaims ? '↑' : '↓'}</span>
                </button>
              </div>
              <div className="claim-list">
                {visibleClaims.map((claim) => (
                  <article className="claim" key={claim.text}>
                    <span className={"claim-marker " + claim.tone}>{claim.marker}</span>
                    <div>
                      <span className={"claim-confidence " + claim.tone}>{claim.confidence}</span>
                      <p>{claim.text}</p>
                      <small>{claim.evidence}</small>
                    </div>
                    <b>↗</b>
                  </article>
                ))}
              </div>
              <div className="ledger-note">
                <span>Разделение сохранено</span>
                <p>Найденные работы → оценка качества → допустимый вывод → человеческое объяснение.</p>
              </div>
            </section>
          </div>
        </section>

        <section className="content-launcher" id="content">
          <div className="launcher-copy">
            <span className="launcher-index">02</span>
            <div><p className="overline">CONTENT ENGINE</p><h2>Упаковать правду интересно.</h2><p>Один вывод — разные углы для каждой платформы.</p></div>
          </div>
          <div className="format-buttons">
            {(Object.keys(contentByFormat) as Format[]).map((format) => (
              <button
                className={activeFormat === format ? 'chosen' : ''}
                key={format}
                onClick={() => setActiveFormat(format)}
              >
                <span>{format}</span><i>↗</i>
              </button>
            ))}
          </div>
        </section>

        {selectedContent && (
          <section className="content-studio">
            <div className="studio-header">
              <div>
                <p className="overline">{activeFormat} · ЧЕРНОВИК</p>
                <h2>{selectedContent.title}</h2>
                <span>{selectedContent.meta}</span>
              </div>
              <button onClick={() => setActiveFormat(null)} aria-label="Закрыть редактор">×</button>
            </div>
            <div className="draft">
              {selectedContent.body.map((paragraph, index) => (
                <article key={paragraph}><span>{String(index + 1).padStart(2, '0')}</span><p>{paragraph}</p></article>
              ))}
            </div>
            <aside className="factcheck">
              <div><span>✓</span><p><strong>Фактчек пройден</strong><small>Использовано 2 ключевых claim · высокая / умеренная уверенность</small></p></div>
              <p>Личный опыт не используется как доказательство. Категоричных утверждений сверх данных нет.</p>
            </aside>
          </section>
        )}

        <footer id="roadmap">
          <span>Forme / private beta</span>
          <p>Интерактивный MVP. Показанный разбор демонстрирует структуру продукта и не является новым автоматическим научным поиском.</p>
        </footer>
      </section>
    </main>
  );
}
