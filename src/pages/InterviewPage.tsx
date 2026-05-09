import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useInterview, useSaveInterview } from "@/hooks/useInterview";
import { useApplicants } from "@/hooks/useApplicants";
import { COMPETENCIES, RATING_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Printer, Save } from "lucide-react";

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: applicants } = useApplicants();
  const applicant = applicants?.find((a) => a.id === id);
  const { data: existing, isLoading } = useInterview(id || "");
  const saveMut = useSaveInterview();

  const [scores, setScores] = useState<Record<string, number>>({
    c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0, c7: 0, c8: 0, c9: 0, c10: 0,
  });
  const [ratedBy, setRatedBy] = useState("");
  const [interviewDate, setInterviewDate] = useState("");

  useEffect(() => {
    if (existing) {
      setScores({
        c1: existing.c1, c2: existing.c2, c3: existing.c3, c4: existing.c4, c5: existing.c5,
        c6: existing.c6, c7: existing.c7, c8: existing.c8, c9: existing.c9, c10: existing.c10,
      });
      setRatedBy(existing.rated_by || "");
      setInterviewDate(existing.interview_date || "");
    }
  }, [existing]);

  const total = useMemo(() =>
    Object.values(scores).reduce((s, v) => s + v, 0),
    [scores]
  );

  const handleSave = () => {
    if (!id) return;
    saveMut.mutate({
      ...(existing?.id ? { id: existing.id } : {}),
      applicant_id: id,
      ...scores as { c1: number; c2: number; c3: number; c4: number; c5: number; c6: number; c7: number; c8: number; c9: number; c10: number },
      rated_by: ratedBy,
      interview_date: interviewDate || null,
    });
  };

  if (isLoading) return <AppLayout><p className="text-center py-8 text-muted-foreground">Loading...</p></AppLayout>;

  const groups = ["A. Core Competencies", "B. Leadership Competencies", "C. Technical Competencies"];

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
          <p className="text-xs text-muted-foreground">PSA A.S.C.E.N.D Form 4</p>
          <CardTitle className="text-lg">Competency Based Interview Form</CardTitle>
          {applicant && (
            <div className="text-sm text-muted-foreground">
              <p><strong>Applicant:</strong> {applicant.name}</p>
              <p><strong>Position Applied:</strong> {applicant.position_applied}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {groups.map((group) => (
            <section key={group}>
              <h3 className="font-semibold text-sm border-b pb-1 mb-3">{group} (4% each)</h3>
              <div className="space-y-4">
                {COMPETENCIES.filter((c) => c.group === group).map((comp) => (
                  <div key={comp.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-secondary/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{comp.label}</p>
                    </div>
                    <RadioGroup
                      value={String(scores[comp.key] || 0)}
                      onValueChange={(v) => setScores((p) => ({ ...p, [comp.key]: Number(v) }))}
                      className="flex gap-3"
                    >
                      {[1, 2, 3, 4].map((val) => (
                        <div key={val} className="flex items-center gap-1">
                          <RadioGroupItem value={String(val)} id={`${comp.key}-${val}`} />
                          <Label htmlFor={`${comp.key}-${val}`} className="text-xs cursor-pointer">
                            {val} - {RATING_LABELS[val]}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Total */}
          <div className="bg-secondary rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">TOTAL (Part II)</p>
            <p className="text-3xl font-bold text-primary">{total} <span className="text-base font-normal text-muted-foreground">/ 40</span></p>
          </div>

          {/* Interviewer info */}
          <section className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-1">
                <Label className="text-xs">Interviewed / Rated By</Label>
                <Input value={ratedBy} onChange={(e) => setRatedBy(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </AppLayout>
  );
}