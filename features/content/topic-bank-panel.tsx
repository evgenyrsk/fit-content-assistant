import { BookmarkPlus, FlaskConical, Lightbulb, NotebookPen } from 'lucide-react';
import { useState } from 'react';
import type { ContentFormat, TopicIdea, TopicIdeaInput, UserNote } from '@/lib/domain';
import { useTopicBank } from './use-topic-bank';

const readinessLabels = { supported: 'Есть approved evidence', research_needed: 'Нужно исследование', blocked: 'Заблокировано' };

function TopicCard({ topic, action }: { topic: TopicIdea; action: React.ReactNode }) {
  return <article className="topic-card"><div><span>{topic.origin}</span><b className={`readiness-${topic.scientificReadiness}`}>{readinessLabels[topic.scientificReadiness]}</b></div>
    <h3>{topic.title}</h3><p>{topic.angle}</p><div className="topic-card-actions"><small>{topic.targetFormat}</small>{action}</div></article>;
}

export function TopicBankPanel() {
  const topicBank = useTopicBank();
  const [title, setTitle] = useState(''); const [angle, setAngle] = useState('');
  const [format, setFormat] = useState<ContentFormat>('threads');
  const [noteTopic, setNoteTopic] = useState(''); const [note, setNote] = useState('');
  const [noteKind, setNoteKind] = useState<UserNote['kind']>('personal_experience');

  async function addTopic(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const saved = await topicBank.saveTopic({
      title, angle, targetFormat: format, origin: 'manual', scientificReadiness: 'research_needed',
    });
    if (saved) { setTitle(''); setAngle(''); }
  }

  async function addNote(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const saved = await topicBank.saveNote({ kind: noteKind, topic: noteTopic, content: note });
    if (saved) { setNoteTopic(''); setNote(''); }
  }

  function suggestionInput(topic: TopicIdea): TopicIdeaInput {
    return {
      title: topic.title, angle: topic.angle, origin: topic.origin, scientificReadiness: topic.scientificReadiness,
      targetFormat: topic.targetFormat, linkedClaimIds: topic.linkedClaimIds, linkedSignalIds: topic.linkedSignalIds,
    };
  }

  return <section className="content-workbench-panel topic-bank-panel"><header><div><p className="overline">TOPIC INTELLIGENCE</p>
    <h2>Банк тем и личный материал</h2><span>Идеи из трендов, пробелов и противоречий не маскируются под готовые научные выводы.</span></div></header>
    <div className="topic-bank-grid"><section><div className="subsection-heading"><FlaskConical aria-hidden="true" /><div><h3>Автоподбор без LLM</h3>
      <p>Просроченные claims, противоречия и свежие trend signals.</p></div></div>
      <div className="topic-card-grid">{topicBank.bank?.suggestions.slice(0, 8).map((topic) => <TopicCard key={topic.id} topic={topic}
        action={<button type="button" onClick={() => void topicBank.saveTopic(suggestionInput(topic))}><BookmarkPlus aria-hidden="true" />Сохранить</button>} />)}</div>
      {!topicBank.bank?.suggestions.length && <p className="operations-empty">Автоматических кандидатов пока нет.</p>}
    </section><section><div className="subsection-heading"><Lightbulb aria-hidden="true" /><div><h3>Добавить тему</h3><p>Собственная идея сначала помечается как требующая исследования.</p></div></div>
      <form className="compact-form" onSubmit={(event) => void addTopic(event)}><input aria-label="Тема" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Тема" />
        <textarea aria-label="Угол подачи" rows={3} value={angle} onChange={(event) => setAngle(event.target.value)} placeholder="Угол подачи" />
        <select aria-label="Формат темы" value={format} onChange={(event) => setFormat(event.target.value as ContentFormat)}><option value="threads">Threads</option><option value="reels">Reels</option>
          <option value="telegram">Telegram</option><option value="carousel">Карусель</option></select><button type="submit" disabled={topicBank.saving}>Добавить</button></form>
      <div className="saved-topics"><h3>Сохранённые <span>{topicBank.bank?.saved.length ?? 0}</span></h3>{topicBank.bank?.saved.slice(0, 8).map((topic) => <TopicCard key={topic.id} topic={topic}
        action={<button type="button" onClick={() => void topicBank.saveTopic({ ...suggestionInput(topic), id: topic.id, status: topic.status === 'selected' ? 'backlog' : 'selected' })}>
          {topic.status === 'selected' ? 'В backlog' : 'Выбрать'}</button>} />)}</div></section></div>
    <section className="personal-notes"><div className="subsection-heading"><NotebookPen aria-hidden="true" /><div><h3>Личные заметки</h3>
      <p>Опыт можно использовать в повествовании, но никогда как proof.</p></div></div><div className="notes-layout"><form className="compact-form" onSubmit={(event) => void addNote(event)}>
        <select aria-label="Тип заметки" value={noteKind} onChange={(event) => setNoteKind(event.target.value as UserNote['kind'])}><option value="personal_experience">Личный опыт</option><option value="observation">Наблюдение</option><option value="idea">Идея</option></select>
        <input aria-label="Тема заметки" value={noteTopic} onChange={(event) => setNoteTopic(event.target.value)} placeholder="Тема заметки" />
        <textarea aria-label="Текст заметки" rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Текст" /><button disabled={topicBank.saving}>Сохранить заметку</button></form>
        <div className="notes-list">{topicBank.notes.slice(0, 6).map((item) => <article key={item.id}><b>{item.topic}</b><p>{item.content}</p><small>Только narrative · {item.kind}</small></article>)}</div></div></section>
    {topicBank.error && <p className="operations-error">{topicBank.error}</p>}
  </section>;
}
