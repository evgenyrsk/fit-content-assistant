const fitnessTerms = [
  'фитнес', 'трениров', 'мышц', 'белок', 'протеин', 'похуд', 'калори', 'шаг', 'сон', 'бег', 'зал', 'питани',
  'exercise', 'workout', 'muscle', 'protein', 'weight loss', 'calorie', 'steps', 'sleep', 'running', 'gym', 'fitness', 'diet',
];

const researchableTerms = [
  'эффект', 'работает', 'помогает', 'вред', 'польз', 'лучше', 'нужно', 'стоит', 'почему',
  'effect', 'works', 'help', 'risk', 'benefit', 'better', 'should', 'why',
];

const excludedContexts = [
  'диких белок', 'ветеринар', 'антитеррорист', 'военные тренировки', 'учебные тренировки',
];

function containsTerm(text: string, term: string): boolean {
  if (term.includes(' ')) return text.includes(term);
  return text.split(/[^a-zа-яё0-9]+/u).some((token) => token === term || token.startsWith(term));
}

function matchedShare(text: string, terms: string[]): number {
  const normalized = text.toLowerCase();
  const matches = terms.filter((term) => containsTerm(normalized, term)).length;
  return Math.min(1, matches / 2);
}

export function scoreAudienceFit(text: string): number {
  const normalized = text.toLowerCase();
  if (excludedContexts.some((context) => normalized.includes(context))) return 0;
  return matchedShare(text, fitnessTerms);
}

export function scoreResearchability(text: string): number {
  const subject = scoreAudienceFit(text);
  const questionShape = matchedShare(text, researchableTerms);
  return Math.min(1, subject * 0.65 + questionShape * 0.35);
}
