'use client';

import { useMemo, useState } from 'react';

type Mode = 'Исследовать' | 'Создать' | 'Проверить';
type Format = 'Reels' | 'Telegram' | 'Карусель';

const modes: Mode[] = ['Исследовать', 'Создать', 'Проверить'];
const allClaims = [
  {
    confidence: 'Высокая уверенность',
    tone: 'strong',
    text: 'Для роста мышц не обязательно доводить каждый подход до полного отказа.',
    evidence: 'Совокупность обзоров и контролируемых исследований',
  },
  {
    confidence: 'Умеренная уверенность',
    tone: 'moderate',
    text: 'При лёгких весах близость к отказу, вероятно, становится важнее.',
    evidence: 'Ограниченное число прямых сравнений',
  },
  {
    confidence: 'Умеренная уверенность',
    tone: 'moderate',
    text: 'Регулярный отказ повышает острую усталость и может замедлять восстановление.',
    evidence: 'Исследования нервно-мышечной усталости',
  },
  {
    confidence: 'Данных недостаточно',
    tone: 'limited',
    text: 'Нельзя назвать одно универсальное число повторов в запасе для всех упражнений и людей.',
    evidence: 'Высокая индивидуальная вариативность',
  },
];

const contentByFormat: Record<Format, { title: string; body: string[] }> = {
  Reels: {
    title: 'Сценарий Reels · 35–45 секунд',
    body: [
      'Хук: «Если ты не довёл подход до отказа — он был бесполезным? Нет. Но есть нюанс».',
      'Основная часть: Для роста мышц важен достаточно тяжёлый стимул, а не обязательный финальный повтор любой ценой. Если ты остановился примерно за 1–3 повтора до отказа, подход всё ещё может отлично работать.',
      'Нюанс: Чем легче вес, тем важнее подойти ближе к пределу. А постоянный отказ часто покупает немного стимула ценой заметно большей усталости.',
      'Финал: Отказ — полезный инструмент. Просто он не обязан быть правилом каждого подхода.',
    ],
  },
  Telegram: {
    title: 'Черновик Telegram-поста',
    body: [
      'Подход не перестаёт работать только потому, что вы не сделали последний кривой повтор.',
      'Для гипертрофии обычно достаточно закончить рабочий подход близко к отказу. Это даёт мышце сильный стимул, но позволяет лучше управлять усталостью и качеством следующих подходов.',
      'Практический ориентир: в большинстве рабочих сетов оставляйте 1–3 возможных повтора. Полный отказ можно точечно использовать там, где цена ошибки и усталости невелика.',
      'Важная оговорка: это не магическое число. Лёгкие веса, выбор упражнения и опыт человека меняют контекст.',
    ],
  },
  Карусель: {
    title: 'Структура карусели · 7 слайдов',
    body: [
      '1. Нужно ли каждый подход делать до отказа?',
      '2. Популярная идея: без последнего повтора мышцы «не поймут».',
      '3. Реальность: важна достаточная близость к пределу, а не сам отказ.',
      '4. Большинство рабочих подходов: ориентир 1–3 повтора в запасе.',
      '5. Чем легче вес, тем ближе к отказу может понадобиться работать.',
      '6. Постоянный отказ добавляет усталость и не всегда — дополнительный результат.',
      '7. Вывод: отказ — инструмент, а не обязательный ритуал.',
    ],
  },
};

export default function Home() {
  const [topic, setTopic] = useState('Нужно ли тренироваться до отказа для роста мышц?');
  const [activeMode, setActiveMode] = useState<Mode>('Исследовать');
  const [status, setStatus] = useState<'idle' | 'working' | 'ready'>('ready');
  const [showAllClaims, setShowAllClaims] = useState(false);
  const [activeFormat, setActiveFormat] = useState<Format | null>(null);
  const visibleClaims = showAllClaims ? allClaims : allClaims.slice(0, 2);
  const selectedContent = useMemo(
    () => activeFormat ? contentByFormat[activeFormat] : null,
    [activeFormat],
  );

  function startWork() {
    setStatus('working');
    setActiveFormat(null);
    window.setTimeout(() => setStatus('ready'), 950);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <div>
            <strong>Forme</strong>
            <span>Content OS</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Основная навигация">
          <a className="nav-item active" href="#workspace"><span>✦</span> Рабочая область</a>
          <a className="nav-item" href="#knowledge"><span>◫</span> База знаний <b>24</b></a>
          <a className="nav-item" href="#ideas"><span>◇</span> Идеи <b>8</b></a>
          <a className="nav-item" href="#content"><span>▤</span> Контент</a>
        </nav>

        <div className="sidebar-note">
          <span>Научная честность</span>
          <p>Сначала выясняем, что правда. Потом ищем сильную подачу.</p>
        </div>
      </aside>

      <section className="workspace" id="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">РАБОЧАЯ ОБЛАСТЬ</p>
            <h1>Из вопроса — в точный контент</h1>
          </div>
          <div className="profile" aria-label="Профиль автора">
            <span>ЕР</span>
            <div><strong>Автор</strong><small>Личный проект</small></div>
          </div>
        </header>

        <div className="command-card">
          <div className="mode-switch" role="tablist" aria-label="Режим работы">
            {modes.map((mode) => (
              <button
                className={activeMode === mode ? 'selected' : ''}
                key={mode}
                onClick={() => setActiveMode(mode)}
                role="tab"
                aria-selected={activeMode === mode}
              >
                {mode}
              </button>
            ))}
          </div>
          <label htmlFor="topic">
            {activeMode === 'Исследовать' && 'Какой вопрос разберём?'}
            {activeMode === 'Создать' && 'На какую тему создаём контент?'}
            {activeMode === 'Проверить' && 'Какой тезис или текст проверяем?'}
          </label>
          <div className="command-row">
            <input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
            <button className="primary-button" onClick={startWork} disabled={status === 'working'}>
              {status === 'working' ? 'Проверяю данные…' : activeMode} <span>→</span>
            </button>
          </div>
          <p className="hint">Сначала база знаний, затем свежие источники. Контент создаётся только после проверки тезисов.</p>
          {status === 'working' && (
            <div className="pipeline" role="status" aria-live="polite">
              <span className="done">База знаний</span><i />
              <span className="active-step">Оценка доказательств</span><i />
              <span>Вывод</span>
            </div>
          )}
        </div>

        <div className="section-heading">
          <div>
            <p className="eyebrow">ТЕКУЩЕЕ ИССЛЕДОВАНИЕ</p>
            <h2>{topic || 'Новая тема'}</h2>
          </div>
          <span className={"status " + (status === 'working' ? 'is-working' : '')}><i /> {status === 'working' ? 'Проверяется' : 'Разобрано'}</span>
        </div>

        <div className={"research-grid " + (status === 'working' ? 'loading-result' : '')}>
          <article className="summary-card">
            <p className="card-label">ЧТО МОЖНО УТВЕРЖДАТЬ</p>
            <h3>Отказ — инструмент, а не обязательное условие роста мышц.</h3>
            <p>Если подход заканчивается достаточно близко к отказу, мышцы получают сильный стимул. Постоянный полный отказ может добавить усталости быстрее, чем пользы.</p>
            <div className="practical">
              <span>Практический смысл</span>
              <p>Большинство рабочих подходов можно заканчивать, когда в запасе остаётся примерно 1–3 повтора.</p>
            </div>
            <div className="separation-note">
              <span>Важно</span>
              <p>Найденные работы, оценка их качества и итоговый вывод хранятся отдельно. Этот экран показывает только то, что прошло проверку.</p>
            </div>
          </article>

          <section className="claims-card" id="knowledge">
            <div className="card-header">
              <p className="card-label">ПРОВЕРЕННЫЕ ТЕЗИСЫ</p>
              <button onClick={() => setShowAllClaims((value) => !value)}>
                {showAllClaims ? 'Свернуть ↑' : 'Все 4 →'}
              </button>
            </div>
            {visibleClaims.map((claim) => (
              <article className="claim" key={claim.text}>
                <span className={"confidence " + claim.tone}>{claim.confidence}</span>
                <p>{claim.text}</p>
                <small>{claim.evidence}</small>
              </article>
            ))}
          </section>
        </div>

        <section className="next-step" id="content">
          <div>
            <p className="eyebrow">СЛЕДУЮЩИЙ ШАГ</p>
            <h2>Превратить выводы в контент</h2>
          </div>
          <div className="format-buttons">
            {(Object.keys(contentByFormat) as Format[]).map((format) => (
              <button
                className={activeFormat === format ? 'chosen' : ''}
                key={format}
                onClick={() => setActiveFormat(format)}
              >
                {format} <span>→</span>
              </button>
            ))}
          </div>
        </section>

        {selectedContent && (
          <section className="content-studio" id="ideas">
            <div className="studio-header">
              <div>
                <p className="eyebrow">КОНТЕНТ-РЕДАКТОР</p>
                <h2>{selectedContent.title}</h2>
              </div>
              <button onClick={() => setActiveFormat(null)} aria-label="Закрыть редактор">×</button>
            </div>
            <div className="draft">
              {selectedContent.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <aside className="factcheck">
              <strong>Фактчек</strong>
              <span>2 основных тезиса · уверенность высокая / умеренная</span>
              <p>Личный опыт не используется как доказательство. Категоричных утверждений сверх данных нет.</p>
            </aside>
          </section>
        )}

        <p className="demo-disclaimer">Интерактивный MVP: показанные результаты — демонстрационный пример структуры, а не новый автоматический научный поиск.</p>
      </section>
    </main>
  );
}
