"use client";

import { useEffect, useState } from "react";
import { getMatchSummary } from "@/ai/flows/match-summary-flow";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  matchData: {
    team1: string;
    team2: string;
    score: string;
    competition: string;
    status: string;
  };
}

export function AiMatchSummary({ matchData }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const result = await getMatchSummary(matchData);
        setSummary(result);
      } catch (error) {
        console.error("AI Summary Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [matchData.score, matchData.status]);

  return (
    <div className="flex items-start gap-2 bg-primary/5 p-2 rounded-xl border border-primary/10">
      <Sparkles className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0 animate-pulse" />
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-white/20" />
      ) : (
        <p className="text-[10px] text-white/80 font-bold leading-tight dir-rtl">
          {summary || "تحليل الذكاء الاصطناعي متاح حالياً..."}
        </p>
      )}
    </div>
  );
}
