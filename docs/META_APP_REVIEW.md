# Meta App Review runbook

Статус: публичный App Review отложен как избыточный для личного режима. Черновик сохранён, но не отправляется. Решение принято 28 августа 2026 года.

## Текущее состояние

- Meta App ID: `2104673313480628`; Threads App ID: `1749989439454425`.
- Приложение находится в Development / Unpublished.
- `threads_basic` и `threads_keyword_search` добавлены в черновик App Review.
- Необратимый переход в Tech Provider подтверждён владельцем и применён.
- Все required app settings завершены, кнопка Publish доступна, но не нажата.
- Contact email, category `Lifestyle`, App domain, Privacy Policy URL, User data deletion URL, web platform и review URL сохранены.
- Квадратная иконка `public/meta-app-icon.png` загружена в Meta.
- Reviewer instructions и описания использования двух Threads-разрешений сохранены в черновике.
- Business Verification остановлена до появления публичного или многопользовательского сценария; Access Verification сейчас не требуется.
- Meta требует по одному успешному API-вызову и OAuth-скринкасту для каждого Threads-разрешения. Trend Scout выполняет `threads_basic` profile preflight перед `threads_keyword_search`; учёт тестов может обновляться до 24 часов.
- В текущем Development Mode подключённый app-role аккаунт работает без отправки App Review. Tech Provider остаётся активным, но не создаёт обязательства завершать verification сейчас.

## Текущее операционное решение

- не отправлять черновик App Review;
- не нажимать Publish и не переводить приложение в Live Mode;
- не продолжать Business / Access Verification;
- использовать только server-only доступ владельца;
- контролировать его через встроенную диагностику Threads;
- вернуться к review-процессу перед подключением других пользователей.

## Запрашиваемый минимальный доступ

Оставить только:

- `threads_basic` — идентификация Threads-профиля, который выдал доступ;
- `threads_keyword_search` — поиск публичных публикаций по конкретному ключевому слову.

Forme не просит публикацию, удаление, ответы, mentions, insights или управление профилем в этом сценарии.

## Review copy (English)

### Why the app needs threads_keyword_search

Forme is a private research and content-planning workspace for a fitness author. The permission is used to fetch recent public Threads posts that match either a keyword explicitly entered by the user or a small bounded set of fitness-related queries. The app ranks these posts by recency and topic fit and presents them only as trend signals. Selecting a signal starts a separate scientific research workflow; the Threads post is never treated as evidence. The app does not publish replies or posts in this flow.

### Reviewer instructions

1. Open the review build using the access details supplied in the secure review notes.
2. Open **Workspace → Live Signals**.
3. Select **Threads**.
4. Enter a fitness keyword or run the default bounded search.
5. Confirm that results show source, freshness and a button that sends the topic to the scientific research workflow.
6. Confirm that the UI states that a trend signal is not scientific evidence.

### Data handling summary

The server requests post id, text, timestamp and permalink. It stores a normalized signal containing the post id, shortened text, permalink, observed time and derived relevance scores. The Threads access token is stored as a server-only secret and is not returned to the browser.

## Материалы в продукте

- `/legal/privacy` — фактический черновик политики конфиденциальности;
- `/legal/data-deletion` — инструкция отзыва доступа и удаления данных;
- `/meta-review` — краткая англоязычная инструкция ревьюеру.

Публичный изолированный портал: `https://forme-meta-review.evgenyrsk7.chatgpt.site`. Он не имеет D1/R2, токенов, загрузок и приватных API основного Forme.

Эти маршруты находятся в приватном продукте. Они не считаются публичными URL для Meta, пока не создан отдельный публичный review-контур или не утверждена другая безопасная схема доступа.

## Перед будущим публичным действием

В одном подтверждении владельца нужны:

1. явное согласие на необратимую идентификацию как Tech Provider;
2. готовность пройти Business Verification и Access Verification;
3. подтверждение перед финальной отправкой App Review;
4. подтверждение перед Publish / Live Mode после одобрения Meta.

Не записывать tester credentials, токены, app secret или приватные документы в этот файл, скринкаст и review notes.
