import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type Applicant = {
  id: string;
  name: string;
  previous_position: string | null;
  position_applied: string;
  salary_grade: string | null;
  eligibility: string | null;
  office: string | null;
  contact: string | null;
  email: string | null;
vacant_positions?: string;
  created_at: string;
  has_assessment?: boolean;
  has_interview?: boolean;
};

export function useApplicants() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["applicants", user?.id],
    queryFn: async () => {
      const { data: applicants, error } = await supabase
        .from("applicants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Filter assessments and interviews by current user
      const { data: assessments } = await supabase
        .from("assessments")
        .select("applicant_id")
        .eq("user_id", user?.id);
      const { data: interviews } = await supabase
        .from("interviews")
        .select("applicant_id")
        .eq("user_id", user?.id);

      const assessmentSet = new Set(assessments?.map((a) => a.applicant_id));
      const interviewSet = new Set(interviews?.map((i) => i.applicant_id));

      return (applicants || []).map((a) => ({
        ...a,
        has_assessment: assessmentSet.has(a.id),
        has_interview: interviewSet.has(a.id),
      })) as Applicant[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Applicant, "id" | "created_at" | "has_assessment" | "has_interview">) => {
      const { error } = await supabase.from("applicants").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Applicant added");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, has_assessment, has_interview, ...data }: Partial<Applicant> & { id: string }) => {
      const { error } = await supabase.from("applicants").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Applicant updated");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applicants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applicants"] });
      toast.success("Applicant deleted");
    },
    onError: (e) => toast.error(e.message),
  });
}