import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import {
  useApplicants, useCreateApplicant, useUpdateApplicant, useDeleteApplicant,
  uploadApplicantDoc, TOTAL_INTERVIEW_ACCOUNTS, type Applicant
} from "@/hooks/useApplicants";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, FileText, ClipboardList, Users, CheckCircle, Clock, Upload, FolderOpen, ExternalLink, Loader2, ChevronLeft, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocFiles = {
  application_letter: File | null;
  pds: File | null;
  wes: File | null;
  diploma: File | null;
  tor: File | null;
};

type FormData = Omit<Applicant, "id" | "created_at" | "has_assessment" | "has_interview" | "interview_count" | "doc_application_letter" | "doc_pds" | "doc_wes" | "doc_diploma" | "doc_tor">;

const emptyForm: FormData = {
  name: "", previous_position: "", position_applied: "", salary_grade: "",
  eligibility: "", office: "", contact: "", email: "", vacant_positions: "",
};

const emptyDocs: DocFiles = {
  application_letter: null,
  pds: null,
  wes: null,
  diploma: null,
  tor: null,
};

const DOC_LABELS: { key: keyof DocFiles; label: string }[] = [
  { key: "application_letter", label: "Application Letter" },
  { key: "pds",                label: "Personal Data Sheet (PDS)" },
  { key: "wes",                label: "Work Experience Sheet (WES)" },
  { key: "diploma",            label: "Diploma" },
  { key: "tor",                label: "Transcript of Records (TOR)" },
];

// ─── File Upload Field ────────────────────────────────────────────────────────

function FileUploadField({
  label, file, existingUrl, onChange, required,
}: {
  label: string;
  file: File | null;
  existingUrl?: string | null;
  onChange: (f: File | null) => void;
  required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-1">
      <Label className="text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-left transition-colors
            ${file
              ? "border-green-500 bg-green-50 text-green-700"
              : existingUrl
              ? "border-blue-400 bg-blue-50 text-blue-700"
              : "border-dashed border-gray-300 text-muted-foreground hover:border-gray-400 hover:bg-gray-50"
            }`}
        >
          <Upload className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {file ? file.name : existingUrl ? "Replace file" : "Click to upload"}
          </span>
        </button>
        {existingUrl && !file && (
          <a href={existingUrl} target="_blank" rel="noopener noreferrer" title="View existing file">
            <Button variant="ghost" size="sm" type="button" className="px-2">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}

// ─── Applicant Form ───────────────────────────────────────────────────────────

function ApplicantForm({
  initial, onSubmit, onClose, existingApplicants, isEditing, existingDocs,
}: {
  initial: FormData;
  onSubmit: (d: FormData, docs: DocFiles) => void;
  onClose: () => void;
  existingApplicants: Applicant[];
  isEditing: boolean;
  existingDocs?: { [k: string]: string | null | undefined };
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [docs, setDocs] = useState<DocFiles>(emptyDocs);
  const set = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setDoc = (k: keyof DocFiles, f: File | null) => setDocs((p) => ({ ...p, [k]: f }));

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
      }));
    }
  };

  // For new applicants all docs are required
  const allDocsProvided = isEditing || DOC_LABELS.every(({ key }) => docs[key] !== null);

  return (
    <div className="grid gap-4 max-h-[75vh] overflow-y-auto pr-1">
      {/* ── Basic Info ── */}
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
          <Input value={form.previous_position || ""} onChange={(e) => set("previous_position", e.target.value)} />
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
          type="number" min={0}
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

      {/* ── Document Uploads ── */}
      <div className="border-t pt-3">
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Required Documents
          {!isEditing && <span className="text-red-500 text-xs font-normal">(all required)</span>}
          {isEditing && <span className="text-muted-foreground text-xs font-normal">(upload to replace)</span>}
        </p>
        <div className="grid gap-2">
          {DOC_LABELS.map(({ key, label }) => (
            <FileUploadField
              key={key}
              label={label}
              file={docs[key]}
              existingUrl={existingDocs?.[`doc_${key}`]}
              onChange={(f) => setDoc(key, f)}
              required={!isEditing}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => onSubmit(form, docs)}
          disabled={!form.name || !form.position_applied || !allDocsProvided}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

// ─── Documents Viewer Dialog ──────────────────────────────────────────────────

function DocumentsDialog({ applicant }: { applicant: Applicant }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ label: string; url: string } | null>(null);

  const docs = [
    { label: "Application Letter",           url: applicant.doc_application_letter },
    { label: "Personal Data Sheet (PDS)",    url: applicant.doc_pds },
    { label: "Work Experience Sheet (WES)",  url: applicant.doc_wes },
    { label: "Diploma",                      url: applicant.doc_diploma },
    { label: "Transcript of Records (TOR)",  url: applicant.doc_tor },
  ];

  const hasAny = docs.some((d) => d.url);

  // Determine if URL is an image
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url.split("?")[0]);

  // Only phones (not tablets) fall back to new tab — tablets use Google Docs Viewer
  const isPhone = /iPhone|Android.*Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent);

  // Use Google Docs Viewer so PDFs render on tablets/iPads too
  const getViewerUrl = (url: string) =>
    isImage(url) ? url : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPreview(null); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="View Documents">
          <FolderOpen className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {preview ? (
              <>
                <button
                  onClick={() => setPreview(null)}
                  className="flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <span className="text-base font-semibold">{preview.label}</span>
              </>
            ) : (
              <>Documents — {applicant.name}</>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ── Document List ── */}
        {!preview && (
          !hasAny ? (
            <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded yet.</p>
          ) : (
            <div className="grid gap-2 py-2">
              {docs.map(({ label, url }) => (
                <div key={label} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{label}</span>
                  </div>
                  {url ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {isPhone ? (
                        // On phones: open in new tab
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="text-xs gap-1">
                            <ExternalLink className="h-3 w-3" /> Open
                          </Button>
                        </a>
                      ) : (
                        // On PC, laptop, tablet: preview inline via Google Docs Viewer
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => setPreview({ label, url })}
                          >
                            <FileText className="h-3 w-3" /> Preview
                          </Button>
                          <a href={url} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                            <Button variant="ghost" size="sm" className="px-2">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not uploaded</span>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Inline Preview ── */}
        {preview && (
          <div className="mt-2 rounded-md border overflow-hidden bg-muted" style={{ height: "70vh" }}>
            {isImage(preview.url) ? (
              <img
                src={preview.url}
                alt={preview.label}
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={getViewerUrl(preview.url)}
                title={preview.label}
                className="w-full h-full border-0"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicantsPage() {
  const { data: applicants, isLoading } = useApplicants();
  const { isSuperAdmin } = useAuth();
  const createMut = useCreateApplicant();
  const updateMut = useUpdateApplicant();
  const deleteMut = useDeleteApplicant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Applicant | null>(null);
  const [uploading, setUploading] = useState(false);

  const totalApplicants = applicants?.length || 0;
  const totalAssessed = applicants?.filter((a) => a.has_assessment).length || 0;
  const totalInterviewed = applicants?.filter((a) => (a.interview_count || 0) >= TOTAL_INTERVIEW_ACCOUNTS).length || 0;

  const handleCreate = async (data: FormData, docs: DocFiles) => {
    setUploading(true);
    try {
      const [doc_application_letter, doc_pds, doc_wes, doc_diploma, doc_tor] = await Promise.all([
        uploadApplicantDoc(data.name, "application_letter", docs.application_letter!),
        uploadApplicantDoc(data.name, "pds",                docs.pds!),
        uploadApplicantDoc(data.name, "wes",                docs.wes!),
        uploadApplicantDoc(data.name, "diploma",            docs.diploma!),
        uploadApplicantDoc(data.name, "tor",                docs.tor!),
      ]);
      createMut.mutate(
        { ...data, doc_application_letter, doc_pds, doc_wes, doc_diploma, doc_tor },
        { onSuccess: () => setDialogOpen(false) }
      );
    } catch (e: any) {
      toast.error("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (data: FormData, docs: DocFiles) => {
    if (!editing) return;
    setUploading(true);
    try {
      const docUpdates: Record<string, string> = {};
      await Promise.all(
        DOC_LABELS.map(async ({ key }) => {
          const file = docs[key];
          if (file) {
            const url = await uploadApplicantDoc(data.name || editing.name, key, file);
            docUpdates[`doc_${key}`] = url;
          }
        })
      );
      updateMut.mutate(
        { id: editing.id, ...data, ...docUpdates },
        { onSuccess: () => { setEditing(null); setDialogOpen(false); } }
      );
    } catch (e: any) {
      toast.error("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      {/* ── Summary Cards ── */}
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

      {/* ── Applicants Table ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Applicants</CardTitle>

          {isSuperAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Applicant</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Applicant" : "Add Applicant"}</DialogTitle>
                </DialogHeader>

                {uploading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading documents, please wait…</p>
                  </div>
                ) : (
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
                    existingDocs={editing ? {
                      doc_application_letter: editing.doc_application_letter,
                      doc_pds: editing.doc_pds,
                      doc_wes: editing.doc_wes,
                      doc_diploma: editing.doc_diploma,
                      doc_tor: editing.doc_tor,
                    } : undefined}
                    onSubmit={editing ? handleUpdate : handleCreate}
                    onClose={() => { setDialogOpen(false); setEditing(null); }}
                    existingApplicants={applicants || []}
                    isEditing={!!editing}
                  />
                )}
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
                          {!isSuperAdmin && (
                            <Badge variant={a.interview_count === TOTAL_INTERVIEW_ACCOUNTS ? "default" : "secondary"} className="text-xs">
                              {a.interview_count === TOTAL_INTERVIEW_ACCOUNTS ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              Form 4 {a.interview_count || 0}/{TOTAL_INTERVIEW_ACCOUNTS}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">

                          {/* Form 3 — visible to ALL */}
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/assessment/${a.id}`} title="Form 3">
                              <FileText className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* Form 4 — non-superadmin only */}
                          {!isSuperAdmin && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/interview/${a.id}`} title="Form 4">
                                <ClipboardList className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}

                          {/* Documents — visible to ALL accounts */}
                          <DocumentsDialog applicant={a} />

                          {/* Edit & Delete — superadmin only */}
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
                                    <AlertDialogDescription>
                                      This will also delete their assessment, interview, and document data.
                                    </AlertDialogDescription>
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
