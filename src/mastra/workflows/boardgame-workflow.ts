import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { getBoardgameRecommendations } from '../agents/boardgame-agent';

const gameSchema = z.object({
  name: z.string(),
  yearPublished: z.number(),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  playTime: z.number(),
  complexityAverage: z.number(),
  ratingAverage: z.number(),
  mechanics: z.string(),
  domains: z.string(),
  bggRank: z.number(),
  similarity: z.string(),
});

const searchBoardgames = createStep({
  id: 'search-boardgames',
  description: 'Search for board games based on natural language query',
  inputSchema: z.object({
    query: z.string().describe('Natural language query for board game search'),
    topK: z.number().optional().default(5).describe('Number of top results to return'),
  }),
  outputSchema: z.object({
    games: z.array(gameSchema),
    query: z.string(),
    resultsCount: z.number(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    console.log(`🎯 Workflow: Searching for board games with query: "${inputData.query}"`);
    
    const games = await getBoardgameRecommendations(inputData.query, inputData.topK);
    
    console.log(`✅ Workflow: Found ${games.length} matching games`);
    
    return {
      games,
      query: inputData.query,
      resultsCount: games.length,
    };
  },
});

const boardgameWorkflow = createWorkflow({
  id: 'boardgame-workflow',
  inputSchema: z.object({
    query: z.string().describe('Natural language query for board game search'),
    topK: z.number().optional().default(5).describe('Number of top results to return'),
  }),
  outputSchema: z.object({
    games: z.array(gameSchema),
    query: z.string(),
    resultsCount: z.number(),
  }),
})
  .then(searchBoardgames);

boardgameWorkflow.commit();

// Export function for direct programmatic access
export async function recommendGames(query: string, topK: number = 5) {
  console.log(`🚀 Starting board game recommendation workflow`);
  console.log(`📝 Query: "${query}", Top K: ${topK}`);
  
  try {
    const result = await getBoardgameRecommendations(query, topK);
    
    console.log(`🎉 Workflow completed successfully with ${result.length} recommendations`);
    
    return {
      games: result,
      query,
      resultsCount: result.length,
    };
  } catch (error) {
    console.error('❌ Workflow failed:', error);
    throw error;
  }
}

export { boardgameWorkflow };
