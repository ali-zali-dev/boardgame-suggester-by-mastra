import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { findGameInCSV } from './csv-helper';

export const csvConstraintTool = createTool({
  id: 'csv-constraint',
  description: 'Validates if a board game exists in the allowed games list (boardgame-template.csv). Only games that exist in this list can be returned to the user.',
  inputSchema: z.object({
    gameName: z.string().describe('The name of the board game to validate (English or Persian)'),
  }),
  outputSchema: z.object({
    exists: z.boolean().describe('Whether the game exists in the CSV'),
    persianName: z.string().optional().describe('Persian name of the game if found'),
    englishName: z.string().optional().describe('English name of the game if found'),
  }),
  execute: async ({ context }) => {
    const game = findGameInCSV(context.gameName);
    
    if (game) {
      return {
        exists: true,
        persianName: game.persianName || undefined,
        englishName: game.englishName || undefined,
      };
    }
    
    return {
      exists: false,
    };
  },
});

