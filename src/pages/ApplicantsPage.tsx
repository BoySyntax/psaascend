import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useApplicants, useCreateApplicant, useUpdateApplicant, useDeleteApplicant, type Applicant } from "@/hooks/useApplicants";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, FileText, ClipboardList, Users, CheckCircle, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type FormData = Omit<Applicant, "id" | "created_at" | "has_assessment" | "has_interview">;

const emptyForm: FormData = {
  name: "", previous_position: "", position_applied: "", salary_grade: "",
  eligibility: "", office: "", contact: "", email: "", vacant_positions: "",
};

function ApplicantForm({ initial, onSubmit, onClose, existingApplicants, isEditing }: {
  initial: FormData;
  onSubmit: (d: FormData) => void;
  onClose: () => void;
  existingApplicants: Applicant[];
  isEditing: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const set = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const existingPositions = Array.from(
    new Set(existingApplicants.map((a) => a.position_applied).filter(Boolean))
  );

  const handlePositionChange = (value: string) => {
    set("position_applied", value);
    const match = existingApplicants.find(
      (a) => a.position_applied?.toLowerCase() === value.toLowerCase()
    );
    if (match) {
      setForm((prev) => ({
        ...prev,
        position_applied: value,
        salary_grade: match.salary_grade || prev.salary_grade,
        office: match.office || prev.office,
        vacant_positions: match.vacant_positions || prev.vacant_positions,
        eligibility: match.eligibility || prev.eligibility,
      }));
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Full Name (Last, First Middle) *</Label>
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Dela Cruz, Juan Santos"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Position Applied For *</Label>
          <Input
            list="position-suggestions"
            value={form.position_applied}
            onChange={(e) => handlePositionChange(e.target.value)}
            placeholder="Type or select a position"
          />
          <datalist id="position-suggestions">
            {existingPositions.map((pos) => (
              <option key={pos} value={pos!} />
            ))}
          </datalist>
          {!isEditing && form.position_applied &&
            existingApplicants.some(
              (a) => a.position_applied?.toLowerCase() === form.position_applied.toLowerCase()
            ) && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                ✓ Auto-filled from existing position data
              </p>
            )}
        </div>
        <div className="grid gap-2">
          <Label>Previous Position</Label>
          <Input
            value={form.previous_position || ""}
            onChange={(e) => set("previous_position", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Salary Grade</Label>
          <Input value={form.salary_grade || ""} onChange={(e) => set("salary_grade", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Eligibility</Label>
          <Input value={form.eligibility || ""} onChange={(e) => set("eligibility", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>No. of Vacant Positions</Label>
        <Input
          type="number"
          min={0}
          value={form.vacant_positions || ""}
          onChange={(e) => set("vacant_positions", e.target.value)}
          placeholder="e.g. 3"
        />
      </div>
      <div className="grid gap-2">
        <Label>Office / Current Station</Label>
        <Input value={form.office || ""} onChange={(e) => set("office", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Contact Number</Label>
          <Input value={form.contact || ""} onChange={(e) => set("contact", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Email Address</Label>
          <Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={!form.name || !form.position_applied}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export default function ApplicantsPage() {
  const { data: applicants, isLoading } = useApplicants();
  const { isSuperAdmin } = useAuth();
  const createMut = useCreateApplicant();
  const updateMut = useUpdateApplicant();
  const deleteMut = useDeleteApplicant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Applicant | null>(null);

  const totalApplicants = applicants?.length || 0;
  const totalAssessed = applicants?.filter((a) => a.has_assessment).length || 0;
  const totalInterviewed = applicants?.filter((a) => a.has_interview).length || 0;

  const handleCreate = (data: FormData) => {
    createMut.mutate(data, { onSuccess: () => setDialogOpen(false) });
  };

  const handleUpdate = (data: FormData) => {
    if (!editing) return;
    updateMut.mutate(
      { id: editing.id, ...data },
      { onSuccess: () => { setEditing(null); setDialogOpen(false); } }
    );
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Applicants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalApplicants}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assessments Done</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAssessed} <span className="text-sm font-normal text-muted-foreground">/ {totalApplicants}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interviews Done</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalInterviewed} <span className="text-sm font-normal text-muted-foreground">/ {totalApplicants}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Applicants</CardTitle>

          {/* Only superadmin can add applicants */}
          {isSuperAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Applicant</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Applicant" : "Add Applicant"}</DialogTitle>
                </DialogHeader>
                <ApplicantForm
                  initial={editing ? {
                    name: editing.name,
                    previous_position: editing.previous_position,
                    position_applied: editing.position_applied,
                    salary_grade: editing.salary_grade,
                    eligibility: editing.eligibility,
                    office: editing.office,
                    contact: editing.contact,
                    email: editing.email,
                    vacant_positions: editing.vacant_positions || "",
                  } : emptyForm}
                  onSubmit={editing ? handleUpdate : handleCreate}
                  onClose={() => { setDialogOpen(false); setEditing(null); }}
                  existingApplicants={applicants || []}
                  isEditing={!!editing}
                />
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : !applicants?.length ? (
            <p className="text-muted-foreground text-center py-8">No applicants yet. Add one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position Applied</TableHead>
                    <TableHead>SG</TableHead>
                    <TableHead>Vacant Positions</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicants.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.position_applied}</TableCell>
                      <TableCell>{a.salary_grade || "—"}</TableCell>
                      <TableCell>{a.vacant_positions || "—"}</TableCell>
                      <TableCell>{a.office || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={a.has_assessment ? "default" : "secondary"} className="text-xs">
                            {a.has_assessment ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                            Form 3
                          </Badge>
                          <Badge variant={a.has_interview ? "default" : "secondary"} className="text-xs">
                            {a.has_interview ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                            Form 4
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">

                          {/* ✅ Form 3 visible to ALL accounts, read-only enforced inside AssessmentPage */}
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/assessment/${a.id}`} title="Form 3">
                              <FileText className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* Form 4 for everyone */}
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/interview/${a.id}`} title="Form 4">
                              <ClipboardList className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* Edit and Delete only for superadmin */}
                          {isSuperAdmin && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete applicant?</AlertDialogTitle>
                                    <AlertDialogDescription>This will also delete their assessment and interview data.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMut.mutate(a.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}

                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}