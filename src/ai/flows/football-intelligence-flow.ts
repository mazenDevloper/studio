
'use server';
/**
 * @fileOverview A Genkit flow for intelligent football match data processing.
 * 
 * - getFootballIntelligence - Main function to fetch and process match data using AI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchFootballData } from '@/lib/football-api';
import { Match } from '@/lib/football-data';

const FootballIntelligenceInputSchema = z.object({
  type: z.enum(['today', 'live']).describe('The type of matches to fetch.'),
});
export type FootballIntelligenceInput = z.infer<typeof FootballIntelligenceInputSchema>;

const MatchOutputSchema = z.object({
  id: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeLogo: z.string(),
  awayLogo: z.string(),
  startTime: z.string(),
  status: z.enum(['upcoming', 'live', 'finished']),
  score: z.object({
    home: z.number(),
    away: z.number()
  }).optional(),
  minute: z.number().optional(),
  league: z.string(),
  channel: z.string().describe('The most relevant Arab world channel (beIN, SSC, etc.)'),
  commentator: z.string().describe('The name of the commentator if available.'),
});

const FootballIntelligenceOutputSchema = z.object({
  matches: z.array(MatchOutputSchema),
  summary: z.string().optional().describe('A brief AI summary of the match day.'),
  error: z.string().optional(),
});
export type FootballIntelligenceOutput = z.infer<typeof FootballIntelligenceOutputSchema>;

// Define the tool for fetching raw data
const fetchMatchesTool = ai.defineTool(
  {
    name: 'fetchMatchesTool',
    description: 'Fetches raw football match data from the API-Sports service.',
    inputSchema: z.object({ type: z.enum(['today', 'live']) }),
    outputSchema: z.any(),
  },
  async (input) => {
    return await fetchFootballData(input.type);
  }
);

export async function getFootballIntelligence(
  input: FootballIntelligenceInput
): Promise<FootballIntelligenceOutput> {
  try {
    return await footballIntelligenceFlow(input);
  } catch (error: any) {
    console.error("Football AI Flow Error:", error);
    return { matches: [], error: "FAILED_TO_FETCH_INTELLIGENCE" };
  }
}

const prompt = ai.definePrompt({
  name: 'footballIntelligencePrompt',
  input: { schema: FootballIntelligenceInputSchema },
  output: { schema: FootballIntelligenceOutputSchema },
  tools: [fetchMatchesTool],
  prompt: `You are a professional Arab world football commentator and curator. 
  
  Your task is to:
  1. Call the fetchMatchesTool to get the raw match data for {{type}}.
  2. If no matches are found in the tool output, return an empty array for matches and a message explaining why (e.g., no major matches today).
  3. Analyze the raw data and identify the most relevant channels for the MENA region (Saudi Arabia, Egypt, Gulf, etc.). 
     - Use SSC for Saudi League matches.
     - Use beIN Sports for European leagues (Champions League, Premier League, La Liga, etc.).
     - Use Abu Dhabi Sports or Dubai Sports for local UAE matches.
  4. Suggest a famous Arabic commentator (e.g., Issam Chawali, Khalil Al-Balushi, Fahad Al-Otaibi) for the big matches if the data doesn't specify one.
  5. Format the output according to the schema. 
  6. Provide a short, energetic summary in Arabic (2-3 sentences) of today's highlights. Use phrases like "يا رباااه" or "مساء الكورة".
  
  IMPORTANT: Only return matches that are of reasonable importance (Top leagues, Arab leagues). If there are too many, prioritize Arab teams and European giants.`,
});

const footballIntelligenceFlow = ai.defineFlow(
  {
    name: 'footballIntelligenceFlow',
    inputSchema: FootballIntelligenceInputSchema,
    outputSchema: FootballIntelligenceOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
