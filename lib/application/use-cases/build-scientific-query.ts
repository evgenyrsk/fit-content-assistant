const vocabulary: Array<[RegExp, string]> = [
  [/тренир\p{L}*\s+до\s+отказ\p{L}*|мышечн\p{L}*\s+отказ\p{L}*/giu, 'training to failure'],
  [/рост\p{L}*\s+мышц\p{L}*|гипертроф\p{L}*/giu, 'muscle hypertrophy'],
  [/силов\p{L}*\s+тренир\p{L}*/giu, 'resistance training'],
  [/медленн\p{L}*\s+повтор\p{L}*|темп\p{L}*\s+повтор\p{L}*/giu, 'repetition tempo'],
  [/креатин\p{L}*/giu, 'creatine'],
  [/сил\p{L}*(?:\s+показател\p{L}*)?/giu, 'strength'],
  [/выносливост\p{L}*/giu, 'endurance'],
  [/мышечн\p{L}*\s+масс\p{L}*/giu, 'muscle mass'],
  [/белк\p{L}*|протеин\p{L}*/giu, 'dietary protein'],
  [/похуд\p{L}*|снижени\p{L}*\s+вес\p{L}*/giu, 'weight loss'],
  [/калори\p{L}*/giu, 'calories'],
  [/шаг\p{L}*|ходьб\p{L}*/giu, 'walking steps'],
  [/восстановлен\p{L}*/giu, 'recovery'],
  [/кортизол\p{L}*/giu, 'cortisol'],
  [/сон\p{L}*/giu, 'sleep'],
];

export function buildScientificQuery(query: string): string {
  const translated = vocabulary.reduce((value, [pattern, replacement]) => value.replace(pattern, ` ${replacement} `), query.toLowerCase());
  const englishTerms = translated.match(/[a-z][a-z\s-]+/g)?.join(' ').replace(/\s+/g, ' ').trim();
  return englishTerms && englishTerms.length >= 3 ? englishTerms : query;
}
