const vocabulary: Array<[RegExp, string]> = [
  [/тренир\p{L}*\s+до\s+отказ\p{L}*|мышечн\p{L}*\s+отказ\p{L}*/giu, 'training to failure'],
  [/мышечн\p{L}*\s+бол\p{L}*|крепатур\p{L}*/giu, 'delayed onset muscle soreness'],
  [/рост\p{L}*\s+мышц\p{L}*|гипертроф\p{L}*/giu, 'muscle hypertrophy'],
  [/силов\p{L}*\s+тренир\p{L}*/giu, 'resistance training'],
  [/медленн\p{L}*\s+повтор\p{L}*|темп\p{L}*\s+повтор\p{L}*/giu, 'repetition tempo'],
  [/креатин\p{L}*/giu, 'creatine'],
  [/сил\p{L}*(?:\s+показател\p{L}*)?/giu, 'strength'],
  [/л[её]гк\p{L}*\s+вес\p{L}*/giu, 'low load'],
  [/тяж[её]л\p{L}*\s+вес\p{L}*/giu, 'high load'],
  [/выносливост\p{L}*/giu, 'endurance'],
  [/мышечн\p{L}*\s+масс\p{L}*/giu, 'muscle mass'],
  [/белк\p{L}*|протеин\p{L}*/giu, 'dietary protein'],
  [/доз\p{L}*/giu, 'dose'],
  [/похуд\p{L}*|снижени\p{L}*\s+вес\p{L}*/giu, 'weight loss'],
  [/калори\p{L}*/giu, 'calories'],
  [/шаг\p{L}*|ходьб\p{L}*/giu, 'walking steps'],
  [/объ[её]м\p{L}*\s+тренир\p{L}*/giu, 'training volume'],
  [/частот\p{L}*\s+тренир\p{L}*/giu, 'training frequency'],
  [/интервал\p{L}*\s+отдых\p{L}*|отдых\p{L}*\s+между\s+подход\p{L}*/giu, 'rest interval'],
  [/кофеин\p{L}*/giu, 'caffeine'],
  [/растяжк\p{L}*(?:\s+\p{L}+){0,3}\s+гибкост\p{L}*|гибкост\p{L}*(?:\s+\p{L}+){0,3}\s+растяжк\p{L}*|растяжк\p{L}*|гибкост\p{L}*/giu, 'stretching flexibility'],
  [/кардио\p{L}*|аэробн\p{L}*\s+тренир\p{L}*/giu, 'aerobic exercise'],
  [/интервальн\p{L}*\s+тренир\p{L}*|hiit/giu, 'high intensity interval training'],
  [/кардиореспираторн\p{L}*\s+форм\p{L}*|мпк|vo2\s*max/giu, 'cardiorespiratory fitness'],
  [/холодн\p{L}*\s+душ\p{L}*|ледян\p{L}*\s+ванн\p{L}*/giu, 'cold water immersion'],
  [/восстановлен\p{L}*/giu, 'recovery'],
  [/кортизол\p{L}*/giu, 'cortisol'],
  [/сон\p{L}*/giu, 'sleep'],
  [/бета[-\s]?аланин\p{L}*/giu, 'beta alanine'],
  [/магни\p{L}*/giu, 'magnesium'],
  [/судорог\p{L}*/giu, 'muscle cramps'],
  [/смертност\p{L}*/giu, 'mortality'],
  [/безопас\p{L}*/giu, 'safety adverse events'],
  [/здоров\p{L}*\s+взросл\p{L}*/giu, 'healthy adults'],
  [/пожил\p{L}*/giu, 'older adults'],
];

export function buildScientificQuery(query: string): string {
  const translated = vocabulary.reduce((value, [pattern, replacement]) => value.replace(pattern, ` ${replacement} `), query.toLowerCase());
  const englishTerms = translated.match(/[a-z][a-z\s-]+/g)?.join(' ').replace(/\s+/g, ' ').trim();
  return englishTerms && englishTerms.length >= 3 ? englishTerms : query;
}
