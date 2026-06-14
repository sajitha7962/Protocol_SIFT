import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Hash, FileCheck, AlertCircle, Plus, X, Loader2 } from 'lucide-react';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { PageHeader } from '../../components/shared/index';
import { StatusBadge } from '../../components/shared/Badges';
import { cn, formatBytes } from '../../lib/utils';
import { investigationsApi, evidenceApi, type Investigation } from '../../services/api';
import { useCaseStore } from '../../stores/caseStore';

const schema = z.object({
  title:       z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  severity:    z.enum(['critical', 'high', 'medium', 'low']),
  assignedTo:  z.string().optional(),
  tags:        z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface UploadedFile {
  file: File | null;
  name: string;
  size: number;
  type: string;
  evidenceType: string;
  status: 'pending' | 'uploading' | 'verified' | 'error';
  hash?: string;
  error?: string;
}

const EVIDENCE_TYPES = [
  { label: 'Disk Image',          value: 'disk_image' },
  { label: 'Memory Dump',         value: 'memory_dump' },
  { label: 'Log File',            value: 'log_file' },
  { label: 'PCAP',                value: 'pcap' },
  { label: 'SIEM Export',         value: 'siem_export' },
  { label: 'Endpoint Telemetry',  value: 'endpoint_telemetry' },
  { label: 'Cloud Logs',          value: 'cloud_logs' },
  { label: 'JSON Package',        value: 'json_package' },
  { label: 'Windows EVTX',        value: 'windows_evtx' },
  { label: 'Firewall Log',        value: 'firewall_log' },
];

export default function NewCaseIntake() {
  const navigate = useNavigate();
  const { fetchCases } = useCaseStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [createdCase, setCreatedCase] = useState<Investigation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'high' },
  });

  // Infer evidence type from file extension
  const inferEvidenceType = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['raw', 'img', 'dd', 'vmdk', 'vhd'].includes(ext)) return 'disk_image';
    if (['mem', 'dmp', 'dump'].includes(ext)) return 'memory_dump';
    if (['pcap', 'pcapng', 'cap'].includes(ext)) return 'pcap';
    if (['evtx'].includes(ext)) return 'windows_evtx';
    if (['json'].includes(ext)) return 'json_package';
    if (['log', 'txt', 'csv'].includes(ext)) return 'log_file';
    return 'log_file';
  };

  const addFile = (file: File) => {
    setFiles((prev) => [
      ...prev,
      {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        evidenceType: inferEvidenceType(file.name),
        status: 'pending',
      },
    ]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(addFile);
  };

  const onStep1Submit = (data: FormData) => {
    setFormData(data);
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!formData) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create investigation
      const tags = formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const inv = await investigationsApi.create({
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        tags,
        created_by: formData.assignedTo || 'soc_analyst',
      });
      setCreatedCase(inv);

      // 2. Upload each file
      for (const f of files) {
        if (!f.file) continue;
        setFiles((prev) =>
          prev.map((fi) => fi.name === f.name ? { ...fi, status: 'uploading' } : fi)
        );
        try {
          const evidence = await evidenceApi.upload(String(inv.id), f.evidenceType, f.file);
          setFiles((prev) =>
            prev.map((fi) =>
              fi.name === f.name
                ? { ...fi, status: 'verified', hash: evidence.sha256 }
                : fi
            )
          );
        } catch (uploadErr) {
          setFiles((prev) =>
            prev.map((fi) =>
              fi.name === f.name
                ? { ...fi, status: 'error', error: String(uploadErr) }
                : fi
            )
          );
        }
      }

      // 3. Refresh case list and navigate
      await fetchCases();
      setStep(3);
    } catch (err) {
      setSubmitError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success Screen ────────────────────────────────────────────────────
  if (step === 3 && createdCase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-6 rounded-2xl bg-sift-green/10 border border-sift-green/30 mb-6">
          <FileCheck size={40} className="text-sift-green mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-white">Case Created Successfully</h2>
        <p className="text-sift-muted mt-2 text-sm">
          The autonomous forensic pipeline has been queued for the uploaded evidence.
        </p>
        <div className="mt-4 glass rounded-lg px-4 py-2 font-mono text-xs text-sift-cyan">
          {createdCase.id} · {createdCase.title}
        </div>

        {files.length > 0 && (
          <div className="mt-4 w-full max-w-md space-y-2 text-left">
            {files.map((f) => (
              <div key={f.name} className="glass rounded-lg p-2.5 flex items-center gap-2 text-xs">
                {f.status === 'verified' ? (
                  <FileCheck size={13} className="text-sift-green flex-shrink-0" />
                ) : f.status === 'error' ? (
                  <AlertCircle size={13} className="text-sift-danger flex-shrink-0" />
                ) : (
                  <Loader2 size={13} className="text-sift-cyan animate-spin flex-shrink-0" />
                )}
                <span className="truncate text-white flex-1">{f.name}</span>
                {f.status === 'verified' && f.hash && (
                  <span className="font-mono text-sift-muted text-[9px]">{f.hash.slice(0, 12)}…</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={() => navigate(`/findings`)}
            className="px-5 py-2.5 rounded-lg text-xs font-semibold text-black"
            style={{ background: '#4cd7f6' }}
          >
            View Findings →
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 rounded-lg border border-white/15 text-sift-muted text-xs hover:text-white transition-colors"
          >
            ← Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="New Case Intake" description="Create a new investigation case and upload forensic evidence" icon={<Plus size={20} />} />

      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {['Case Details', 'Evidence Upload', 'Review & Submit'].map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all',
              step === i + 1 ? 'bg-sift-cyan/15 text-sift-cyan border border-sift-cyan/30'
              : step > i + 1  ? 'text-sift-green'
              : 'text-sift-muted'
            )}>
              <span className={cn('w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                step > i + 1    ? 'border-sift-green bg-sift-green/20 text-sift-green'
                : step === i + 1 ? 'border-sift-cyan bg-sift-cyan/20 text-sift-cyan'
                : 'border-white/20 text-white/30'
              )}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              {s}
            </div>
            {i < 2 && <div className="h-px flex-1 bg-white/10 mx-2" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Case Details ── */}
      {step === 1 && (
        <GlassPanel className="p-6" strong>
          <h3 className="text-sm font-semibold text-white mb-5">Case Information</h3>
          <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-sift-muted mb-1.5 uppercase tracking-wide">Case Title *</label>
                <input {...register('title')} className="sift-input" placeholder="e.g. Operation Black Helix" />
                {errors.title && <p className="text-xs text-sift-danger mt-1">{errors.title.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-sift-muted mb-1.5 uppercase tracking-wide">Description *</label>
                <textarea {...register('description')} rows={3} className="sift-input resize-none" placeholder="Describe the incident, initial indicators, and scope..." />
                {errors.description && <p className="text-xs text-sift-danger mt-1">{errors.description.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-mono text-sift-muted mb-1.5 uppercase tracking-wide">Severity *</label>
                <select {...register('severity')} className="sift-input">
                  {['critical', 'high', 'medium', 'low'].map((s) => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-sift-muted mb-1.5 uppercase tracking-wide">Assigned To</label>
                <input {...register('assignedTo')} className="sift-input" placeholder="analyst@soc.gov" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-sift-muted mb-1.5 uppercase tracking-wide">Tags</label>
                <input {...register('tags')} className="sift-input" placeholder="apt, ransomware, lateral-movement (comma separated)" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="px-5 py-2.5 rounded-lg bg-sift-cyan/20 border border-sift-cyan/40 text-sift-cyan text-sm font-semibold hover:bg-sift-cyan/30 transition-colors">
                Next: Upload Evidence →
              </button>
            </div>
          </form>
        </GlassPanel>
      )}

      {/* ── Step 2: Evidence Upload ── */}
      {step === 2 && (
        <div className="space-y-4">
          <GlassPanel className="p-6" strong>
            <h3 className="text-sm font-semibold text-white mb-4">Upload Evidence Files</h3>

            {/* Drop Zone */}
            <label
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer block',
                dragging ? 'border-sift-cyan bg-sift-cyan/05' : 'border-white/15 hover:border-white/25'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) => Array.from(e.target.files ?? []).forEach(addFile)}
              />
              <Upload size={32} className="mx-auto text-sift-muted mb-3" />
              <p className="text-sm text-white font-medium">Drop forensic evidence here or click to browse</p>
              <p className="text-xs text-sift-muted mt-1">Disk images, memory dumps, logs, PCAPs, SIEM exports, JSON packages</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {EVIDENCE_TYPES.map((t) => <span key={t.value} className="badge-info">{t.label}</span>)}
              </div>
            </label>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-mono text-sift-muted mb-2">{files.length} file(s) ready to upload</p>
                {files.map((f) => (
                  <div key={f.name} className="glass rounded-lg p-3 flex items-center gap-3">
                    <div className={cn('p-1.5 rounded-lg flex-shrink-0',
                      f.status === 'verified'   ? 'bg-sift-green/10'
                      : f.status === 'uploading' ? 'bg-sift-cyan/10'
                      : f.status === 'error'     ? 'bg-sift-danger/10'
                      : 'bg-white/05'
                    )}>
                      {f.status === 'verified'   ? <FileCheck size={14} className="text-sift-green" />
                      : f.status === 'uploading'  ? <Loader2 size={14} className="text-sift-cyan animate-spin" />
                      : f.status === 'error'      ? <AlertCircle size={14} className="text-sift-danger" />
                      : <Hash size={14} className="text-sift-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{f.name}</p>
                      <p className="text-[10px] font-mono text-sift-muted">{formatBytes(f.size)}</p>
                    </div>
                    {/* Evidence type selector */}
                    <select
                      value={f.evidenceType}
                      onChange={(e) => setFiles((prev) =>
                        prev.map((fi) => fi.name === f.name ? { ...fi, evidenceType: e.target.value } : fi)
                      )}
                      className="sift-input py-1 text-[10px] font-mono w-36"
                    >
                      {EVIDENCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button
                      onClick={() => setFiles((p) => p.filter((fi) => fi.name !== f.name))}
                      className="text-sift-muted hover:text-sift-danger transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-white/15 text-sift-muted text-sm hover:text-white hover:border-white/30 transition-colors">← Back</button>
            <button
              onClick={() => setStep(3 as any)}
              className="px-5 py-2.5 rounded-lg bg-sift-cyan/20 border border-sift-cyan/40 text-sift-cyan text-sm font-semibold hover:bg-sift-cyan/30 transition-colors"
            >
              {files.length > 0 ? `Review (${files.length} file${files.length > 1 ? 's' : ''}) →` : 'Skip & Review →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 3 && !createdCase && (
        <div className="space-y-4">
          <GlassPanel className="p-6" strong>
            <h3 className="text-sm font-semibold text-white mb-4">Review & Submit</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/08">
                <span className="text-xs text-sift-muted">Case Title</span>
                <span className="text-xs font-semibold text-white">{formData?.title}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/08">
                <span className="text-xs text-sift-muted">Severity</span>
                <span className="text-xs font-mono text-sift-warning uppercase">{formData?.severity}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/08">
                <span className="text-xs text-sift-muted">Evidence Files</span>
                <span className="text-xs font-mono text-white">{files.length} file(s)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/08">
                <span className="text-xs text-sift-muted">API Target</span>
                <span className="text-xs font-mono text-sift-cyan">POST /api/v1/investigations/</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/08">
                <span className="text-xs text-sift-muted">Pipeline Trigger</span>
                <StatusBadge status="AUTO-QUEUED" variant="info" />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-sift-muted">Chain of Custody</span>
                <StatusBadge status="INITIALIZED" variant="success" />
              </div>
            </div>

            {submitError && (
              <div className="mt-4 px-4 py-3 rounded-lg bg-sift-danger/10 border border-sift-danger/30 text-xs text-sift-danger font-mono">
                {submitError}
              </div>
            )}
          </GlassPanel>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg border border-white/15 text-sift-muted text-sm hover:text-white hover:border-white/30 transition-colors">← Back</button>
            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-sift-green/20 border border-sift-green/40 text-sift-green text-sm font-semibold hover:bg-sift-green/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" />Creating Case...</> : '✓ Create Case & Start Agent'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
