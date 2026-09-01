# RouterAI smoke eval — 2026-09-01

## Цель

Проверить текущую экономную пару моделей на одинаковом научном вопросе и на полном traceable content pipeline. Это smoke-eval, а не окончательная калибровка качества.

## Конфигурация

- Research primary: `openai/gpt-5-mini`.
- Content primary: `deepseek/deepseek-v3.2`.
- Бюджет: `economy`.
- Научный вопрос: тренировки до полного мышечного отказа и гипертрофия у тренированных взрослых.
- Контентный fixture: один approved claim с moderate confidence, точным scope и обязательной оговоркой.
- Стоимость рассчитана по тарифам RouterAI на момент запуска: GPT-5 Mini — 27 ₽ / 1M input и 222 ₽ / 1M output; DeepSeek V3.2 — 23 ₽ / 1M input и 34 ₽ / 1M output.

## Результаты research planning

| Модель | Strict contract | Balanced plan | Время | Input | Output | Оценка стоимости |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `openai/gpt-5-mini` | пройден | пройден | 17.5 с | 286 | 1038 | 0.2382 ₽ |
| `deepseek/deepseek-v3.2` | пройден | пройден | 34.2 с | 614 | 1213 | 0.0554 ₽ |

GPT-5 Mini остаётся research primary: в этом прогоне он был примерно вдвое быстрее, сохранил PICO-структуру, критерии исключения и отдельный поиск опровергающих данных. DeepSeek прошёл те же детерминированные gates примерно в 4.3 раза дешевле и остаётся кандидатом экономного fallback после расширения набора.

## Результаты content pipeline

### DeepSeek content + GPT-5 Mini fact review

- Бриф, платформенный черновик и voice edit прошли строгие контракты.
- Final fact review не вернул результат, прошедший runtime-contract; pipeline корректно остановился.
- Время: 76.5 с.
- Подтверждённая стоимость первых трёх этапов: 0.1008 ₽. Стоимость невалидного reviewer-вызова не попала в usage record и поэтому итог занижен.

### DeepSeek content + DeepSeek fact review

- Все четыре ответа прошли структурные контракты.
- Фактические фрагменты сохранили claim links; обязательная оговорка не потеряна.
- Reviewer выдал валидный `rejected`, поэтому материал остался в `needs_review`. Это корректное fail-closed поведение, а не успешная публикация.
- Время: 51.2 с.
- Стоимость: 0.1262 ₽.

## Решение

1. Сохранить `openai/gpt-5-mini` как research primary и `deepseek/deepseek-v3.2` как content primary.
2. Не считать текущий GPT reviewer готовым: один невалидный ответ уже достаточен, чтобы не открывать release gate.
3. Выделить независимую роль `review` вместо неявного использования research model для фактчека.
4. Сравнить GPT-5 Mini и DeepSeek V3.2 как reviewers на versioned наборе минимум из восьми кейсов: supported, unsupported, потерянная оговорка, расширенный scope, числовая галлюцинация, личный опыт, prompt injection и корректный отказ.
5. Сохранять usage даже при post-response validation failure и отдельно различать provider error, schema error и semantic gate rejection.

## Ограничения

- Один вопрос и один approved-claim fixture не измеряют общую научную точность или авторский стиль.
- Live retrieval нашёл Crossref candidates, но PubMed был временно недоступен; качество retrieval этим прогоном не подтверждено.
- Никакой материал не получил статус publishable и не был автоматически добавлен в approved knowledge.
