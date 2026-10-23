// Server-only content: never export solutions through contracts or web sources.
interface Question { id: string; prompt: string; choices: [string, string, string, string]; correctChoice: number }
export const questions: readonly Question[] = [
  { id: 'solar-system', prompt: 'Quelle est la plus grande planète du système solaire ?', choices: ['La Terre', 'Jupiter', 'Mars', 'Vénus'], correctChoice: 1 },
  { id: 'hexagon', prompt: 'Combien de côtés possède un hexagone ?', choices: ['Cinq', 'Sept', 'Six', 'Huit'], correctChoice: 2 },
  { id: 'japan', prompt: 'Quelle est la capitale du Japon ?', choices: ['Tokyo', 'Kyoto', 'Osaka', 'Séoul'], correctChoice: 0 },
  { id: 'water', prompt: 'Quelle est la formule chimique de l’eau ?', choices: ['CO2', 'O2', 'NaCl', 'H2O'], correctChoice: 3 },
  { id: 'week', prompt: 'Combien de jours compte une semaine ?', choices: ['Cinq', 'Sept', 'Six', 'Huit'], correctChoice: 1 },
];
