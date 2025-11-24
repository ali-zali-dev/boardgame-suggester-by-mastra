/**
 * Example usage of the Boardgame Suggester Agent
 * 
 * This demonstrates how to use the boardgame agent to get game recommendations
 * based on natural language queries.
 */

import { mastra } from './src/mastra/index';

async function testBoardgameAgent() {
  const agent = mastra.getAgent('boardgameAgent');

  if (!agent) {
    console.error('Boardgame agent not found!');
    return;
  }

  // Example queries
  const queries = [
    'best strategic game about cars',
    'easy game for 4 players',
    'game with drafting mechanism',
    'family game for beginners',
    'cooperative game',
  ];

  for (const query of queries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Query: ${query}`);
    console.log('='.repeat(60));

    try {
      const response = await agent.generate([
        {
          role: 'user',
          content: query,
        },
      ]);

      console.log('\nResponse:');
      console.log(response.text);
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

// Run the test
testBoardgameAgent().catch(console.error);

