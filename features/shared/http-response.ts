export async function readJsonBody<T>(response: Response): Promise<T | { error?: string }> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { error: response.ok ? 'Сервер вернул некорректный ответ.' : 'Сервис временно недоступен.' };
  }
  try { return await response.json() as T; }
  catch { return { error: 'Сервер вернул повреждённый ответ.' }; }
}
