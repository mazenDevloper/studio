
'use server';
/**
 * @fileOverview A Genkit flow for intelligent football match data processing.
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
  channel: z.string(),
  commentator: z.string(),
});

const FootballIntelligenceOutputSchema = z.object({
  matches: z.array(MatchOutputSchema),
  summary: z.string().optional(),
  error: z.string().optional(),
});
export type FootballIntelligenceOutput = z.infer<typeof FootballIntelligenceOutputSchema>;

const fetchMatchesTool = ai.defineTool(
  {
    name: 'fetchMatchesTool',
    description: 'Fetches real football match data from API-Sports.',
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
    console.error("AI Flow Execution Error:", error);
    return { matches: [], error: "NETWORK_ERROR_OR_TIMEOUT" };
  }
}

const prompt = ai.definePrompt({
  name: 'footballIntelligencePrompt',
  input: { schema: FootballIntelligenceInputSchema },
  output: { schema: FootballIntelligenceOutputSchema },
  tools: [fetchMatchesTool],
  prompt: `You are an expert Arabic football broadcaster. 
  
  1. Use fetchMatchesTool for {{type}}.
  2. If the tool returns data, format the most important matches (Top European & Arab leagues).
  3. Assign likely MENA channels (SSC for Saudi, beIN for Euro) and famous commentators (Chawali, Otaibi, etc.) if they are missing.
  4. Write a 2-sentence energetic summary in Arabic about today's matches.
  5. If no matches are found, return matches as empty array and explain in summary that there are no major matches today.`,
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
