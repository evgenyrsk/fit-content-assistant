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
- [x] Заложить provider-neutral LLM boundary для OpenAI, OpenRouter и RouterAI.
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
- [x] Подключить выбранный LLM-провайдер в production.
  - [x] Реализовать OpenAI/OpenRouter/RouterAI adapters, строгие схемы и provider-neutral runtime.
  - [x] Добавить безопасный status/live probe для research и content routes.
  - [x] Зафиксировать экономные RouterAI-модели и честную privacy-маркировку.
  - [x] Сохранить серверный RouterAI key и подтвердить live probe.
- [x] Провести первый RouterAI smoke-eval research/content маршрутов и зафиксировать ограничения.
- [x] Выделить независимую review-role и пройти восьмикейсный blocking eval без unsafe approvals.
- [ ] Проверить прямой OpenAI, OpenRouter и RouterAI на одном eval-наборе, затем выбрать primary/fallback по качеству, функциям, задержке и стоимости.
- [x] Реализовать strict schema и prompt contract для первого этапа `research_plan`.
- [x] Сохранять `model_runs` и `audit_events` для модельного research plan.
- [ ] Реализовать строгие схемы остальных этапов LLM-конвейера.
  - [x] `source_assessment`: все измерения, design-specific checks, finding и provenance.
  - [x] `body_assessment`: пять GRADE-доменов, contradictions и certainty gate.
  - [x] `claim_synthesis`: атомарный claim, scope, limitations, evidence ids и review date.
  - [x] Content brief, platform draft, voice edit и final fact review.
- [x] Поиск PubMed/Crossref по одному вопросу с сохранением source candidates.
- [x] Добавить широкий deterministic PubMed fallback к модельному плану и повторное использование eligible full text из канонического архива.
- [x] Пакетная загрузка PubMed-аннотаций и сохранение секций как provenance chunks.
- [x] Разделить search history и исследовательский архив; добавить deterministic source intake с причинами отказа.
- [x] Нормализовать идентичность PubMed/DOI без дублей и сохранить совместимость с ранними записями.
- [x] В live evidence review приоритизировать разрешённый full text над abstract-only контекстом.
- [x] Ограничить пакет Methods/Results для source assessment и не тратить LLM-бюджет UI на abstract-only контекст.
- [x] Выделить достаточный token budget для строгих assessment-контрактов и показывать безопасную причину fail-closed отказа.
  - [x] После production-регрессии поднять economy source-assessment budget до 5200 tokens и ограничить длину rationales без ослабления схемы.
  - [x] После трёхкейсной live-регрессии добавить один bounded repair-проход и увеличить запас полного source-assessment контракта без ослабления gate.
- [x] Использовать короткие passage aliases в LLM-контракте и восстанавливать исходные provenance IDs только на сервере.
- [x] Запретить abstract-only источникам открывать evidence gate.
- [x] Подключить Google Trends/News proxy и PubMed Research Pulse с явной маркировкой типа сигнала.
- [x] Реализовать прямые Threads/Instagram adapters и явные состояния подключения.
- [x] Опубликовать изолированный Meta review-контур с privacy и data deletion URL.
- [x] Активировать Tech Provider, создать черновик Meta App Review и подготовить review-настройки для Threads.
- [x] Зафиксировать личный Threads Development Mode и отложить публичный App Review до многопользовательского сценария.
- [x] Активировать прямые Threads signals для владельца и добавить безопасную диагностику доступа.
- [ ] Активировать прямые Instagram signals после выдачи разрешений и сохранения Meta token.
- [x] Реализовать provider-neutral structured source/body assessment с audit trail; реальный запуск ждёт LLM secret и full text.
- [x] Добавить рабочий UI для live source assessments и body synthesis с блокировкой claim до human review.
- [x] Добавить append-only human review для source/body assessments; в synthesis допускаются только подтверждённые оценки, hard stops не переопределяются.
- [x] Добавить provenance-linked краткий разбор статьи и прозрачный review index 0–100 с диапазоном, coverage и gate caps.
- [x] Перевести source/body appraisal на отдельную review-модель; дешёвая research-модель остаётся на discovery и планировании.
- [x] Реализовать versioned сохранение model-draft claims с confidence, limitations и evidence links; approval остаётся заблокированным.
- [x] Подключить live-переход `confirmed body → model claim draft → needs_review` без автоматического approval.
- [x] Подключить inline human claim review и сквозной переход к генерации строго на выбранной approved claim version.
- [x] Добавить честную live-карту канонических claims, рабочую командную панель и возврат research query из истории.
- [x] Создание review-required Reels, Telegram, Threads и каруселей на основе свежих approved claims.
- [x] Трассировка content fragment → claim version; переход к source обеспечивается канонической claim evidence-связью.
- [x] Связать успешный fact-check с каноническим архивом, финальной human review, календарём и публикационным статусом.
- [ ] Полный regression eval-набор и blocking release gates.
  - [x] Локальный deterministic blocking-набор: сильный, пограничный, противоречивый и отозванный сценарии.
  - [x] Десятикейсная матрица deterministic retrieval fallback для основных фитнес-тем.
  - [x] Blocking tests для ручного контента, fact-check, календаря и CSV-метрик.
  - [x] Двадцатикейсный PICO retrieval fixture-gate с `precision@1` и `recall@3`.
  - [ ] Модельные и экспертно размеченные graders после подключения LLM и калибровки.
- [ ] Провести голосовое или текстовое challenge-интервью и утвердить style profile v1.

## Этап 3 — Рабочая база знаний

- [x] Поиск и комбинируемые фильтры по каноническим claims.
- [x] Версионирование и `superseded` в persistence-контуре.
- [ ] Раздельные retrieval-индексы evidence chunks и approved claims.
  - [x] Раздельные lexical query paths и типизированная выдача без смешивания сущностей.
  - [ ] Физические FTS/vector namespaces и измеримый recall.
- [ ] Hybrid retrieval и reranking с измеримым recall.
- [ ] Полный workflow повторного исследования устаревших тезисов.
  - [x] Автоматическое обнаружение, уведомление и блокировка просроченных claims.
- [ ] Telegram, Threads, карусели и Stories.
- [x] Импорт пользовательских заметок и личного опыта с маркировкой `narrative_only`.

## Автономный трек без LLM

- [x] Versioned intake-gate для PubMed sources без эвристики «престижности».
- [x] PubMed Central Open Access full-text ingestion, license allowlist и section completeness gate.
- [x] Постоянная Source Inbox с full-text/intake/revalidation фильтрами.
- [x] Ручной импорт законно полученных PDF с rights attestation, private object storage и дедупликацией.
- [x] Ручной source review и аудируемый override.
- [ ] Перепроверка corrections, expressions of concern и retractions.
  - [x] Пакетная перепроверка просроченных PubMed-записей по запросу пользователя с audit trail.
  - [x] Автопроверка просроченных PubMed-записей один раз за открытую сессию и in-app уведомления.
  - [ ] Внешний фоновый scheduler для проверки при закрытом приложении.
- [x] Lexical search по source chunks и каноническим claims с раздельной выдачей.
- [x] Ручное создание/утверждение claims с full-text evidence-трассировкой и отдельным human gate.
- [ ] Реальный D1-архив контента, статусы и календарь.
  - [x] Сохранение traceable content items, fragments, claim links, model runs и audit events.
  - [x] Рабочий интерфейс канонического архива без demo data.
  - [x] Ручные статусы, version history, human fact-check, календарь и планирование публикаций.

## Этап 4 — Content intelligence

- [x] Банк тем на основе пробелов, противоречий и честно маркированных trend signals.
- [x] Архив публикаций со ссылкой и неизменяемыми version snapshots.
- [x] Ручные метрики просмотров, сохранений, репостов и CSV-импорт snapshots.
- [ ] Анализ того, какие способы объяснения лучше работают у конкретного автора.

## Ближайший измеримый результат

Основной вертикальный контур собран: вопрос → источники → source/body review → claim draft → human claim approval → генерация строго на выбранной claim version → независимый fact-check → human review → календарь/публикация/метрики. Production smoke-сценарий подтвердил live RouterAI, PubMed discovery, full-text assessment и корректную fail-closed блокировку: нерелевантное исследование получило 15/100 и не открыло claim/content gate.

Следующий измеримый шаг — повысить полезность поиска, не ослабляя научные ограничения:

1. [x] Собрать первый 20-кейсный fixture-набор; [ ] заменить синтетическую релевантность экспертной разметкой реальной PubMed-выдачи и измерять `recall@10`, долю релевантных full text и долю нерелевантных кандидатов.
2. [x] Добавить PICO-aware title/metadata reranking и разделить intervention/target outcome; [ ] добавить abstract-aware второй проход и проверить разнообразие типов исследований на реальной выдаче.
3. Расширить законное full-text покрытие и повторное использование уже импортированных PDF.
4. Собрать экспертно размеченный eval-набор и откалибровать шкалы доверия и допустимый публичный язык.
5. Провести первый полностью подтверждённый human-gated сценарий и только после этого оценивать автономизацию approval.

После научного P1: расширить прямые trend signals, подключить Instagram, добавить контроль срока Meta token, фоновые retraction checks, мониторинг стоимости/ошибок и физическую переносимость на Timeweb. Challenge-интервью для style profile остаётся отдельным пользовательским этапом. Timeweb принят как российский portability target до начала физической миграции.
