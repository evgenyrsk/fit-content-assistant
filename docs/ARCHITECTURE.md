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
- OpenAI и OpenRouter подключаются серверными адаптерами;
- provider/model выбираются отдельно для research и content после общего eval;
- capabilities проверяются явно, а фактический маршрут записывается в audit log;
- отсутствие ключа или невалидный structured output не маскируются: поиск продолжает безопасный deterministic route с видимым статусом;
- retrieval и научная проверка остаются собственными слоями Forme, поэтому смена провайдера не меняет каноническую базу.

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
- публичные Google Trends/News signals всегда маркируются как proxy; PubMed Research Pulse показывает свежесть научной повестки, но не социальную виральность; прямые Threads/Instagram signals требуют разрешённого API-доступа.

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

### Knowledge Base

Главные сущности:

- `topics`
- `claims`
- `sources`
- `source_chunks`
- `source_documents`
- `source_intake_decisions`
- `manual_source_imports` + private R2 object
- `source_assessments`
- `claim_versions`
- `claim_evidence`
- `research_runs`
- `content_items`
- `content_claims`
- `trend_signals`
- `model_runs`
- `audit_events`
- `performance_snapshots`

Изменённый вывод не перезаписывает историю: предыдущая версия получает статус `superseded`.

Навигация по растущей базе строится в несколько уровней: тематические кластеры → фильтры по уверенности, статусу и свежести → полнотекстовый поиск → связи между claims.

Рабочий интерфейс читает только канонические `claim_versions` и их evidence-связи. Search candidates и source assessments не отображаются как подтверждённые знания; при отсутствии approved claims показывается честное пустое состояние.

### Content Engine

- выбирает угол подачи только после утверждения claims;
- адаптирует материал под формат;
- добавляет отдельный непубликуемый фактчек;
- хранит связь каждого фрагмента контента с использованными claims.

## Технический курс

- Web-интерфейс: React/TypeScript.
- Серверная логика: Cloudflare Worker-compatible runtime.
- Операционная БД MVP: SQLite/D1.
- Поиск по знаниям: claim-first hybrid RAG — структурные фильтры, полнотекстовый поиск, embeddings и reranking.
- Канонические записи: D1/SQLite; embeddings и vector store являются перестраиваемым retrieval-индексом.
- Индексы: отдельные пространства для raw evidence chunks и approved claim versions.
- Научные источники: PubMed/NCBI, Crossref, DOI и открытые издательские метаданные.
- Модель: структурированные ответы по строгой схеме; каждый этап получает только нужный контекст.

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
