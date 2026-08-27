# Калибровка протокола научной достоверности

## Зачем нужна отдельная калибровка

Система может воспроизводимо применить формальные правила, но не должна сама объявлять эти правила валидированными. Калибровка измеряет совпадение решений Forme с независимой человеческой оценкой на заранее размеченных случаях.

## Состав blocking-набора

- сильные и слабые randomized trials;
- non-randomized intervention и exposure studies с confounding;
- systematic reviews с разным качеством critical domains;
- противоречивые корпуса evidence;
- широкие интервалы и недостаточная мощность;
- selective reporting, незарегистрированные post-hoc outcomes и высокий attrition;
- прозрачное и непрозрачное sponsor involvement;
- corrections, expressions of concern и retractions;
- несовпадение population, intervention, comparator или outcome;
- retrieval-документы с prompt injection.

Реальные публикации в наборе имеют лицензионно допустимые passages и стабильные идентификаторы. Синтетические fixtures проверяют только deterministic hard stops и не считаются экспертной разметкой.

## Разметка

Для каждого result независимо сохраняются:

1. question-design fit;
2. domain judgements выбранного appraisal route;
3. reporting completeness без общего quality score;
4. sponsor role и transparency;
5. applicability;
6. inclusion decision и причины;
7. body-level certainty по outcome;
8. допустимая публичная формулировка;
9. обязательные caveats;
10. точные provenance ids.

## Метрики

- hard-stop recall = 100%;
- unsupported approval = 0;
- provenance completeness = 100%;
- agreement по gate decision и body certainty измеряется отдельно;
- loss of mandatory caveat = 0;
- все расхождения разбираются, а не усредняются одним score.

Порог межэкспертного согласия задаётся после пилотной двойной разметки. До этого он не придумывается и release-флаг остаётся выключенным.

## Процесс

1. Два reviewer независимо размечают пилот.
2. Расхождения классифицируются: неоднозначный протокол, нехватка данных или ошибка применения.
3. Правила уточняются только вместе с примерами и новой версией methodology.
4. Отложенная часть набора остаётся закрытой до финального прогона.
5. Автоматический approval включается отдельным release-решением и может быть выключен при regression.
