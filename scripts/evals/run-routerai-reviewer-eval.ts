import { factReviewSchema, validateFactReview } from '../../lib/application/orchestration/fact-review-contract.ts';
import { factReviewPrompt } from '../../lib/application/orchestration/content-prompts.ts';
import { missingRequiredCaveats } from '../../lib/application/orchestration/fact-review-preflight.ts';
import { RouterAiProvider } from '../../lib/infrastructure/llm/routerai-provider.ts';
import { reviewerEvalCases, type ReviewerEvalCase } from './reviewer-eval-cases.ts';

const modelPrices = {
  'openai/gpt-5-mini': { input: 27, output: 222 },
  'deepseek/deepseek-v3.2': { input: 23, output: 34 },
} as const;
type EvalModel = keyof typeof modelPrices;

function estimatedRub(model: EvalModel, input = 0, output = 0): number {
  const price = modelPrices[model];
  return Number(((input * price.input + output * price.output) / 1_000_000).toFixed(4));
}

function expectedPass(expected: ReviewerEvalCase['expected'], decision: string): boolean {
  return expected === 'approve' ? decision === 'approved' : decision !== 'approved';
}

function preflightResult(item: ReviewerEvalCase, started: number) {
  const missingCaveats = missingRequiredCaveats(item.draft, item.requiredCaveats);
  if (missingCaveats.length === 0) return null;
  return {
    caseId: item.id, title: item.title, danger: item.danger, expected: item.expected,
    verdict: expectedPass(item.expected, 'rejected') ? 'pass' : 'fail',
    decision: 'rejected', route: 'deterministic_preflight',
    latencyMs: Math.round(performance.now() - started), inputTokens: 0, outputTokens: 0, estimatedRub: 0,
    output: { decision: 'rejected', missingCaveats },
  };
}

function errorClass(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

async function evaluateCase(provider: RouterAiProvider, model: EvalModel, item: ReviewerEvalCase) {
  const started = performance.now();
  const preflight = preflightResult(item, started);
  if (preflight) return preflight;
  try {
    const result = await provider.generateStructured<unknown>({
      model, system: factReviewPrompt.system,
      input: JSON.stringify({ draft: item.draft, claims: item.claims, requiredCaveats: item.requiredCaveats }),
      schemaName: 'forme_fact_review_eval', outputSchema: factReviewSchema, maxOutputTokens: 1800,
      metadata: { runId: `eval-${item.id}`, stage: 'fact_review', promptVersion: factReviewPrompt.version },
    });
    const review = validateFactReview(result.output, item.draft, item.requiredCaveats);
    return {
      caseId: item.id, title: item.title, danger: item.danger, expected: item.expected,
      verdict: expectedPass(item.expected, review.decision) ? 'pass' : 'fail',
      decision: review.decision, latencyMs: Math.round(performance.now() - started),
      inputTokens: result.usage?.inputTokens ?? 0, outputTokens: result.usage?.outputTokens ?? 0,
      estimatedRub: estimatedRub(model, result.usage?.inputTokens, result.usage?.outputTokens),
      output: review,
    };
  } catch (error) {
    return {
      caseId: item.id, title: item.title, danger: item.danger, expected: item.expected,
      verdict: 'contract_error', decision: null, latencyMs: Math.round(performance.now() - started),
      inputTokens: 0, outputTokens: 0, estimatedRub: 0,
      errorClass: errorClass(error),
    };
  }
}

async function evaluateModel(provider: RouterAiProvider, model: EvalModel) {
  const results = [];
  for (const item of reviewerEvalCases) results.push(await evaluateCase(provider, model, item));
  return {
    model, passed: results.filter((result) => result.verdict === 'pass').length,
    failed: results.filter((result) => result.verdict === 'fail').length,
    contractErrors: results.filter((result) => result.verdict === 'contract_error').length,
    totalLatencyMs: results.reduce((sum, result) => sum + result.latencyMs, 0),
    estimatedRub: Number(results.reduce((sum, result) => sum + result.estimatedRub, 0).toFixed(4)),
    results,
  };
}

const apiKey = process.env.FORME_ROUTERAI_KEY;
if (!apiKey) throw new Error('FORME_ROUTERAI_KEY is required.');
const models = Object.keys(modelPrices) as EvalModel[];
const provider = new RouterAiProvider({
  apiKey, baseUrl: 'https://routerai.ru/api/v1',
  capabilities: Object.fromEntries(models.map((model) => [model, ['structured_output']])),
});
const runs = await Promise.all(models.map((model) => evaluateModel(provider, model)));
console.log(JSON.stringify({
  suite: 'reviewer-safety@1.2.0', executedAt: new Date().toISOString(), cases: reviewerEvalCases.length, runs,
}, null, 2));
