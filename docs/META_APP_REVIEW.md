# Meta App Review runbook

Статус: подготовка, не отправлено. Проверено в Meta Developer Dashboard 28 августа 2026 года.

## Текущее состояние

- Meta App ID: `2104673313480628`; Threads App ID: `1749989439454425`.
- Приложение находится в Development / Unpublished.
- `threads_basic` и `threads_keyword_search` добавлены и имеют статус `Ready for testing`.
- Для `threads_keyword_search` доступно действие `Add to App Review`, но оно не нажато.
- Go Live заблокирован отсутствующим Privacy Policy URL.
- В App Settings также нужно проверить/заполнить contact email, category и User data deletion URL.
- Квадратная иконка подготовлена локально: `public/meta-app-icon.png`; в Meta она ещё не загружена.
- Dashboard отдельно предлагает Become a Tech Provider для App Review и доступа к данным других пользователей/бизнесов. Этот шаг ещё не начат.

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

Эти маршруты находятся в приватном продукте. Они не считаются публичными URL для Meta, пока не создан отдельный публичный review-контур или не утверждена другая безопасная схема доступа.

## Перед публичным действием

В одном подтверждении владельца нужны:

1. публичный контактный email;
2. срок ответа на запрос удаления данных;
3. согласие на создание публичного review-контура без доступа к приватной базе Forme;
4. финальное согласие на добавление `threads_basic` и `threads_keyword_search` в App Review;
5. подтверждение перед Publish / Live Mode после одобрения Meta.

Не записывать tester credentials, токены, app secret или приватные документы в этот файл, скринкаст и review notes.
