import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAssessment, useSaveAssessment } from "@/hooks/useAssessment";
import { useApplicants } from "@/hooks/useApplicants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer, Save } from "lucide-react";

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const { data: applicants } = useApplicants();
  const applicant = applicants?.find((a) => a.id === id);
  const { data: existing, isLoading } = useAssessment(id || "");
  const saveMut = useSaveAssessment();

  const [form, setForm] = useState({
    education_degree: "", education_course: "", education_pts: 0,
    training_name: "", training_hours: 0, training_pts: 0,
    experience_name: "", experience_duration: "", experience_years: 0, experience_pts: 0,
    eligibility_pts: 0,
    evaluated_by: "", reviewed_by: "", attested_by: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        education_degree: existing.education_degree || "",
        education_course: existing.education_course || "",
        education_pts: Number(existing.education_pts) || 0,
        training_name: existing.training_name || "",
        training_hours: Number(existing.training_hours) || 0,
        training_pts: Number(existing.training_pts) || 0,
        experience_name: existing.experience_name || "",
        experience_duration: existing.experience_duration || "",
        experience_years: Number(existing.experience_years) || 0,
        experience_pts: Number(existing.experience_pts) || 0,
        eligibility_pts: Number(existing.eligibility_pts) || 0,
        evaluated_by: existing.evaluated_by || "",
        reviewed_by: existing.reviewed_by || "",
        attested_by: existing.attested_by || "",
      });
    }
  }, [existing]);

  const total = useMemo(() =>
    Math.min(form.education_pts, 20) + Math.min(form.training_pts, 15) +
    Math.min(form.experience_pts, 15) + Math.min(form.eligibility_pts, 10),
    [form.education_pts, form.training_pts, form.experience_pts, form.eligibility_pts]
  );

  const setNum = (key: string, value: string, max: number) => {
    const num = Math.min(Math.max(0, Number(value) || 0), max);
    setForm((p) => ({ ...p, [key]: num }));
  };

  const handleSave = () => {
    if (!id) return;
    saveMut.mutate({
      ...(existing?.id ? { id: existing.id } : {}),
      applicant_id: id,
      ...form,
    });
  };

  if (isLoading) return <AppLayout><p className="text-center py-8 text-muted-foreground">Loading...</p></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-4 flex items-center gap-4 no-print">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/applicants"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saveMut.isPending}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>

      <Card className="print-full-width">
        <CardHeader className="text-center border-b">
          <p className="text-xs text-muted-foreground">PSA A.S.C.E.N.D Form 3</p>
          <CardTitle className="text-lg">Individual Assessment Form</CardTitle>
          {applicant && (
            <div className="text-sm text-muted-foreground">
              <p><strong>Applicant:</strong> {applicant.name}</p>
              <p><strong>Position Applied:</strong> {applicant.position_applied} | <strong>SG:</strong> {applicant.salary_grade || "—"}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* I. Education */}
          <section>
            <h3 className="font-semibold text-sm border-b pb-1 mb-3">I. Education (Max 20 pts)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-1">
                <Label className="text-xs">Highest Degree</Label>
                <Input value={form.education_degree} onChange={(e) => setForm((p) => ({ ...p, education_degree: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Course Name</Label>
                <Input value={form.education_course} onChange={(e) => setForm((p) => ({ ...p, education_course: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Points Obtained (max 20)</Label>
                <Input type="number" min={0} max={20} value={form.education_pts} onChange={(e) => setNum("education_pts", e.target.value, 20)} />
              </div>
            </div>
          </section>

          {/* II. Relevant Training */}
          <section>
            <h3 className="font-semibold text-sm border-b pb-1 mb-3">II. Relevant Training (Max 15 pts)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-1">
                <Label className="text-xs">Seminar/Training Name</Label>
                <Input value={form.training_name} onChange={(e) => setForm((p) => ({ ...p, training_name: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Total Hours</Label>
                <Input type="number" min={0} value={form.training_hours} onChange={(e) => setForm((p) => ({ ...p, training_hours: Number(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Points Obtained (max 15)</Label>
                <Input type="number" min={0} max={15} value={form.training_pts} onChange={(e) => setNum("training_pts", e.target.value, 15)} />
              </div>
            </div>
          </section>

          {/* III. Relevant Work Experience */}
          <section>
            <h3 className="font-semibold text-sm border-b pb-1 mb-3">III. Relevant Work Experience (Max 15 pts)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="grid gap-1">
                <Label className="text-xs">Position</Label>
                <Input value={form.experience_name} onChange={(e) => setForm((p) => ({ ...p, experience_name: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Duration</Label>
                <Input value={form.experience_duration} onChange={(e) => setForm((p) => ({ ...p, experience_duration: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Total Years</Label>
                <Input type="number" min={0} value={form.experience_years} onChange={(e) => setForm((p) => ({ ...p, experience_years: Number(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Points Obtained (max 15)</Label>
                <Input type="number" min={0} max={15} value={form.experience_pts} onChange={(e) => setNum("experience_pts", e.target.value, 15)} />
              </div>
            </div>
          </section>

          {/* IV. Eligibility */}
          <section>
            <h3 className="font-semibold text-sm border-b pb-1 mb-3">IV. Eligibility (Max 10 pts)</h3>
            <div className="grid gap-1 max-w-xs">
              <Label className="text-xs">Points Obtained (max 10)</Label>
              <Input type="number" min={0} max={10} value={form.eligibility_pts} onChange={(e) => setNum("eligibility_pts", e.target.value, 10)} />
            </div>
          </section>

          {/* Total */}
          <div className="bg-secondary rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">TOTAL (Part I)</p>
            <p className="text-3xl font-bold text-primary">{total} <span className="text-base font-normal text-muted-foreground">/ 60</span></p>
          </div>

          {/* Signatures */}
          <section className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-3">Signatures</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-1">
                <Label className="text-xs">Evaluated By</Label>
                <Input value={form.evaluated_by} onChange={(e) => setForm((p) => ({ ...p, evaluated_by: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Reviewed By</Label>
                <Input value={form.reviewed_by} onChange={(e) => setForm((p) => ({ ...p, reviewed_by: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Attested By</Label>
                <Input value={form.attested_by} onChange={(e) => setForm((p) => ({ ...p, attested_by: e.target.value }))} />
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </AppLayout>
  );
}