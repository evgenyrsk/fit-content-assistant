# Roadmap

## Этап 0 — Product foundation

- [x] Зафиксировать исходный бриф.
- [x] Создать репозиторий и историю изменений.
- [x] Сделать интерактивный интерфейс MVP.
- [x] Опубликовать приватную версию.
- [x] Добавить светлую и тёмную темы.
- [x] Сделать рабочую навигацию между основными разделами MVP.
- [x] Зафиксировать продуктовые инструкции в репозиторном `AGENTS.md`.
- [x] Добавить самостоятельный Threads playbook.
- [x] Спроектировать тематические кластеры и комбинируемые фильтры базы знаний.
- [x] Добавить UX Trend Scout с честной маркировкой демонстрационных сигналов.
- [x] Перевести интерфейсные иконки на единый SVG-набор и закрепить правила иконографии.
- [x] Оформить development environment, CI quality gate и Definition of Done.
- [x] Зафиксировать LLM-конвейер, eval-gates и claim-first hybrid RAG.
- [x] Заложить provider-neutral LLM boundary для OpenAI и OpenRouter.
- [x] Сделать боковую навигацию компактной и раскрываемой.
- [x] Принять модульный монолит, SOLID-правила, ADR-процесс и автоматические архитектурные ограничения.
- [x] Разделить крупный UI и глобальные стили по feature-границам и ответственности.
- [ ] Подключить GitHub после повторной авторизации.

## Этап 1 — Протокол научной достоверности (блокирующий)

Этот этап выполняется до публикации первого автоматически подготовленного научного материала. Он определяет не «красивый балл», а воспроизводимый процесс ответа на вопрос: насколько конкретному выводу можно доверять и где заканчивается область его применимости.

- [x] Реализовать draft v0.2: раздельные result-level appraisal и body-level certainty.
- [x] Добавить маршрутизацию основных дизайнов к RoB 2, ROBINS-I/E, QUADAS-3 и AMSTAR 2 без копирования лицензированных форм.
- [x] Реализовать детерминированные hard stops, human-review reasons и запрет автоматического claim approval до калибровки.
- [x] Добавить domain contract tests для study gate и body gate.
- [x] Добавить дизайн-специфичные machine-readable checks для RCT, observational, diagnostic и systematic review.

- [ ] Утвердить отдельные шкалы внутренней валидности, прозрачности отчётности, применимости, согласованности корпуса данных и конфликтов интересов.
- [x] Описать draft-критерии для разных типов вопросов и дизайнов исследований; не использовать одну механическую иерархию для всех случаев.
- [x] Зафиксировать hard stops, red flags, факторы снижения доверия и правила ручной эскалации.
- [x] Описать draft-оценку регистрации протокола, выборки и мощности, рандомизации и ослепления, attrition, исходов, статистики, множественных сравнений и selective reporting.
- [x] Описать draft-оценку финансирования, роли спонсора, конфликтов интересов, открытости данных/кода, исправлений и ретракций.
- [ ] Добавить оценку воспроизводимости, согласованности с совокупностью данных, publication bias, прямоты и внешней валидности.
- [ ] Сопоставить результат проверки с уровнями confidence и допустимым языком публичного вывода.
- [x] Реализовать deterministic policy допустимого публичного языка по confidence и review status.
- [ ] Собрать экспертно размеченный eval-набор: сильные, пограничные, противоречивые и отозванные исследования.
- [ ] Провести калибровку с участием человека и установить минимальный порог согласия перед автоматизацией gate.

Выход этапа: версия методологии, чек-листы по дизайнам, машиночитаемая схема оценки, примеры решений и blocking gate. Рабочий контур зафиксирован в `EVIDENCE_RELIABILITY.md`.

## Этап 2 — Реальный вертикальный сценарий

- [x] Схема D1 для claims, sources, research runs, trend signals, audit trail и content items.
- [ ] Реализовать адаптер выбранного LLM-провайдера и серверные секреты.
- [ ] Проверить прямой OpenAI и OpenRouter на одном eval-наборе, затем выбрать primary/fallback по качеству, функциям, задержке и стоимости.
- [x] Реализовать strict schema и prompt contract для первого этапа `research_plan`.
- [x] Сохранять `model_runs` и `audit_events` для модельного research plan.
- [ ] Реализовать строгие схемы остальных этапов LLM-конвейера.
  - [x] `source_assessment`: все измерения, design-specific checks, finding и provenance.
  - [x] `body_assessment`: пять GRADE-доменов, contradictions и certainty gate.
  - [x] `claim_synthesis`: атомарный claim, scope, limitations, evidence ids и review date.
  - [ ] Content brief, platform draft, voice edit и final fact review.
- [x] Поиск PubMed/Crossref по одному вопросу с сохранением source candidates.
- [x] Пакетная загрузка PubMed-аннотаций и сохранение секций как provenance chunks.
- [x] Разделить search history и исследовательский архив; добавить deterministic source intake с причинами отказа.
- [x] Запретить abstract-only источникам открывать evidence gate.
- [x] Подключить Google Trends/News proxy и PubMed Research Pulse с явной маркировкой типа сигнала.
- [ ] Подключить прямые Threads/Instagram signals после получения разрешённых Meta tokens.
- [x] Реализовать provider-neutral structured source/body assessment с audit trail; реальный запуск ждёт LLM secret и full text.
- [x] Реализовать versioned сохранение model-draft claims с confidence, limitations и evidence links; approval остаётся заблокированным.
- [ ] Создание Reels на основе сохранённых claims.
- [ ] Трассировка content → claims → sources.
- [ ] Regression eval-набор и blocking release gates.
- [ ] Провести голосовое или текстовое challenge-интервью и утвердить style profile v1.

## Этап 3 — Рабочая база знаний

- [x] Поиск и комбинируемые фильтры по каноническим claims.
- [x] Версионирование и `superseded` в persistence-контуре.
- [ ] Раздельные индексы evidence chunks и approved claims.
- [ ] Hybrid retrieval и reranking с измеримым recall.
- [ ] Повторная проверка устаревших тезисов.
- [ ] Telegram, Threads, карусели и Stories.
- [ ] Импорт пользовательских заметок и личного опыта с явной маркировкой.

## Автономный трек без LLM

- [x] Versioned intake-gate для PubMed sources без эвристики «престижности».
- [x] PubMed Central Open Access full-text ingestion, license allowlist и section completeness gate.
- [x] Постоянная Source Inbox с full-text/intake/revalidation фильтрами.
- [ ] Ручной source review и аудируемый override.
- [ ] Перепроверка corrections, expressions of concern и retractions.
- [ ] Lexical search по source chunks и каноническим claims.
- [ ] Ручное создание/утверждение claims с полной evidence-трассировкой.
- [ ] Реальный D1-архив контента, статусы и календарь.

## Этап 4 — Content intelligence

- [ ] Банк тем на основе пробелов и противоречий в базе.
- [ ] Архив публикаций.
- [ ] Метрики просмотров, удержания, сохранений и репостов.
- [ ] Анализ того, какие способы объяснения лучше работают у конкретного автора.

## Ближайший измеримый результат

Подключены серверная LLM и разрешённый full-text источник; затем один реальный вопрос проходит source/body review до утверждённого claim и сохранённого Reels-сценария с проверяемой трассировкой.
