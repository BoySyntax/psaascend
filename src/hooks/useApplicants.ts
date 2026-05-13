import { useEffect } from "react";
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
  has_interview?: boolean;         // current user submitted Form 4
  interview_count?: number;        // how many accounts submitted Form 4
  // Document URLs stored in Supabase Storage
  doc_application_letter?: string | null;
  doc_pds?: string | null;
  doc_wes?: string | null;
  doc_diploma?: string | null;
  doc_tor?: string | null;
};

const TOTAL_INTERVIEW_ACCOUNTS = 4; // total non-superadmin accounts
export { TOTAL_INTERVIEW_ACCOUNTS };

// ─── Upload helper ────────────────────────────────────────────────────────────
// Uploads a file to Supabase Storage bucket "applicant-docs" and returns the public URL.
export async function uploadApplicantDoc(
  applicantName: string,
  docType: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop();
  const safeName = applicantName.replace(/[^a-zA-Z0-9]/g, "_");
  const path = `${safeName}/${docType}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("applicant-docs")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("applicant-docs").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Queries & Mutations ──────────────────────────────────────────────────────

export function useApplicants() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Real-time subscriptions — auto-refresh when DB changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("realtime-applicants")
      .on("postgres_changes", { event: "*", schema: "public", table: "applicants" }, () => {
        qc.invalidateQueries({ queryKey: ["applicants"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "assessments" }, () => {
        qc.invalidateQueries({ queryKey: ["applicants"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "interviews" }, () => {
        qc.invalidateQueries({ queryKey: ["applicants"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return useQuery({
    queryKey: ["applicants", user?.id],
    queryFn: async () => {
      const { data: applicants, error } = await supabase
        .from("applicants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Check assessments across ALL users (superadmin fills Form 3 for everyone)
      const { data: assessments } = await supabase
        .from("assessments")
        .select("applicant_id");

      // Fetch ALL interviews across all users to count per applicant
      const { data: allInterviews } = await supabase
        .from("interviews")
        .select("applicant_id, user_id");

      // Check if current user has submitted Form 4
      const { data: myInterviews } = await supabase
        .from("interviews")
        .select("applicant_id")
        .eq("user_id", user?.id);

      const assessmentSet = new Set(assessments?.map((a) => a.applicant_id));
      const myInterviewSet = new Set(myInterviews?.map((i) => i.applicant_id));

      // Count distinct users who submitted Form 4 per applicant
      const interviewCountMap = new Map<string, number>();
      for (const interview of allInterviews || []) {
        const prev = interviewCountMap.get(interview.applicant_id) || 0;
        interviewCountMap.set(interview.applicant_id, prev + 1);
      }

      return (applicants || []).map((a) => ({
        ...a,
        has_assessment: assessmentSet.has(a.id),
        has_interview: myInterviewSet.has(a.id),
        interview_count: interviewCountMap.get(a.id) || 0,
      })) as Applicant[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Applicant, "id" | "created_at" | "has_assessment" | "has_interview" | "interview_count">) => {
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
    mutationFn: async ({ id, has_assessment, has_interview, interview_count, ...data }: Partial<Applicant> & { id: string }) => {
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
