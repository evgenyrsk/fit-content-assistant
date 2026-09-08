export async function readJsonBody<T>(response: Response): Promise<T | { error?: string }> {
  // The hosting edge can omit Content-Type on an otherwise valid route response.
  // Parse the body itself so a valid JSON result remains usable, while still
  // rejecting HTML error pages and other malformed responses.
  try {
    const body = await response.text();
    return JSON.parse(body) as T;
  } catch {
    return { error: response.ok ? 'Сервер вернул некорректный ответ.' : 'Сервис временно недоступен.' };
  }
}
