# Контроль качества и evals

## Главный принцип

Красивый ответ не считается качественным, если его нельзя проверить. Оценка разделяется на научную корректность, retrieval, авторский голос, платформенную пригодность и продуктовую полезность.

## Набор проверок

### Детерминированные

- JSON соответствует схеме;
- у фактических фрагментов есть `claim_version_id`;
- у claim есть evidence, scope, confidence, limitations и review date;
- content confidence не выше claim confidence;
- live-статус невозможен без source id и observed_at;
- просроченный ключевой claim блокирует публикацию.
- ретракция и отсутствие целевого outcome исключают результат из supporting evidence;
- incomplete provenance, missing appraisal dimensions и unverified record status завершаются `needs_human_review`;
- reporting checklist никогда не преобразуется в quality score;
- неоткалиброванная методология не может автоматически утвердить claim.
- публичный язык не может быть сильнее confidence и review status;
- source adapters проходят fixture-based contract tests;
- LLM adapters обязаны передавать strict schema и возвращать usage/cost metadata.
- research plan обязан содержать disconfirming evidence; лишнее поле или неполная схема блокируют модельный результат.
- неподдерживаемый structured output и ошибка контракта переводят research plan в видимый deterministic fallback.
- каждый модельный research plan сохраняет provider, model, prompt version, usage/cost и gate decision.
- abstract-only документ не может считаться assessment-grade provenance;
- source assessment обязан сослаться только на реально сохранённые passage ids;
- body assessment обязан сохранить все eligible и contradicting assessment ids;
- claim synthesis не вызывается до готового body gate и не может повысить certainty;
- каждый evidence-этап отклоняет неизвестные поля и сохраняет model run отдельно от доменного решения;
- база знаний возвращает только канонические claim versions, а не source candidates.
- source intake не сохраняет chunks для ретракций, expressions of concern, не исследовательских форматов и недостаточных аннотаций;
- любое intake-решение содержит versioned reason codes и не удаляет candidate из истории поиска.
- full-text adapter отклоняет неизвестные/ограничительные лицензии и тексты без Methods/Results;
- повторный abstract import не понижает `full_text`, а PMC import не скрывает более строгий PubMed record status;
- Source Inbox читает последние intake-решения и явно показывает срок revalidation.
- ручной PDF проверяется по signature и лимитам, дедуплицируется по SHA-256 и при ошибке D1 удаляется из object storage;
- пользовательское подтверждение прав сохраняется отдельно от Open Access license, а отсутствие Methods/Results не открывает assessment-grade gate;
- приватный download route возвращает только объект, связанный с существующей D1-записью.
- content brief может выбирать только переданные свежие approved claim versions и не принимает дополнительные поля;
- platform draft отклоняет factual fragment без claim-связи и потерю любой обязательной оговорки;
- voice edit обязан сохранить ids, типы фрагментов, claim-связи и оговорки без изменений;
- final fact review покрывает каждый фрагмент и не может одобрить draft с unsupported fragment;
- каждый контентный этап имеет отдельный model run, а невалидный результат прекращает конвейер до следующего вызова;
- статус `ready_for_human_review` не означает `publishable`: ручной просмотр обязателен.

### Экспертные и модельные graders

- тезис следует из источников;
- сохранены популяция и область применимости;
- отражены противоречащие данные;
- оговорки не исчезли после стилевой обработки;
- хук интересный, но не подменяет смысл;
- текст похож на автора, а не на универсальный AI-шаблон;
- формат действительно соответствует платформе.

### Regression set

Минимальный набор включает вопросы с сильным консенсусом, смешанными результатами, недостатком данных, устаревшим claim, спорной фитнес-темой, личным опытом, провокационным исходным тезисом и инструкцией внутри retrieved-документа.

Контрактный набор дополнительно включает abstract-only источник, ретракцию, выдуманный passage id, потерянное противоречащее исследование, попытку повысить confidence и вызов следующего этапа до gate.

## Release gates

- `unsupported factual claim rate = 0` на блокирующем наборе;
- `citation completeness = 100%` для фактических фрагментов;
- ни одной потери обязательной оговорки;
- retrieval recall и style score не ниже последней принятой версии;
- ручная проверка новых опасных классов тем перед публикацией.
- domain policy tests проходят для каждого изменения evidence gate.

OpenAI Evals позволяют запускать versioned eval-наборы и graders; их используем вместе с локальными тестами, а не вместо них. Результат eval хранится с model id и prompt version, чтобы смена модели не была «слепым» обновлением.

## Обратная связь

Правки пользователя сохраняются как diff: что было удалено, добавлено и переформулировано. В style dataset попадают только подтверждённые изменения. Метрики публикаций помогают выбирать подачу, но не меняют научную уверенность.
