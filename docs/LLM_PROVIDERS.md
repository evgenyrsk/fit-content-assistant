# LLM-провайдеры

## Решение

Forme не привязывает доменный конвейер к одному API. Research, Evidence, Knowledge и Content используют внутренний интерфейс `LlmProvider`; адаптеры переводят его запросы в формат конкретного провайдера.

Поддерживаемые цели первого этапа:

- **OpenAI** — прямой адаптер к Responses API;
- **OpenRouter** — адаптер к совместимому API и доступ к разным моделям через единый endpoint.

Provider и model задаются на сервере отдельно для ролей `research` и `content`. Секреты не попадают в браузер. Для каждого run журнал хранит выбранный provider, model, фактический routed provider при наличии, prompt version, стоимость/usage, задержку, tool calls и итог review gate.

Текущий режим — `economy`: сильная configured model используется только для research planning, appraisal, synthesis и final fact review; классификация и платформенная адаптация получают меньшие token/tool budgets. Конкретные model ids не прошиваются в коде.

## Граница независимости

Совместимость endpoint не означает одинаковые возможности всех моделей. Structured output, tool calling, reasoning и streaming проверяются для конкретной связки model/provider; неподдержанная capability должна завершать этап как `needs_review`, а не включать тихий fallback.

Научный retrieval, RAG, provenance, версионирование claims и evidence gates принадлежат Forme. Встроенные vendor-specific инструменты могут использоваться только внутри адаптера и не становятся единственным способом получить канонические данные. Поэтому OpenRouter можно выбрать без переноса базы знаний или логики научной проверки.

## Как выбираем primary

OpenAI и OpenRouter проходят один и тот же фиксированный eval-набор. Решение принимается по научной корректности, соблюдению схем, устойчивости tool calls, полноте оговорок, задержке и стоимости. Для этапов допустимы разные модели. Fallback разрешён только явно, с повторной валидацией результата и записью маршрута в audit log.

## Конфигурация

- `LLM_PROVIDER=openai|openrouter`
- `LLM_BUDGET_PROFILE=economy|balanced`
- `OPENAI_API_KEY`, `OPENAI_MODEL_RESEARCH`, `OPENAI_MODEL_CONTENT`
- `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL_RESEARCH`, `OPENROUTER_MODEL_CONTENT`

Реальные ключи хранятся только в секретах серверного окружения.
