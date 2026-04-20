import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trpcClient } from "@/lib/trpc/client";
import type { CookingSkillLevel } from "@/lib/household/types";

export type HouseholdMember = {
  id: string;
  name: string;
  allergies: string[];
  avoidances: string[];
  dietType: string;
};

export type Household = {
  id: string;
  name: string;
  cookingSkillLevel: CookingSkillLevel;
  appliances: string[];
  members: HouseholdMember[];
};

export type HouseholdUpsertInput = {
  name: string;
  cookingSkillLevel: CookingSkillLevel;
  appliances: string[];
  members: Array<{
    id?: string;
    name: string;
    allergies: string[];
    avoidances: string[];
    dietType?: string;
  }>;
};

export function useHousehold() {
  const queryClient = useQueryClient();

  const householdQuery = useQuery<Household | null>({
    queryKey: ["household"],
    queryFn: () => trpcClient.query("household.get") as Promise<Household | null>,
    staleTime: 60_000,
  });

  const upsert = useMutation<{ id: string }, Error, HouseholdUpsertInput>({
    mutationFn: (input) => trpcClient.mutation("household.upsert", input) as Promise<{ id: string }>,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });

  return {
    household: householdQuery.data ?? null,
    isLoading: householdQuery.isLoading,
    error: householdQuery.error instanceof Error ? householdQuery.error : null,
    upsert,
  };
}
