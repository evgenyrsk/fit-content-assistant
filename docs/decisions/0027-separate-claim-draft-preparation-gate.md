# ADR-0027: Отдельный gate подготовки claim draft

- Статус: принято
- Дата: 2026-09-07
- Владельцы: Forme
- Заменяет: часть ADR-0018 о запрете claim до release-калибровки

## Контекст

ADR-0021 разрешил готовить `needs_review` claim draft после append-only human confirmation body assessment, не считая такой draft знанием. Однако общий body-gate продолжал трактовать `publication_bias: unable_to_assess` как безусловный запрет. Из-за этого подтверждённая человеком совокупность данных не могла перейти к отдельному claim review, хотя неопределённость можно безопасно сохранить в confidence и limitations.

## Критерии решения

- неопределённость не исчезает и не превращается в разрешение на approval;
- отсутствие human confirmation, обязательных доменов, provenance или допустимых источников остаётся блокирующим;
- hard stops и невалидные evidence links нельзя обойти;
- Content Engine по-прежнему читает только отдельную human-approved claim version;
- решение проверяется независимо на domain, orchestration, API и UI уровнях.

## Рассмотренные варианты

Оставить любой `unable_to_assess` hard stop — отклонено: это смешивает недостаток уверенности с невозможностью подготовить проверяемый черновик. Игнорировать publication bias после human confirmation — отклонено: ограничение могло бы потеряться в model output. Автоматически одобрять по подтверждённому body — отклонено: body review и claim review решают разные задачи.

## Решение

Ввести отдельный deterministic gate подготовки claim draft. Он возвращает раздельные `blockingReasons` и `certaintyReasons`, потолок claim confidence и обязательные limitations.

`publication_bias: unable_to_assess` становится certainty reason: она не блокирует `needs_review` draft, ограничивает confidence не выше подтверждённой body certainty с консервативным downgrade от initial certainty и детерминированно добавляется в limitations. Неоценённый другой обязательный домен остаётся блокирующей неопределённостью до отдельного методологического решения.

До вызова модели gate требует human-confirmed body, полный набор доменов, содержательное rationale, human-confirmed eligible source assessments без hard stops и непустую provenance. После вызова сохраняются проверки body confidence, точных assessment/chunk ids и будущей review date. Результат всегда имеет статус `needs_review`.

## Последствия и риски

Безопасный черновик теперь можно передать отдельному human claim review, не ослабляя допуск к знанию и контенту. Детерминированное ограничение confidence консервативно до калибровки и может потребовать уточнения шкалы; поэтому правило версионируется вместе с методологией и не выдаётся за валидированную оценку.

## Проверка и пересмотр

Domain tests покрывают blocking/certainty reasons; orchestration tests — отсутствие вызова модели при hard stop, confidence cap, limitation и evidence links; API/UI contract tests — раздельные статусы и корректный копирайт. Решение пересматривается после экспертной калибровки publication bias и допустимого языка confidence.
