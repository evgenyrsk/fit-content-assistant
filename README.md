# Forme — Fitness Content OS

Персональная система для создания научно корректного и живого фитнес-контента.

Forme разделяет четыре самостоятельных этапа:

1. **Research Engine** находит релевантные первоисточники.
2. **Evidence Engine** оценивает качество данных и формулирует проверяемые тезисы.
3. **Knowledge Base** хранит тезисы, уверенность, ограничения и историю обновлений.
4. **Content Engine** превращает проверенные выводы в Reels, Telegram, Threads, карусели и Stories.

Главный принцип: сначала устанавливаем, что действительно знаем. Потом решаем, как интересно об этом рассказать.

## Текущее состояние

Работает интерактивный интерфейс MVP, реальный поиск source candidates в PubMed/Crossref, сохранение research runs в D1 и live Trend Scout на публичных proxy-сигналах и PubMed Research Pulse. Первый provider-neutral LLM-этап `research_plan` готов: strict schema, fail-closed fallback, model run и audit event. Без серверного ключа интерфейс честно показывает детерминированный режим. Найденные публикации не выдаются за проверенные claims; evidence/content этапы ещё не активированы.

## Документы

- [Исходный бриф](docs/ORIGINAL_BRIEF.md)
- [Целевое состояние и автономный режим](docs/TARGET_STATE.md)
- [Продукт и границы MVP](docs/PRODUCT.md)
- [Архитектура](docs/ARCHITECTURE.md)
- [Организация кода и SOLID](docs/CODE_ORGANIZATION.md)
- [LLM-система](docs/AI_SYSTEM.md)
- [LLM-провайдеры](docs/LLM_PROVIDERS.md)
- [RAG и база знаний](docs/RAG_ARCHITECTURE.md)
- [Методология научной достоверности](docs/EVIDENCE_RELIABILITY.md)
- [Калибровка методологии](docs/EVIDENCE_CALIBRATION.md)
- [Evals и контроль качества](docs/EVALUATION.md)
- [Авторский профиль](docs/STYLE_PROFILE.md)
- [Дизайн-система](docs/DESIGN_SYSTEM.md)
- [Roadmap](docs/ROADMAP.md)

## Разработка

- Node.js: версия из `.nvmrc`.
- Окружение: скопировать `.env.example` в `.env.local`; реальные ключи не коммитить.
- Полная локальная проверка: `npm run check`.
- Архитектурные границы отдельно: `npm run architecture`.
- Правила репозитория: `AGENTS.md`; порядок работы: `CONTRIBUTING.md`.

## Правила работы

- Не выдавать наличие источника за доказанность вывода.
- Не подбирать исследования под заранее выбранный тезис.
- Хранить связь: контент → claims → источники.
- Не скрывать неопределённость и противоречащие данные.
- Не жертвовать точностью ради более громкого хука.
