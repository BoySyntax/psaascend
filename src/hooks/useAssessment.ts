import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type Assessment = {
  id: string;
  applicant_id: string;
  education_pts: number;
  education_degree: string | null;
  education_course: string | null;
  training_pts: number;
  training_name: string | null;
  training_hours: number;
  experience_pts: number;
  experience_name: string | null;
  experience_duration: string | null;
  experience_years: number;
  eligibility_pts: number;
  evaluated_by: string | null;
  reviewed_by: string | null;
  attested_by: string | null;
  user_id: string | null;
};

export function useAssessment(applicantId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["assessment", applicantId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("applicant_id", applicantId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!applicantId && !!user?.id,
  });
}

export function useSaveAssessment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: Omit<Assessment, "id"> & { id?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const dataWithUser = { ...data, user_id: user.id };
      // Remove id from upsert payload to avoid conflicts
      const { id, ...upsertData } = dataWithUser as typeof dataWithUser & { id?: string };
      const { error } = await supabase
        .from("assessments")
        .upsert(upsertData, { onConflict: "applicant_id,user_id" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["assessment", vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ["applicants"] });
      qc.invalidateQueries({ queryKey: ["rankings"] });
      toast.success("Assessment saved");
    },
    onError: (e) => toast.error(e.message),
  });
}