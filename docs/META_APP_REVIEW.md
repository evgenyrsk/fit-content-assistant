# Meta App Review runbook

Статус: публичный review-контур готов, App Review не создан. Проверено в Meta Developer Dashboard 28 августа 2026 года.

## Текущее состояние

- Meta App ID: `2104673313480628`; Threads App ID: `1749989439454425`.
- Приложение находится в Development / Unpublished.
- `threads_basic` и `threads_keyword_search` добавлены и имеют статус `Ready for testing`.
- Для обоих разрешений доступно действие `Add to App Review`. Оно открывает обязательный переход в Tech Provider; Meta отмечает переход как необратимый. `Continue` не нажато.
- Все required app settings завершены, кнопка Publish доступна, но не нажата.
- Contact email, category `Lifestyle`, App domain, Privacy Policy URL и User data deletion URL сохранены.
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

Публичный изолированный портал: `https://forme-meta-review.evgenyrsk7.chatgpt.site`. Он не имеет D1/R2, токенов, загрузок и приватных API основного Forme.

Эти маршруты находятся в приватном продукте. Они не считаются публичными URL для Meta, пока не создан отдельный публичный review-контур или не утверждена другая безопасная схема доступа.

## Перед публичным действием

В одном подтверждении владельца нужны:

1. явное согласие на необратимую идентификацию как Tech Provider;
2. готовность пройти Business Verification и Access Verification;
3. подтверждение перед финальной отправкой App Review;
4. подтверждение перед Publish / Live Mode после одобрения Meta.

Не записывать tester credentials, токены, app secret или приватные документы в этот файл, скринкаст и review notes.
