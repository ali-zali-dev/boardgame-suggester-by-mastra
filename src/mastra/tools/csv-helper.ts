import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface BoardGame {
  persianName: string;
  englishName: string;
}

let cachedGames: BoardGame[] | null = null;

export function loadBoardGames(): BoardGame[] {
  if (cachedGames) {
    return cachedGames;
  }

  // Get the project root directory (3 levels up from this file: tools -> mastra -> src -> root)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = join(__dirname, '..', '..', '..');
  const csvPath = join(projectRoot, 'data', 'boardgame-template.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  const games: BoardGame[] = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [persianName, englishName] = line.split(',');
    
    // Only add if at least one name exists
    if (persianName || englishName) {
      games.push({
        persianName: persianName?.trim() || '',
        englishName: englishName?.trim() || '',
      });
    }
  }

  cachedGames = games;
  return games;
}

export function findGameInCSV(gameName: string): BoardGame | null {
  const games = loadBoardGames();
  const normalizedSearch = gameName.toLowerCase().trim();

  return games.find(
    (game) =>
      game.englishName.toLowerCase() === normalizedSearch ||
      game.persianName.toLowerCase() === normalizedSearch ||
      game.englishName.toLowerCase().includes(normalizedSearch) ||
      game.persianName.toLowerCase().includes(normalizedSearch)
  ) || null;
}

