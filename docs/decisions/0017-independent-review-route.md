# ADR 0017: Независимый review-маршрут и детерминированный caveat gate

- Статус: принято
- Дата: 2026-09-01
- Владельцы: Forme
- Заменяет: часть решения ADR-0016 о неявном использовании research model для fact review

## Контекст

Первый RouterAI content smoke-eval показал, что финальный reviewer имеет другой профиль риска, чем research planning. Отдельный восьмикейсный прогон выявил, что модель может довериться полю `preservedCaveats`, даже когда оговорки нет в фактическом тексте. Ошибка на этом этапе не должна открывать публикацию.

## Критерии решения

- нулевой unsafe approval rate на blocking cases;
- независимая смена reviewer без изменения research/content маршрутов;
- strict schema и semantic consistency каждого fragment decision;
- детерминированная проверка свойств, которые не требуют LLM;
- фиксируемые latency, usage и стоимость.

## Рассмотренные варианты

- Оставить review на research route: проще, но связывает два разных профиля качества и бюджета.
- Использовать content model: дешевле, но comparative eval показал semantic contract error.
- Выделить третью роль `review`: немного больше конфигурации, но отдельный release gate и измеримая замена модели.

## Решение

Добавить provider-neutral роль `review` с отдельными environment model ids. Production primary — `openai/gpt-5-mini` через RouterAI по результату reviewer-safety 1.2.0. Обязательные оговорки ищутся в реальных draft fragments до LLM. Отсутствующая оговорка блокирует stage бесплатно; metadata `preservedCaveats` не является основанием для допуска.

## Последствия и риски

Research, content и review можно масштабировать и менять независимо. Live probe проверяет три маршрута. GPT-5 Mini дороже DeepSeek V3.2, но абсолютная стоимость восьмикейсного review eval составила менее 0.36 ₽. Один набор недостаточен для окончательной калибровки; автоматический fallback не включается.

## Проверка и пересмотр

Каждое изменение fact-review prompt, schema или модели обязано пройти `reviewer-safety` и общий regression set. Решение пересматривается, если другая модель проходит повторяемый расширенный набор без contract errors и даёт измеримое улучшение стоимости или задержки.
