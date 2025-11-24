import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface BGGSearchResult {
  id: string;
  name: string;
  yearpublished?: string;
}

interface BGGGameDetails {
  name: string;
  yearPublished?: number;
  minPlayers?: number;
  maxPlayers?: number;
  playTime?: number;
  minAge?: number;
  usersRated?: number;
  ratingAverage?: number;
  bggRank?: number;
  complexityAverage?: number;
  ownedUsers?: number;
  mechanics?: string;
  domains?: string;
  imageUrl?: string;
}

export const boardgameSearchTool = createTool({
  id: 'boardgame-search',
  description: 'Searches for board games on BoardGameGeek and Baziplanet based on a query. Returns detailed information about matching games.',
  inputSchema: z.object({
    query: z.string().describe('Search query or question about board games'),
  }),
  outputSchema: z.object({
    games: z.array(
      z.object({
        englishName: z.string(),
        persianName: z.string().optional(),
        yearPublished: z.number().optional(),
        minPlayers: z.number().optional(),
        maxPlayers: z.number().optional(),
        playTime: z.number().optional(),
        minAge: z.number().optional(),
        usersRated: z.number().optional(),
        ratingAverage: z.number().optional(),
        bggRank: z.number().optional(),
        complexityAverage: z.number().optional(),
        ownedUsers: z.number().optional(),
        mechanics: z.string().optional(),
        domains: z.string().optional(),
        imagesUrls: z.string().optional(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const games: any[] = [];

    try {
      // Search BoardGameGeek
      const bggResults = await searchBoardGameGeek(context.query);
      
      // Get detailed info for each result
      for (const result of bggResults.slice(0, 10)) {
        const details = await getBGGGameDetails(result.id);
        if (details) {
          games.push({
            englishName: details.name,
            yearPublished: details.yearPublished,
            minPlayers: details.minPlayers,
            maxPlayers: details.maxPlayers,
            playTime: details.playTime,
            minAge: details.minAge,
            usersRated: details.usersRated,
            ratingAverage: details.ratingAverage,
            bggRank: details.bggRank,
            complexityAverage: details.complexityAverage,
            ownedUsers: details.ownedUsers,
            mechanics: details.mechanics,
            domains: details.domains,
            imagesUrls: details.imageUrl,
          });
        }
      }
    } catch (error) {
      console.error('Error searching BoardGameGeek:', error);
    }

    return { games };
  },
});

async function searchBoardGameGeek(query: string): Promise<BGGSearchResult[]> {
  try {
    const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`;
    const response = await fetch(searchUrl);
    const xmlText = await response.text();

    // Parse XML response
    const results: BGGSearchResult[] = [];
    const itemMatches = xmlText.matchAll(/<item[^>]*id="(\d+)"[^>]*>(.*?)<\/item>/gs);

    for (const match of itemMatches) {
      const id = match[1];
      const itemContent = match[2];
      
      const nameMatch = itemContent.match(/<name[^>]*value="([^"]+)"/);
      const yearMatch = itemContent.match(/<yearpublished[^>]*value="([^"]+)"/);
      
      if (nameMatch) {
        results.push({
          id,
          name: nameMatch[1],
          yearpublished: yearMatch?.[1],
        });
      }
    }

    return results;
  } catch (error) {
    console.error('BGG search error:', error);
    return [];
  }
}

async function getBGGGameDetails(gameId: string): Promise<BGGGameDetails | null> {
  try {
    const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
    const response = await fetch(detailsUrl);
    const xmlText = await response.text();

    // Parse game details from XML
    const details: BGGGameDetails = {
      name: '',
    };

    // Extract name
    const nameMatch = xmlText.match(/<name[^>]*type="primary"[^>]*value="([^"]+)"/);
    if (nameMatch) {
      details.name = nameMatch[1];
    }

    // Extract year published
    const yearMatch = xmlText.match(/<yearpublished[^>]*value="(\d+)"/);
    if (yearMatch) {
      details.yearPublished = parseInt(yearMatch[1]);
    }

    // Extract player counts
    const minPlayersMatch = xmlText.match(/<minplayers[^>]*value="(\d+)"/);
    const maxPlayersMatch = xmlText.match(/<maxplayers[^>]*value="(\d+)"/);
    if (minPlayersMatch) details.minPlayers = parseInt(minPlayersMatch[1]);
    if (maxPlayersMatch) details.maxPlayers = parseInt(maxPlayersMatch[1]);

    // Extract play time
    const playTimeMatch = xmlText.match(/<playingtime[^>]*value="(\d+)"/);
    if (playTimeMatch) details.playTime = parseInt(playTimeMatch[1]);

    // Extract min age
    const minAgeMatch = xmlText.match(/<minage[^>]*value="(\d+)"/);
    if (minAgeMatch) details.minAge = parseInt(minAgeMatch[1]);

    // Extract ratings
    const usersRatedMatch = xmlText.match(/<usersrated[^>]*value="([^"]+)"/);
    const averageMatch = xmlText.match(/<average[^>]*value="([^"]+)"/);
    const rankMatch = xmlText.match(/<rank[^>]*type="subtype"[^>]*value="(\d+)"/);
    const complexityMatch = xmlText.match(/<averageweight[^>]*value="([^"]+)"/);
    const ownedMatch = xmlText.match(/<owned[^>]*value="(\d+)"/);

    if (usersRatedMatch) details.usersRated = parseInt(usersRatedMatch[1]);
    if (averageMatch) details.ratingAverage = parseFloat(averageMatch[1]);
    if (rankMatch) details.bggRank = parseInt(rankMatch[1]);
    if (complexityMatch) details.complexityAverage = parseFloat(complexityMatch[1]);
    if (ownedMatch) details.ownedUsers = parseInt(ownedMatch[1]);

    // Extract mechanics
    const mechanicsMatches = xmlText.matchAll(/<link[^>]*type="boardgamemechanic"[^>]*value="([^"]+)"/g);
    const mechanics: string[] = [];
    for (const match of mechanicsMatches) {
      mechanics.push(match[1]);
    }
    if (mechanics.length > 0) {
      details.mechanics = mechanics.join(', ');
    }

    // Extract domains/categories
    const domainMatches = xmlText.matchAll(/<link[^>]*type="boardgamecategory"[^>]*value="([^"]+)"/g);
    const domains: string[] = [];
    for (const match of domainMatches) {
      domains.push(match[1]);
    }
    if (domains.length > 0) {
      details.domains = domains.join(', ');
    }

    // Extract image URL
    const imageMatch = xmlText.match(/<image>([^<]+)<\/image>/);
    if (imageMatch) {
      details.imageUrl = imageMatch[1];
    }

    return details;
  } catch (error) {
    console.error('BGG details error:', error);
    return null;
  }
}

