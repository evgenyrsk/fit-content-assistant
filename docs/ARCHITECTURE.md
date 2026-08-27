# Архитектура

## Подход к эволюции

Forme — модульный монолит с явными feature-границами и направлением зависимостей в стиле Clean Architecture. Мы сохраняем один deployable продукт, пока нет измеримой причины для распределённой системы, но каждый доменный модуль имеет seam для замены adapter или будущего выделения. Правила и лимиты: `CODE_ORGANIZATION.md`; решение: ADR-0003.

`app → feature UI → application use cases → domain`

`infrastructure → application ports → domain`

API routes служат composition root, а не содержат бизнес-правила. Текущий вертикальный срез связывает PubMed/Crossref, deterministic query normalization и D1 через `/api/research`; публичные live proxies, опциональный Threads adapter и историю trend signals — через `/api/trends`.

## Поток данных

`LLM Provider Adapter → LLM Orchestrator → Research Engine → Evidence Engine → Knowledge Base → Content Engine → Independent review`

LLM связывает этапы и управляет инструментами, но не является источником истины. Канонические научные данные живут в версионируемой базе; каждый этап имеет отдельную схему ответа и gate. Подробности: `AI_SYSTEM.md`.

### LLM Provider Layer

- доменные этапы зависят только от внутреннего `LlmProvider`;
- OpenAI и OpenRouter подключаются серверными адаптерами;
- provider/model выбираются отдельно для research и content после общего eval;
- capabilities проверяются явно, а фактический маршрут записывается в audit log;
- retrieval и научная проверка остаются собственными слоями Forme, поэтому смена провайдера не меняет каноническую базу.

### Research Engine

- формулирует PICO/PECO-вопрос там, где это уместно;
- сначала ищет в собственной базе;
- затем обращается к PubMed, Crossref и издательским страницам;
- сохраняет метаданные и полный контекст поиска.
- Trend Scout отдельно собирает сигналы свежести и роста тем из доступных социальных источников, затем оценивает их научную проверяемость и отсутствие дублей в контент-архиве.
- публичные Google Trends/News signals всегда маркируются как proxy; прямые Threads/Instagram signals требуют разрешённого API-доступа.

### Evidence Engine

- дробит тему на проверяемые claims;
- оценивает релевантность, дизайн, выборку, длительность, исходы и ограничения;
- различает статистическую и практическую значимость;
- учитывает противоречащие результаты;
- возвращает вывод и уровень уверенности, а не список ссылок.
- разделяет reporting guidance, appraisal конкретного результата и certainty корпуса данных по исходу;
- маршрутизирует инструмент по вопросу и study design, а deterministic hard stops выполняет до LLM-синтеза;
- до экспертной калибровки любой body assessment требует ручного подтверждения.

### Knowledge Base

Главные сущности:

- `topics`
- `claims`
- `sources`
- `source_chunks`
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
