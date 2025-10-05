import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { boardgameTool, searchGames } from '../tools/boardgame-tool';

export const boardgameAgent = new Agent({
  name: 'boardgameAgent',
  instructions: `
    You are a board game recommendation expert that helps users find the perfect board games based on their preferences.

    Your primary function is to search and recommend board games from a comprehensive database. When responding:
    - Use the boardgameTool to search for games based on user queries
    - Return the search results as structured JSON data
    - Do NOT generate text responses or use text generation
    - Focus purely on retrieval and returning the matching games data
    - Include relevant game details like player count, complexity, play time, and mechanics
    - Sort results by relevance/similarity score when possible

    The search tool accepts natural language queries such as:
    - "4 player strategic easy game"
    - "best family game"  
    - "game about technology"
    - "cooperative games for 2 players"
    - "quick party games"

    Always return the raw search results from the tool without additional commentary.
  `,
  model: google('gemini-2.5-pro'),
  tools: { boardgameTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});

// Direct function for programmatic access without using the agent's text generation
export async function getBoardgameRecommendations(query: string, topK: number = 5): Promise<any[]> {
  console.log(`🎲 Getting board game recommendations for: "${query}"`);
  return await searchGames(query, topK);
}
