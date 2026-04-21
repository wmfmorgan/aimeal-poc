import { useCallback, useState } from "react";

import { buildSlotKey, parseMealLine } from "@/lib/generation/stream-parser";
import { supabase } from "@/lib/supabase/client";
import { type MealSlot, type StreamState } from "@/lib/generation/types";

type StartGenerationParams = {
  householdId: string;
  mealPlanId: string;
  numDays: number;
  mealTypes: string[];
};

export function useGenerationStream() {
  const [slots, setSlots] = useState<Record<string, MealSlot>>({});
  const [state, setState] = useState<StreamState>("idle");
  const [error, setError] = useState<string | null>(null);

  const startGeneration = useCallback(async (params: StartGenerationParams) => {
    setState("streaming");
    setSlots({});
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    let response: Response;
    try {
      response = await fetch("/functions/v1/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(params),
      });
    } catch (requestError) {
      setState("error");
      setError(requestError instanceof Error ? requestError.message : "Network error.");
      return;
    }

    if (!response.ok || !response.body) {
      setState("error");
      setError("Generation failed to start.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            setState("complete");
            return;
          }

          const meal = parseMealLine(payload);
          if (meal) {
            const key = buildSlotKey(meal.day_of_week, meal.meal_type);
            setSlots((current) => ({ ...current, [key]: meal }));
          }
        }
      }

      setState("complete");
    } catch (streamError) {
      setState("error");
      setError(streamError instanceof Error ? streamError.message : "Stream error.");
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setSlots({});
    setError(null);
  }, []);

  return { slots, state, error, startGeneration, reset };
}
