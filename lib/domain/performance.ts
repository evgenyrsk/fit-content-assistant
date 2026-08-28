export type MetricSource = 'manual' | 'csv';

export interface PublicationMetricInput {
  contentItemId: string;
  platform: string;
  recordedAt: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  watchTimeSeconds?: number;
  source: MetricSource;
}

export interface ContentPerformanceSummary {
  contentItemId: string;
  title: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagementRate: number;
  lastRecordedAt: string;
}

export interface PerformanceResult {
  summaries: ContentPerformanceSummary[];
  snapshots: number;
  generatedAt: string;
}

const requiredHeaders = [
  'content_item_id', 'platform', 'recorded_at', 'views', 'likes', 'comments', 'saves', 'shares',
] as const;

function csvCells(line: string): string[] {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { cells.push(value.trim()); value = ''; }
    else value += character;
  }
  cells.push(value.trim());
  return cells;
}

function count(value: string | undefined, field: string, row: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Строка ${row}: ${field} должен быть целым числом ≥ 0.`);
  return parsed;
}

export function validatePublicationMetric(input: PublicationMetricInput): string[] {
  const errors: string[] = [];
  if (!input.contentItemId.trim()) errors.push('Не выбран материал.');
  if (!input.platform.trim()) errors.push('Не указана платформа.');
  if (Number.isNaN(new Date(input.recordedAt).valueOf())) errors.push('Некорректная дата метрик.');
  for (const [name, value] of Object.entries({
    views: input.views, likes: input.likes, comments: input.comments, saves: input.saves, shares: input.shares,
  })) if (!Number.isInteger(value) || value < 0) errors.push(`${name} должен быть целым числом ≥ 0.`);
  if (input.watchTimeSeconds !== undefined && (!Number.isFinite(input.watchTimeSeconds) || input.watchTimeSeconds < 0)) {
    errors.push('watch_time_seconds должен быть числом ≥ 0.');
  }
  return errors;
}

export function parsePublicationMetricsCsv(csv: string): PublicationMetricInput[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('CSV должен содержать заголовок и хотя бы одну строку.');
  const headers = csvCells(lines[0]).map((header) => header.toLowerCase());
  for (const header of requiredHeaders) if (!headers.includes(header)) throw new Error(`В CSV отсутствует колонка ${header}.`);
  return lines.slice(1).map((line, index) => {
    const values = csvCells(line);
    const row = Object.fromEntries(headers.map((header, position) => [header, values[position] ?? '']));
    const metric: PublicationMetricInput = {
      contentItemId: row.content_item_id, platform: row.platform, recordedAt: row.recorded_at,
      views: count(row.views, 'views', index + 2), likes: count(row.likes, 'likes', index + 2),
      comments: count(row.comments, 'comments', index + 2), saves: count(row.saves, 'saves', index + 2),
      shares: count(row.shares, 'shares', index + 2), source: 'csv',
    };
    if (row.watch_time_seconds) metric.watchTimeSeconds = Number(row.watch_time_seconds);
    const errors = validatePublicationMetric(metric);
    if (errors.length) throw new Error(`Строка ${index + 2}: ${errors.join(' ')}`);
    return metric;
  });
}
