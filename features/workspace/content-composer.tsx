import {
  ArrowUpRight, Check, CircleAlert, Link2, LoaderCircle, LockKeyhole, Sparkles, X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ContentFormat } from '@/features/shared';
import type { ContentPipelineResponse, ContentPipelineStage, ContentStageState } from '@/lib/domain';
import { useContentPipeline } from './use-content-pipeline';

interface ContentComposerProps {
  activeFormat: ContentFormat | null;
  onFormatChange: (format: ContentFormat | null) => void;
  autoRunKey: number;
  autoRunClaimVersionIds: string[];
  onOpenContent: () => void;
}

const formats: ContentFormat[] = ['Reels', 'Telegram', 'Threads', 'Карусель'];
const stageLabels: Record<ContentPipelineStage, string> = {
  content_brief: 'Угол', platform_draft: 'Формат', voice_edit: 'Голос', fact_review: 'Фактчек',
};

function PipelineStages({ result, running }: { result: ContentPipelineResponse | null; running: boolean }) {
  const stages = result?.stages ?? (Object.keys(stageLabels) as ContentPipelineStage[]).map((stage) => ({
    stage, status: 'waiting', message: 'Ожидает запуска.',
  } as ContentStageState));
  return <ol className="content-pipeline-stages" aria-label="Этапы контентного конвейера">
    {stages.map((stage, index) => <li key={stage.stage} data-state={running ? 'running' : stage.status}>
      <span>{String(index + 1).padStart(2, '0')}</span>
      <p><strong>{stageLabels[stage.stage]}</strong><small>{running ? 'Выполняется строгий контракт' : stage.message}</small></p>
    </li>)}
  </ol>;
}

function StartPanel({ format, running, onRun }: { format: ContentFormat; running: boolean; onRun: () => void }) {
  return <div className="content-gate-panel" data-state={running ? 'running' : 'idle'}>
    <span>{running ? <LoaderCircle className="spin" aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</span>
    <div><strong>{running ? 'Собираю проверяемый черновик' : `Создать материал для ${format}`}</strong>
      <p>{running
        ? 'Каждый этап получает отдельный контекст. Связи с claims проверяются до сохранения.'
        : 'Запуск возможен только на свежих approved-claims. Без них система не подставит демонстрационный текст.'}</p></div>
    <button type="button" onClick={onRun} disabled={running}>
      {running ? 'В работе' : 'Запустить'} <Sparkles aria-hidden="true" />
    </button>
  </div>;
}

function BlockedPanel({ result, error, onRun }: {
  result: ContentPipelineResponse | null; error: string | null; onRun: () => void;
}) {
  const message = error ?? result?.message ?? 'Конвейер остановлен защитным gate.';
  const title = result?.status === 'awaiting_claims'
    ? 'Сначала нужен утверждённый тезис'
    : result?.status === 'awaiting_provider' ? 'Контентная LLM ещё не подключена' : 'Требуется проверка';
  return <div className="content-gate-panel" data-state="blocked">
    <span><CircleAlert aria-hidden="true" /></span>
    <div><strong>{title}</strong><p>{message}</p><small>Публикация заблокирована. Демо-материал не считается результатом.</small></div>
    <button type="button" onClick={onRun}>Проверить снова <ArrowUpRight aria-hidden="true" /></button>
  </div>;
}

function DraftFragments({ result }: { result: ContentPipelineResponse }) {
  const fragments = result.contentItem?.draft.fragments ?? [];
  return <div className="draft">
    {fragments.map((fragment, index) => <article key={fragment.id}>
      <span>{String(index + 1).padStart(2, '0')}</span>
      <div><p>{fragment.text}</p><small><Link2 aria-hidden="true" /> {fragment.kind === 'fact'
        ? `${fragment.claimVersionIds.length} claim-связей` : 'Нефактический фрагмент'}</small></div>
    </article>)}
  </div>;
}

function FactCheck({ result }: { result: ContentPipelineResponse }) {
  const item = result.contentItem;
  if (!item) return null;
  const passed = item.factReview.decision === 'approved';
  return <aside className="factcheck" data-state={passed ? 'passed' : 'blocked'}>
    <div><span>{passed ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}</span><p>
      <strong>{passed ? 'Фактический gate пройден' : 'Фактчек требует доработки'}</strong>
      <small>{item.brief.requiredClaimVersionIds.length} approved-claims · стиль: временный нейтральный профиль</small>
    </p></div>
    <p>{passed
      ? 'Черновик сохранён для человеческого просмотра. Автопубликация отключена.'
      : item.factReview.notes.join(' ') || 'Неподдержанные фрагменты не допускаются к публикации.'}</p>
  </aside>;
}

function StudioBody(props: {
  format: ContentFormat; result: ContentPipelineResponse | null; error: string | null;
  running: boolean; onRun: () => void;
}) {
  if (props.running) return <StartPanel format={props.format} running onRun={props.onRun} />;
  if (props.error || (props.result && !props.result.contentItem)) {
    return <BlockedPanel result={props.result} error={props.error} onRun={props.onRun} />;
  }
  if (!props.result) return <StartPanel format={props.format} running={false} onRun={props.onRun} />;
  return <><DraftFragments result={props.result} /><FactCheck result={props.result} /></>;
}

function ContentStudio(props: {
  format: ContentFormat; result: ContentPipelineResponse | null; error: string | null;
  running: boolean; onRun: () => void; onClose: () => void; onOpenContent: () => void;
}) {
  const title = props.result?.contentItem?.draft.title ?? `Новый ${props.format}-материал`;
  return <section className="content-studio">
    <div className="studio-header"><div><p className="overline">{props.format} · TRACEABLE PIPELINE</p>
      <h2>{title}</h2><span>Только approved-claims · независимый финальный фактчек</span></div>
      <button onClick={props.onClose} aria-label="Закрыть редактор"><X aria-hidden="true" /></button>
    </div>
    <PipelineStages result={props.result} running={props.running} />
    <StudioBody {...props} />
    {props.result?.contentItem && <button className="content-open-operations" type="button" onClick={props.onOpenContent}>Открыть финальную проверку и архив <ArrowUpRight aria-hidden="true" /></button>}
  </section>;
}

export function ContentComposer({
  activeFormat, onFormatChange, autoRunKey, autoRunClaimVersionIds, onOpenContent,
}: ContentComposerProps) {
  const { generate, stateFor } = useContentPipeline();
  const lastAutoRun = useRef(0);
  const state = stateFor(activeFormat);
  useEffect(() => {
    if (!activeFormat || autoRunKey <= lastAutoRun.current) return;
    lastAutoRun.current = autoRunKey;
    void generate(activeFormat, autoRunClaimVersionIds);
  }, [activeFormat, autoRunClaimVersionIds, autoRunKey, generate]);
  return <>
    <section className="content-launcher">
      <div className="launcher-copy"><span className="launcher-index">02</span><div><p className="overline">CONTENT ENGINE</p>
        <h2>Упаковать правду интересно.</h2><p>Четыре изолированных этапа. Ни одного факта без claim-связи.</p></div></div>
      <div className="format-buttons">{formats.map((format) => <button
        className={activeFormat === format ? 'chosen' : ''} key={format} onClick={() => onFormatChange(format)}
      ><span>{format}</span><ArrowUpRight aria-hidden="true" /></button>)}</div>
    </section>
    {activeFormat && <ContentStudio
      format={activeFormat} result={state.result} error={state.error} running={state.running}
      onRun={() => generate(activeFormat)} onClose={() => onFormatChange(null)} onOpenContent={onOpenContent}
    />}
  </>;
}
