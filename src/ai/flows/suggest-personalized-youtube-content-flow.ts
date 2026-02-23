'use server';
/**
 * @fileOverview A Genkit flow for generating personalized YouTube content suggestions.
 *
 * - suggestPersonalizedYouTubeContent - A function that handles the generation of YouTube content suggestions.
 * - SuggestPersonalizedYouTubeContentInput - The input type for the suggestPersonalizedYouTubeContent function.
 * - SuggestPersonalizedYouTubeContentOutput - The return type for the suggestPersonalizedYouTubeContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPersonalizedYouTubeContentInputSchema = z.object({
  favoriteChannels: z
    .array(z.string())
    .describe("A list of the user's favorite YouTube channel names or themes."),
});
export type SuggestPersonalizedYouTubeContentInput = z.infer<
  typeof SuggestPersonalizedYouTubeContentInputSchema
>;

const SuggestedContentSchema = z.object({
  title: z.string().describe('The title of the suggested video or channel.'),
  type: z.enum(['video', 'channel']).describe('The type of content suggested.'),
  reason: z.string().describe('A brief explanation of why this content is suggested.'),
  url: z.string().url().optional().describe('Optional URL to the suggested content.'),
});

const SuggestPersonalizedYouTubeContentOutputSchema = z.object({
  suggestions: z
    .array(SuggestedContentSchema)
    .describe('A list of personalized YouTube content suggestions.'),
  error: z.string().optional().describe('An optional error message if generation failed.'),
});
export type SuggestPersonalizedYouTubeContentOutput = z.infer<
  typeof SuggestPersonalizedYouTubeContentOutputSchema
>;

export async function suggestPersonalizedYouTubeContent(
  input: SuggestPersonalizedYouTubeContentInput
): Promise<SuggestPersonalizedYouTubeContentOutput> {
  try {
    return await suggestPersonalizedYouTubeContentFlow(input);
  } catch (error: any) {
    console.error("GenAI Flow Error:", error);
    // Return a graceful error response instead of throwing to the client
    if (error.message?.includes('429') || error.message?.includes('QUOTA_EXHAUSTED')) {
      return { 
        suggestions: [], 
        error: "QUOTA_EXHAUSTED" 
      };
    }
    return { 
      suggestions: [], 
      error: "INTERNAL_ERROR" 
    };
  }
}

const prompt = ai.definePrompt({
  name: 'suggestPersonalizedYouTubeContentPrompt',
  input: {schema: SuggestPersonalizedYouTubeContentInputSchema},
  output: {schema: SuggestPersonalizedYouTubeContentOutputSchema},
  prompt: `You are an expert YouTube content curator. Your task is to analyze the user's favorite YouTube channels and suggest new, relevant videos or channels.

Here are the user's favorite channels/themes:
{{#each favoriteChannels}}
- {{{this}}}
{{/each}}

Based on these, provide 3-5 personalized suggestions for new content (videos or channels) that the user might enjoy. For each suggestion, include the title, specify if it's a 'video' or 'channel', and briefly explain why it's a good fit. If possible, provide a URL for the suggestion.
`,
});

const suggestPersonalizedYouTubeContentFlow = ai.defineFlow(
  {
    name: 'suggestPersonalizedYouTubeContentFlow',
    inputSchema: SuggestPersonalizedYouTubeContentInputSchema,
    outputSchema: SuggestPersonalizedYouTubeContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
