import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

interface BoardGame {
  id: string;
  name: string;
  yearPublished: number;
  minPlayers: number;
  maxPlayers: number;
  playTime: number;
  minAge: number;
  usersRated: number;
  ratingAverage: number;
  bggRank: number;
  complexityAverage: number;
  ownedUsers: number;
  mechanics: string;
  domains: string;
  searchableText: string;
}

// Simple in-memory cache for embeddings and games data
let gamesCache: BoardGame[] | null = null;
let embeddingsCache: { text: string; embedding: number[] }[] | null = null;

// Simple embedding function using character frequency analysis
function createSimpleEmbedding(text: string): number[] {
  const normalized = text.toLowerCase();
  const features: number[] = new Array(100).fill(0);
  
  // Character frequency features
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    if (charCode >= 97 && charCode <= 122) { // a-z
      features[charCode - 97] += 1;
    }
  }
  
  // Word length features
  const words = normalized.split(/\s+/);
  features[26] = words.length; // word count
  features[27] = words.reduce((sum, word) => sum + word.length, 0) / words.length || 0; // avg word length
  
  // Specific gaming keywords
  const keywords = [
    'strategy', 'family', 'cooperative', 'competitive', 'card', 'board', 'dice',
    'puzzle', 'adventure', 'fantasy', 'sci-fi', 'war', 'economic', 'abstract',
    'party', 'educational', 'thematic', 'euro', 'ameritrash', 'worker', 'placement',
    'deck', 'building', 'area', 'control', 'engine', 'tile', 'resource', 'management'
  ];
  
  keywords.forEach((keyword, index) => {
    if (index < 70) { // Use features 30-99 for keywords
      features[30 + index] = (normalized.match(new RegExp(keyword, 'g')) || []).length;
    }
  });
  
  // Normalize the vector
  const magnitude = Math.sqrt(features.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < features.length; i++) {
      features[i] /= magnitude;
    }
  }
  
  return features;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) || 0;
}

async function loadAndEmbedGames(): Promise<void> {
  if (gamesCache && embeddingsCache) {
    console.log('📋 Using cached games data and embeddings');
    return;
  }

  console.log('📥 Loading board games dataset...');
  
  // Handle different execution contexts (direct run vs Mastra runtime)
  let csvPath = path.join(process.cwd(), 'data/bgg_dataset.csv');
  if (!fs.existsSync(csvPath)) {
    // When running in Mastra, the working directory is .mastra/output/
    csvPath = path.join(process.cwd(), '../../data/bgg_dataset.csv');
  }
  if (!fs.existsSync(csvPath)) {
    // Fallback to original location
    csvPath = path.join(process.cwd(), 'src/mastra/data/bgg_dataset.csv');
  }
  
  console.log(`📁 Loading CSV from: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  console.log(`📊 Processing ${dataLines.length} board games...`);
  
  gamesCache = [];
  embeddingsCache = [];
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const columns = line.split(';');
    if (columns.length < 14) continue;
    
    try {
      const game: BoardGame = {
        id: columns[0],
        name: columns[1],
        yearPublished: parseInt(columns[2]) || 0,
        minPlayers: parseInt(columns[3]) || 0,
        maxPlayers: parseInt(columns[4]) || 0,
        playTime: parseInt(columns[5]) || 0,
        minAge: parseInt(columns[6]) || 0,
        usersRated: parseInt(columns[7]) || 0,
        ratingAverage: parseFloat(columns[8].replace(',', '.')) || 0,
        bggRank: parseInt(columns[9]) || 0,
        complexityAverage: parseFloat(columns[10].replace(',', '.')) || 0,
        ownedUsers: parseInt(columns[11]) || 0,
        mechanics: columns[12] || '',
        domains: columns[13] || '',
        searchableText: ''
      };
      
      // Create searchable text combining all relevant fields
      const complexityLabel = game.complexityAverage <= 2 ? 'easy' : 
                             game.complexityAverage <= 3.5 ? 'medium' : 'hard';
      
      const playerCountText = game.minPlayers === game.maxPlayers ? 
                             `${game.minPlayers} player` : 
                             `${game.minPlayers}-${game.maxPlayers} players`;
      
      game.searchableText = [
        game.name,
        game.mechanics.toLowerCase(),
        game.domains.toLowerCase(),
        `${game.yearPublished}`,
        playerCountText,
        `${game.playTime} minutes`,
        `complexity ${complexityLabel}`,
        `rating ${game.ratingAverage.toFixed(1)}`,
        `age ${game.minAge}+`
      ].join(' ');
      
      gamesCache.push(game);
      
      // Create embedding for this game
      const embedding = createSimpleEmbedding(game.searchableText);
      embeddingsCache.push({
        text: game.searchableText,
        embedding
      });
      
    } catch (error) {
      console.warn(`⚠️ Error processing line: ${line.substring(0, 100)}...`);
    }
  }
  
  console.log(`✅ Loaded and embedded ${gamesCache.length} board games`);
}

export async function searchGames(query: string, topK: number = 5): Promise<any[]> {
  console.log(`🔍 Searching for: "${query}" (top ${topK} results)`);
  
  // Ensure data is loaded
  await loadAndEmbedGames();
  
  if (!gamesCache || !embeddingsCache) {
    throw new Error('Failed to load games data');
  }
  
  // Create embedding for the query
  const queryEmbedding = createSimpleEmbedding(query.toLowerCase());
  
  // Calculate similarities
  const similarities = embeddingsCache.map((item, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, item.embedding)
  }));
  
  // Sort by similarity and get top results
  similarities.sort((a, b) => b.similarity - a.similarity);
  const topResults = similarities.slice(0, topK);
  
  console.log(`📊 Top ${topResults.length} matches found`);
  
  // Return the corresponding games with relevant columns only
  return topResults.map(result => {
    const game = gamesCache![result.index];
    return {
      name: game.name,
      yearPublished: game.yearPublished,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      playTime: game.playTime,
      complexityAverage: game.complexityAverage,
      ratingAverage: game.ratingAverage,
      mechanics: game.mechanics,
      domains: game.domains,
      bggRank: game.bggRank,
      similarity: result.similarity.toFixed(3)
    };
  });
}

export const boardgameTool = createTool({
  id: 'search-boardgames',
  description: 'Search for board games based on natural language queries',
  inputSchema: z.object({
    query: z.string().describe('Natural language query for board game search'),
    topK: z.number().optional().default(5).describe('Number of top results to return'),
  }),
  outputSchema: z.array(z.object({
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
  })),
  execute: async ({ context }) => {
    return await searchGames(context.query, context.topK);
  },
});
