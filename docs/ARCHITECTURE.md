# Архитектура

## Подход к эволюции

Forme — модульный монолит с явными feature-границами и направлением зависимостей в стиле Clean Architecture. Мы сохраняем один deployable продукт, пока нет измеримой причины для распределённой системы, но каждый доменный модуль имеет seam для замены adapter или будущего выделения. Правила и лимиты: `CODE_ORGANIZATION.md`; решение: ADR-0003.

`app → feature UI → application use cases → domain`

`infrastructure → application ports → domain`

API routes служат composition root, а не содержат бизнес-правила. Текущий вертикальный срез связывает provider-neutral research planning, PubMed/Crossref, пакетное сохранение PubMed-аннотаций, fail-closed evidence gates и D1 audit trail через `/api/research`; публичные live proxies, опциональный Threads adapter и историю trend signals — через `/api/trends`.

## Поток данных

`LLM Provider Adapter → LLM Orchestrator → Research Engine → Evidence Engine → Knowledge Base → Content Engine → Independent review`

LLM связывает этапы и управляет инструментами, но не является источником истины. Канонические научные данные живут в версионируемой базе; каждый этап имеет отдельную схему ответа и gate. Подробности: `AI_SYSTEM.md`.

### LLM Provider Layer

- доменные этапы зависят только от внутреннего `LlmProvider`;
- OpenAI, OpenRouter и RouterAI подключаются отдельными серверными адаптерами;
- provider/model выбираются отдельно для research и content после общего eval;
- capabilities проверяются явно, а фактический маршрут записывается в audit log;
- отсутствие ключа или невалидный structured output не маскируются: поиск продолжает безопасный deterministic route с видимым статусом;
- retrieval и научная проверка остаются собственными слоями Forme, поэтому смена провайдера не меняет каноническую базу.
- server-side диагностика показывает только безопасные имена маршрутов и состояние подключения; live probe проверяет research/content отдельно строгой схемой и не пишет диагностический текст в каноническую базу.
- OpenRouter-маршрут требует zero data retention, запрещает data collection и исключает endpoints без поддержки переданных параметров.

### Research Engine

- формулирует PICO/PECO-вопрос там, где это уместно;
- сначала ищет в собственной базе;
- затем обращается к PubMed, Crossref и издательским страницам;
- сохраняет метаданные, полный контекст поиска и доступные секции PubMed-аннотаций как неизменяемые chunks;
- сохраняет версию prompt, модельный run и событие решения отдельно от найденных source candidates.
- явно различает `metadata_only`, `abstract_only` и `full_text`; аннотация служит для triage и не открывает evidence gate.
- разделяет полную историю candidates и исследовательский архив: chunks сохраняются только после versioned deterministic intake, а причины допуска/отказа остаются в D1.
- после intake пакетно проверяет официальный PMC Open Access corpus, сохраняет только allowlisted reuse licenses и повышает документ до `full_text` лишь при наличии Methods/Results;
- хранит content level, PMCID, license и reuse origin отдельно от библиографической записи, не допуская downgrade при повторном импорте abstract.
- принимает ручные PDF через отдельный application use case: bytes дедуплицируются и сохраняются в приватном R2, а D1 фиксирует источник, основание доступа, extraction status, chunks и audit event;
- ручной PDF никогда не становится claim: нечитаемый текст и неполная структура остаются в Source Inbox, а assessment-grade gate по-прежнему требует Methods и Results.
- Trend Scout отдельно собирает сигналы свежести и роста тем из доступных социальных источников, затем оценивает их научную проверяемость и отсутствие дублей в контент-архиве.
- публичные Google Trends/News signals всегда маркируются как proxy; PubMed Research Pulse показывает свежесть научной повестки, но не социальную виральность; прямые Threads/Instagram signals работают через server-only Meta adapters и требуют разрешённых long-lived tokens.
- Threads adapter запрашивает несколько узких фитнес-тем в 48-часовом окне, отбрасывает stale-публикации и не подменяет пустую live-выдачу старыми постами. В личном Meta Development Mode источник работает для аккаунта с ролью в приложении без публичного App Review. Отдельная server-side диагностика проверяет профильный доступ, классифицирует credential/permission/temporary failures и никогда не возвращает токен или raw Meta error в браузер.

### Evidence Engine

- дробит тему на проверяемые claims;
- оценивает релевантность, дизайн, выборку, длительность, исходы и ограничения;
- различает статистическую и практическую значимость;
- учитывает противоречащие результаты;
- возвращает вывод и уровень уверенности, а не список ссылок.
- разделяет reporting guidance, appraisal конкретного результата и certainty корпуса данных по исходу;
- маршрутизирует инструмент по вопросу и study design, а deterministic hard stops выполняет до LLM-синтеза;
- реализует отдельные strict-schema этапы `source_assessment`, `body_assessment` и `claim_synthesis` с проверкой passage ids;
- не вызывает следующий модельный этап, пока предыдущий gate не готов;
- до экспертной калибровки любой body assessment требует ручного подтверждения.
- модельный `eligible_for_synthesis` остаётся закрытым до добавочного human review; body synthesis читает только последнее подтверждённое решение по последней оценке каждого источника.
- human review не переписывает модельный assessment и не может повысить `excluded` или `context_only`; body confirmation также не открывает claim до release-калибровки.
- каждый source assessment хранит отдельный читательский brief: plain-language summary, 3–5 provenance-linked тезисов и границу допустимого вывода.
- source review index 0–100 рассчитывается детерминированно из dimension/integrity judgements, ограничивается gate и служит только навигацией; это не вероятность истинности и не appraisal quality score.

### Knowledge Base

Главные сущности:

- `topics`
- `claims`
- `sources`
- `source_chunks`
- `source_documents`
- `source_intake_decisions`
- `source_review_decisions`
- `manual_source_imports` + private R2 object
- `source_assessments`
- `source_assessment_human_reviews`
- `source_assessment_reader_briefs`
- `body_assessments`
- `body_assessment_human_reviews`
- `claim_versions`
- `claim_evidence`
- `research_runs`
- `content_items`
- `content_claims`
- `trend_signals`
- `model_runs`
- `audit_events`
- `content_operations`
- `content_item_versions`
- `content_human_reviews`
- `topic_ideas`
- `user_notes`
- `publication_metrics`

Изменённый вывод не перезаписывает историю: предыдущая версия получает статус `superseded`.

Навигация по растущей базе строится в несколько уровней: тематические кластеры → фильтры по уверенности, статусу и свежести → полнотекстовый поиск → связи между claims.

Рабочий интерфейс читает только канонические `claim_versions` и их evidence-связи. Search candidates и source assessments не отображаются как подтверждённые знания; при отсутствии approved claims показывается честное пустое состояние.

`source_review_decisions` хранит добавочные, неизменяемые решения человека. Ручной include/exclude не переписывает intake-gate: новое решение указывает причину, автора, время и признак override. Проверка record integrity повторно загружает PubMed-запись, сохраняет новый статус через существующий document store и создаёт отдельное audit event.

Ручной claim workflow использует только `full_text` источники с разрешённым reuse status, активной библиографической записью и последним человеческим решением `included`. Draft требует Methods и Results/Discussion provenance и сохраняется как `needs_review`. Eligibility всех passages повторно проверяется во время approval. Отдельная запись `claim_manual_reviews` фиксирует финальное решение владельца, обоснование, работу с противоречиями и три явных подтверждения; модель не участвует и не может одобрить claim автоматически.

Лексический operations-поиск сознательно состоит из двух запросов и двух типов результата: latest claim versions и source chunks. Даже eligible full-text passage не становится claim. Просроченные claims исключаются из генерации и попадают в maintenance queue; PubMed record status перепроверяется один раз за открытую сессию или вручную.

### Content Engine

- читает только свежие канонические `approved` claim versions; пустая выборка является штатным блокирующим результатом;
- выполняет четыре изолированных strict-schema этапа: `content_brief → platform_draft → voice_edit → fact_review`;
- использует provider-neutral content runtime для первых трёх этапов и отдельный research runtime для независимого фактчека;
- до утверждения style profile применяет явно помеченный нейтральный fallback, не выдавая его за голос автора;
- сохраняет `content_items`, фрагменты, `content_claims`, model runs и audit event в D1;
- реальный архив читает агрегаты напрямую из D1 и не смешивает их с демонстрационными шаблонами;
- никогда не публикует автоматически: успешный gate создаёт только `ready_for_human_review`.

Научная маршрутизация разделена по риску: discovery и research plan используют экономный research route, а source appraisal и body-of-evidence assessment — независимый review route. Смена модели не меняет доменные контракты, детерминированный score или human gates.

После append-only подтверждения body review-модель может подготовить атомарный claim draft. Некалиброванная методология не мешает создать материал для человеческой проверки, но запрещает автоматическое утверждение: версия сохраняется как `needs_review`, содержит scope, limitations и точные source assessment/chunk links и не доступна Content Engine до отдельного claim review.

Ручной контент использует тот же canonical archive. Каждая редакция создаёт immutable snapshot, сбрасывает human gate и редакционный статус в `draft`. `content_operations` хранит только editorial lifecycle; научное состояние остаётся в `content_items.status`. Планирование и публикация невозможны до подтверждённого fact-check. Банк тем, `narrative_only` заметки и performance snapshots не участвуют в расчёте evidence confidence.

## Технический курс

- Web-интерфейс: React/TypeScript.
- Серверная логика: Cloudflare Worker-compatible runtime.
- Операционная БД MVP: SQLite/D1.
- Поиск по знаниям: claim-first hybrid RAG — структурные фильтры, полнотекстовый поиск, embeddings и reranking.
- Канонические записи: D1/SQLite; embeddings и vector store являются перестраиваемым retrieval-индексом.
- Индексы: отдельные пространства для raw evidence chunks и approved claim versions.
- Научные источники: PubMed/NCBI, Crossref, DOI и открытые издательские метаданные.
- Модель: структурированные ответы по строгой схеме; каждый этап получает только нужный контекст.

### Российский portability target

Timeweb фиксируется как целевой управляемый контур на случай миграции: App Platform для приложения, PostgreSQL + `pgvector` для канонических записей и retrieval-индексов, приватный S3 для PDF. Текущий D1/R2 production остаётся активным до готовности проверяемого export/restore и PostgreSQL/S3 adapter contracts. Домен и application use cases не знают о выбранной инфраструктуре.

## Ключевое ограничение

Модель не имеет права повышать уровень уверенности сверх того, что следует из evidence-записей. Контентный слой не редактирует научный вывод — только способ объяснения.

Архитектурное решение по retrieval зафиксировано в `docs/decisions/0001-claim-first-hybrid-rag.md`.
Граница LLM-провайдеров зафиксирована в `docs/decisions/0002-provider-neutral-llm.md`.
Границы модульного монолита зафиксированы в `docs/decisions/0003-modular-monolith-and-code-boundaries.md`.
Разделение уровней научной оценки зафиксировано в `docs/decisions/0004-separate-study-appraisal-and-body-certainty.md`.
Экономная provider-agnostic маршрутизация зафиксирована в `docs/decisions/0005-provider-agnostic-economy-routing.md`.
Граница между abstract triage, full-text appraisal и claims зафиксирована в `docs/decisions/0006-abstract-ingestion-and-evidence-gates.md`.
Отбор источников в исследовательский архив зафиксирован в `docs/decisions/0007-deterministic-source-intake.md`.
Rights-aware full-text ingestion зафиксирован в `docs/decisions/0008-rights-aware-full-text-ingestion.md`.
Ручной импорт PDF зафиксирован в `docs/decisions/0009-user-authorized-pdf-import.md`.
Прямые Meta trend adapters и граница хранения токенов зафиксированы в `docs/decisions/0010-direct-meta-trend-adapters.md`.
Личный Meta Development Mode и отложенный публичный review зафиксированы в `docs/decisions/0011-personal-meta-development-mode.md`.
Добавочные human gates для source/body assessment зафиксированы в `docs/decisions/0018-append-only-human-evidence-review.md`.
Прозрачный source review index и provenance-linked brief зафиксированы в `docs/decisions/0019-transparent-source-review-index.md`.
Маршрутизация научных оценок через независимую review-модель зафиксирована в `docs/decisions/0020-review-model-for-scientific-appraisal.md`.
Граница между подготовкой claim draft и утверждением знания зафиксирована в `docs/decisions/0021-claim-draft-before-calibration.md`.
Трассируемый контентный конвейер зафиксирован в `docs/decisions/0012-traceable-content-pipeline.md`.
Ручной owner-reviewed claim workflow зафиксирован в `docs/decisions/0013-manual-claim-review.md`.
Автономный operations-слой без LLM зафиксирован в `docs/decisions/0014-autonomous-operations-layer.md`.
Российский portability target зафиксирован в `docs/decisions/0015-timeweb-portability-target.md`.
