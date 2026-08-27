export function parseJsonOutput<T>(text: string, provider: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${provider} returned invalid structured output.`);
  }
}

export function requireSuccessfulResponse(response: Response, provider: string): void {
  if (!response.ok) throw new Error(`${provider} request failed with status ${response.status}.`);
}
