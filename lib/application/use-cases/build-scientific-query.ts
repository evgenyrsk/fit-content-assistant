const vocabulary: Array<[RegExp, string]> = [
  [/трениров\w*\s+до\s+отказ\w*|мышечн\w*\s+отказ\w*/giu, 'training to failure'],
  [/рост\w*\s+мышц\w*|гипертроф\w*/giu, 'muscle hypertrophy'],
  [/силов\w*\s+трениров\w*/giu, 'resistance training'],
  [/медленн\w*\s+повтор\w*|темп\w*\s+повтор\w*/giu, 'repetition tempo'],
  [/креатин\w*/giu, 'creatine'],
  [/сил\w*(?:\s+показател\w*)?/giu, 'strength'],
  [/выносливост\w*/giu, 'endurance'],
  [/мышечн\w*\s+масс\w*/giu, 'muscle mass'],
  [/белк\w*|протеин\w*/giu, 'dietary protein'],
  [/похуд\w*|снижени\w*\s+вес\w*/giu, 'weight loss'],
  [/калори\w*/giu, 'calories'],
  [/шаг\w*|ходьб\w*/giu, 'walking steps'],
  [/восстановлен\w*/giu, 'recovery'],
  [/кортизол\w*/giu, 'cortisol'],
  [/сон\w*/giu, 'sleep'],
];

export function buildScientificQuery(query: string): string {
  const translated = vocabulary.reduce((value, [pattern, replacement]) => value.replace(pattern, ` ${replacement} `), query.toLowerCase());
  const englishTerms = translated.match(/[a-z][a-z\s-]+/g)?.join(' ').replace(/\s+/g, ' ').trim();
  return englishTerms && englishTerms.length >= 3 ? englishTerms : query;
}
