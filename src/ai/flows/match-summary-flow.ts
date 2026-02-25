'use server';
/**
 * @fileOverview AI flow to generate a short, exciting summary for a specific football match.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MatchSummaryInputSchema = z.object({
  team1: z.string(),
  team2: z.string(),
  score: z.string(),
  competition: z.string(),
  status: z.string(),
});

const MatchSummaryOutputSchema = z.object({
  summary: z.string(),
});

export async function getMatchSummary(input: z.infer<typeof MatchSummaryInputSchema>) {
  const { output } = await ai.generate({
    prompt: `أنت محلل رياضي خبير في موقع "كووورة". قدم تعليقاً ذكياً وموجزاً جداً (سطر واحد فقط) باللغة العربية على هذه المباراة:
    المباراة: ${input.team1} ضد ${input.team2}
    البطولة: ${input.competition}
    النتيجة: ${input.score}
    الحالة: ${input.status}
    
    ركز على الإثارة أو النتيجة الحالية بأسلوب رياضي ممتع.`,
    output: { schema: MatchSummaryOutputSchema }
  });
  return output?.summary || "تحليل المباراة متاح قريباً...";
}
