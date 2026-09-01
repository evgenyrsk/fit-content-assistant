# LLM-провайдеры

## Решение

Forme не привязывает доменный конвейер к одному API. Research, Evidence, Knowledge и Content используют внутренний интерфейс `LlmProvider`; адаптеры переводят его запросы в формат конкретного провайдера.

Поддерживаемые цели первого этапа:

- **OpenAI** — прямой адаптер к Responses API;
- **OpenRouter** — адаптер к совместимому API с ZDR-routing;
- **RouterAI** — основной российский OpenAI-совместимый шлюз с оплатой в рублях.

Provider и model задаются на сервере отдельно для ролей `research` и `content`. Секреты не попадают в браузер. Для каждого run журнал хранит выбранный provider, model, фактический routed provider при наличии, prompt version, стоимость/usage, задержку, tool calls и итог review gate.

Текущий режим — `economy`: сильная configured model используется только для research planning, appraisal, synthesis и final fact review; классификация и платформенная адаптация получают меньшие token/tool budgets. Конкретные model ids не прошиваются в коде.

Текущий production-кандидат — RouterAI: `openai/gpt-5-mini` для research/fact review и `google/gemini-2.5-flash-lite` для content stages. Это стартовая экономная конфигурация, а не вечный выбор: маршруты меняются только через environment и после общего eval. Каждый запрос требует strict structured output. RouterAI по умолчанию не хранит содержимое API-запросов в собственной инфраструктуре, но этот режим не маркируется как ZDR и не отменяет отдельную политику нижестоящего model provider.

## Граница независимости

Совместимость endpoint не означает одинаковые возможности всех моделей. Structured output, tool calling, reasoning и streaming проверяются для конкретной связки model/provider; неподдержанная capability должна завершать этап как `needs_review`, а не включать тихий fallback.

Научный retrieval, RAG, provenance, версионирование claims и evidence gates принадлежат Forme. Встроенные vendor-specific инструменты могут использоваться только внутри адаптера и не становятся единственным способом получить канонические данные. Поэтому RouterAI, OpenRouter или прямой API можно менять без переноса базы знаний или логики научной проверки.

## Как выбираем primary

OpenAI, OpenRouter и RouterAI проходят один и тот же фиксированный eval-набор. Решение принимается по научной корректности, соблюдению схем, устойчивости tool calls, полноте оговорок, задержке и стоимости. Для этапов допустимы разные модели. Fallback разрешён только явно, с повторной валидацией результата и записью маршрута в audit log.

## Конфигурация

- `LLM_PROVIDER=openai|openrouter|routerai`
- `LLM_BUDGET_PROFILE=economy|balanced`
- `OPENAI_API_KEY`, `OPENAI_MODEL_RESEARCH`, `OPENAI_MODEL_CONTENT`
- `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL_RESEARCH`, `OPENROUTER_MODEL_CONTENT`
- `ROUTERAI_API_KEY`, `ROUTERAI_BASE_URL`, `ROUTERAI_MODEL_RESEARCH`, `ROUTERAI_MODEL_CONTENT`

Интерфейс читает безопасный `/api/integrations/llm`: GET показывает наличие обоих маршрутов без раскрытия ключа, POST выполняет два коротких strict-schema probe. Успешный probe подтверждает доступность API, но не заменяет научный eval выбранных моделей.

Реальные ключи хранятся только в секретах серверного окружения.
