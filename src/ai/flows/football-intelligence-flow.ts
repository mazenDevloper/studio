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
  2. Analyze the data and identify the most relevant channels for the MENA region (Saudi Arabia, Egypt, Gulf, etc.). 
     - Prefer SSC for Saudi League.
     - Prefer beIN Sports for European and International leagues.
  3. Identify or suggest the likely commentator based on typical assignments if not explicitly in the data.
  4. Format the output according to the schema. 
  5. Provide a short, energetic summary in Arabic of today's highlights.
  
  Focus on quality and relevance for an Arabic-speaking user driving a luxury car.`,
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
