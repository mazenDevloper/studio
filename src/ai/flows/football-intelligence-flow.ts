
'use server';
/**
 * @fileOverview ذكاء اصطناعي رياضي متخصص في جلب وتنسيق المباريات والقنوات والمعلقين.
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
  channel: z.string().describe('القناة الناقلة في الوطن العربي (SSC, beIN)'),
  commentator: z.string().describe('اسم المعلق الشهير المتوقع أو الفعلي'),
});

const FootballIntelligenceInputSchema = z.object({
  type: z.enum(['today', 'live']).describe('نوع المباريات المطلوب جلبها.'),
});
export type FootballIntelligenceInput = z.infer<typeof FootballIntelligenceInputSchema>;

const FootballIntelligenceOutputSchema = z.object({
  matches: z.array(MatchOutputSchema),
  summary: z.string().optional().describe('ملخص سريع ومحمس للمباريات باللغة العربية.'),
  error: z.string().optional(),
});
export type FootballIntelligenceOutput = z.infer<typeof FootballIntelligenceOutputSchema>;

const fetchMatchesTool = ai.defineTool(
  {
    name: 'fetchMatchesTool',
    description: 'يجلب بيانات مباريات كرة القدم الحقيقية من API-Sports.',
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
  prompt: `أنت خبير ومحلل رياضي في موقع "كووورة". مهمتك هي جلب مباريات {{type}} وتنسيقها للمشجع العربي.

1. استخدم fetchMatchesTool لجلب البيانات الحقيقية.
2. قم بتحليل النتائج:
   - للمباريات السعودية (دوري روشن، الكأس): اجعل القناة "SSC HD" والمعلقين المتوقعين (فهد العتيبي، مشاري القرني، عيسى الحربين).
   - للمباريات الأوروبية (أبطال أوروبا، الدوري الإنجليزي، الإسباني): اجعل القناة "beIN Sports HD" والمعلقين المتوقعين (عصام الشوالي، حفيظ دراجي، خليل البلوشي).
   - للمباريات العربية الأخرى: حدد القناة المناسبة (أبوظبي الرياضية، الكأس القطري).
3. إذا كانت القنوات موجودة في بيانات الأداة (broadcasts)، استخدمها كأولوية.
4. اكتب ملخصاً حماسياً باللغة العربية (جملتين) عن أهمية مباريات اليوم.
5. رتب المباريات بحيث تظهر الدوريات الكبرى (السعودي، الإسباني، الإنجليزي، الأبطال) في المقدمة.
6. إذا لم تكن هناك مباريات هامة، وضح ذلك في الملخص وأرجع مصفوفة فارغة.`,
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
