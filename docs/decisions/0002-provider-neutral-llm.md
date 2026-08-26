# ADR-0002: Provider-neutral LLM boundary

- Статус: принято
- Дата: 2026-08-27

## Контекст

Forme должен использовать LLM как основной механизм оркестрации, исследования и создания контента, но качество и доступность моделей меняются. Жёсткая зависимость доменной логики от одного SDK осложнит сравнение OpenAI и OpenRouter и может связать RAG с vendor-specific инструментами.

## Решение

Ввести внутренний `LlmProvider` с capability checks и строгим structured-output контрактом. Реализовывать OpenAI и OpenRouter отдельными серверными адаптерами. Retrieval, evidence assessment, claims, provenance и blocking review gates остаются provider-neutral.

## Последствия

- Провайдера и модель можно менять по роли после eval, не переписывая научный конвейер.
- Реальные routing-данные и capabilities нужно логировать и проверять.
- Provider-specific инструменты допустимы как оптимизация, но не как единственный канонический путь.
- Потребуется conformance-набор тестов для каждого адаптера.
