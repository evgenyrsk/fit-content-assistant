# ADR-0018: Добавочные human review для source и body assessments

- Статус: принято
- Дата: 2026-09-02
- Владельцы: Forme
- Заменяет: —

## Контекст

LLM уже создаёт проверяемые черновики result-level и body-level assessments, но до калибровки они не могут открывать claim или content gate. Нужен долговременный интерфейс решения человека без перезаписи модельного вывода и без возможности обойти deterministic hard stops.

## Критерии решения

- неизменяемая история решений и audit trail;
- явная проверка finding, provenance, scope, противоречий и certainty;
- только подтверждённые человеком source assessments участвуют в body synthesis;
- `excluded` и `context_only` нельзя повысить ручным подтверждением;
- подтверждение body не открывает claim до калибровки методологии.

## Рассмотренные варианты

Сохранять состояние только в браузере — отклонено: решение теряется и не является каноническим. Перезаписывать модельный assessment — отклонено: теряется авторство и история. Автоматически принимать модельный `eligible_for_synthesis` — отклонено до калибровки.

## Решение

Добавить отдельные append-only таблицы `source_assessment_human_reviews` и `body_assessment_human_reviews`. Последнее решение определяет effective source gate, но deterministic `excluded/context_only` остаётся неизменным. Подтверждение требует всех структурированных attestations и содержательного обоснования. Body review сохраняется отдельно; claim и content по-прежнему требуют собственных gates.

## Последствия и риски

Появляется проверяемый переход от модельного draft к human-confirmed evidence. Ручная ошибка остаётся возможной, поэтому интерфейс не называет решение «истиной», хранит reviewer/time/reason и не отменяет калибровку.

## Проверка и пересмотр

Domain tests проверяют effective gate и запрет override hard stops. Use-case tests проверяют обязательные attestations. Решение пересматривается после двойной экспертной разметки и утверждения methodology release.
