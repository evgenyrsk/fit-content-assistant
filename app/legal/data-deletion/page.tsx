import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';

export const metadata: Metadata = { title: 'Удаление данных — Forme' };

export default function DataDeletionPage() {
  return (
    <main className="policy-page">
      <nav><Link href="/"><ArrowLeft aria-hidden="true" />Вернуться в Forme</Link><span>Data deletion instructions</span></nav>
      <header><p className="overline">DATA CONTROL</p><h1>Как удалить данные Forme</h1><p>Инструкция для владельца Threads-профиля и для проверки Meta.</p></header>
      <section className="policy-highlight"><Trash2 aria-hidden="true" /><div><strong>Сначала отзовите доступ</strong><p>Откройте разрешения сайтов в Threads, выберите Forme и удалите выданный доступ.</p><a href="https://www.threads.com/settings/website_permissions" target="_blank" rel="noreferrer">Открыть настройки Threads <ExternalLink aria-hidden="true" /></a></div></section>
      <section><h2>Запрос на удаление данных</h2><ol><li>Напишите на <a href="mailto:evgenyrsk7@gmail.com?subject=Forme%20data%20deletion%20request">evgenyrsk7@gmail.com</a>.</li><li>Тема письма: <strong>Forme data deletion request</strong>.</li><li>Укажите Threads username и попросите удалить связанные токены, сигналы и технические записи.</li></ol><p>Не отправляйте пароль, код входа или access token.</p></section>
      <section><h2>Что будет удалено</h2><ul><li>сохранённый серверный доступ к Threads;</li><li>связанные с запросом нормализованные Threads-сигналы;</li><li>технические журналы, если их хранение больше не требуется для безопасности или выполнения закона.</li></ul></section>
      <section><h2>Срок и подтверждение</h2><p>Владелец подтвердит получение запроса и завершит проверенное удаление в течение 30 календарных дней, затем сообщит о результате по email.</p></section>
      <section className="policy-pending"><div><h2>Публичная инструкция</h2><p>Актуальная версия доступна по адресу <a href="https://forme-meta-review.evgenyrsk7.chatgpt.site/data-deletion" target="_blank" rel="noreferrer">forme-meta-review.evgenyrsk7.chatgpt.site/data-deletion</a>.</p></div></section>
    </main>
  );
}
