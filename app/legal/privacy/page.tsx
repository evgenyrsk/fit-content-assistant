import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Database, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = { title: 'Политика конфиденциальности — Forme' };

export default function PrivacyPolicyPage() {
  return (
    <main className="policy-page">
      <nav><Link href="/"><ArrowLeft aria-hidden="true" />Вернуться в Forme</Link><span>Черновик до публичного запуска</span></nav>
      <header><p className="overline">PRIVACY · DRAFT 1</p><h1>Политика конфиденциальности Forme</h1><p>Последнее обновление: 28 августа 2026 года. Этот текст описывает фактический контур MVP и требует подтверждения владельца перед публикацией.</p></header>
      <section className="policy-highlight"><ShieldCheck aria-hidden="true" /><div><strong>Коротко</strong><p>Forme — личный научный редактор фитнес-контента. Сервис не продаёт данные и не использует их для рекламы.</p></div></section>
      <section><h2>Какие данные обрабатываются</h2><ul><li>исследовательские запросы, найденные источники, решения проверки и подготовленные материалы;</li><li>загруженные владельцем PDF и их технические метаданные;</li><li>серверный токен Threads владельца приложения;</li><li>для поиска трендов: идентификатор, сокращённый текст, ссылка и время публичной публикации Threads, а также вычисленные оценки свежести и соответствия теме.</li></ul></section>
      <section><h2>Зачем это нужно</h2><p>Данные используются только для поиска тем, исследования научных источников, контроля доказательности, подготовки контента и сохранения проверяемой истории решений.</p></section>
      <section><h2>Хранение и защита</h2><p>Структурированные записи хранятся в закрытой базе проекта, файлы — в закрытом объектном хранилище, а токены — только в серверных секретах. Секреты не отправляются в браузер и не записываются в журнал проекта.</p></section>
      <section><h2>Передача и продажа</h2><p>Forme не продаёт персональные данные. Для работы используются инфраструктура хостинга, Meta Threads API и научные источники, перечисленные в продуктовой документации. Передача ограничена технически необходимым объёмом.</p></section>
      <section><h2>Удаление и отзыв доступа</h2><p>Доступ Forme к Threads можно отозвать в настройках разрешений Threads. Инструкция по удалению данных находится на странице <a href="/legal/data-deletion">«Удаление данных»</a>.</p></section>
      <section className="policy-pending"><Database aria-hidden="true" /><div><h2>Контакт владельца</h2><p>Контактный email будет добавлен одновременно в эту политику и в Meta App Settings после подтверждения владельцем. До этого документ нельзя использовать как публичную юридическую страницу.</p></div></section>
      <footer><span>Forme · privacy draft</span><p>An English reviewer summary is available in the Meta review guide.</p></footer>
    </main>
  );
}
