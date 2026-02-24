
'use server';
/**
 * @fileOverview ذكاء اصطناعي رياضي متطور يعمل كمحرك لبيانات Kooora.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchFootballData } from '@/lib/football-api';

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
  leagueLogo: z.string().optional(),
  channel: z.string().describe('القناة الناقلة المتوقعة في الوطن العربي (SSC, beIN)'),
  commentator: z.string().describe('اسم المعلق المتوقع بناءً على أهمية المباراة'),
});

const FootballIntelligenceInputSchema = z.object({
  type: z.enum(['today', 'live']).describe('نوع البيانات المطلوب معالجتها.'),
});
export type FootballIntelligenceInput = z.infer<typeof FootballIntelligenceInputSchema>;

const FootballIntelligenceOutputSchema = z.object({
  matches: z.array(MatchOutputSchema),
  summary: z.string().optional().describe('ملخص تحليلي للمباريات بأسلوب Kooora.'),
  error: z.string().optional(),
});
export type FootballIntelligenceOutput = z.infer<typeof FootballIntelligenceOutputSchema>;

const fetchMatchesTool = ai.defineTool(
  {
    name: 'fetchMatchesTool',
    description: 'يجلب بيانات مباريات كرة القدم الحقيقية من API-Sports لليوم.',
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
    return { matches: [], error: "CONNECTION_TIMEOUT" };
  }
}

const prompt = ai.definePrompt({
  name: 'footballIntelligencePrompt',
  input: { schema: FootballIntelligenceInputSchema },
  output: { schema: FootballIntelligenceOutputSchema },
  tools: [fetchMatchesTool],
  prompt: `أنت وكيل ذكاء اصطناعي رياضي متخصص يعمل كمحرك بيانات لموقع "كووورة". مهمتك هي تحليل مباريات {{type}} وتقديمها للمشجع العربي بأدق التفاصيل.

1. استدعِ fetchMatchesTool لجلب البيانات الحقيقية لليوم.
2. قم بتحليل النتائج وتنسيقها:
   - للمباريات السعودية: حدد القناة "SSC HD" والمعلقين (فهد العتيبي، عيسى الحربين، فارس عوض).
   - للمباريات الأوروبية الكبرى: حدد القناة "beIN Sports HD" والمعلقين (عصام الشوالي، خليل البلوشي، حفيظ دراجي).
   - رتب المباريات حسب الأهمية الجماهيرية.
3. اكتب ملخصاً مشوقاً باللغة العربية في حقل summary يلخص أهم مواجهات الليلة وتوقعاتك لها.
4. إذا كانت القنوات موجودة في بيانات الأداة (broadcasts)، استخدمها كأولوية، وإلا توقع الأنسب بناءً على شهرة الدوري.
5. تأكد من إرجاع مصفوفة المباريات كاملة مع تحديث حقول channel و commentator لكل مباراة.`,
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
