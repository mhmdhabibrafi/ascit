"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  Database,
  Download,
  KeyRound,
  RefreshCw,
  Save,
  ServerCog,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Undo2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DatabaseStatusPanel } from "@/components/system/database-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader, PageStack } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import { cn, formatDateTime, humanizeEnum } from "@/lib/utils";
import type { SystemSettings } from "@/lib/system-settings";

type EnvStatus = "ok" | "warning" | "missing";

type SettingsResponse = {
  settings: SystemSettings;
  runtime: {
    environment: string;
    serverTime: string;
    timezone: string;
    uptimeSeconds: number;
    readiness: {
      status: "ready" | "warning" | "blocked";
      blocking: number;
      warnings: number;
      total: number;
    };
    ai: {
      enabled: boolean;
      providerName: string;
      configured: boolean;
      model: string;
      baseUrl: string;
      maxTokens: number;
      timeoutMs: number;
    };
    auth: {
      sessionMaxAgeHours: number;
      publicRegistration: boolean;
      allowedAdminRoles: string[];
    };
    envChecks: Array<{
      key: string;
      label: string;
      category: string;
      required: boolean;
      secret: boolean;
      status: EnvStatus;
      value: string;
      description: string;
    }>;
  };
  capabilities: {
    canEdit: boolean;
  };
  recentAudit: Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    user: string;
  }>;
};

type SectionKey = "profile" | "operations" | "ai" | "security" | "backup" | "runtime";

const sections: Array<{ key: SectionKey; label: string; icon: typeof Settings2 }> = [
  { key: "profile", label: "Profil Sistem", icon: Settings2 },
  { key: "operations", label: "Operasional", icon: SlidersHorizontal },
  { key: "ai", label: "AI & Decision Support", icon: Bot },
  { key: "security", label: "Keamanan & Akses", icon: ShieldCheck },
  { key: "backup", label: "Backup & Database", icon: Database },
  { key: "runtime", label: "Runtime", icon: ServerCog }
];

const roleOptions = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN_IT", label: "Admin IT" },
  { value: "KEPALA_IT", label: "Kepala IT" }
];

function cloneSettings(settings: SystemSettings) {
  return JSON.parse(JSON.stringify(settings)) as SystemSettings;
}

export function SettingsClient() {
  const toast = useToast();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [draft, setDraft] = useState<SystemSettings | null>(null);
  const [saved, setSaved] = useState<SystemSettings | null>(null);
  const [active, setActive] = useState<SectionKey>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const json = (await response.json()) as SettingsResponse & { error?: string };
      if (!response.ok) throw new Error(json.error || "Pengaturan belum dapat dimuat.");
      setData(json);
      setDraft(cloneSettings(json.settings));
      setSaved(cloneSettings(json.settings));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pengaturan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const dirty = useMemo(() => Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved)), [draft, saved]);

  const saveSettings = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: draft })
      });
      const json = (await response.json()) as Partial<SettingsResponse> & { error?: string };
      if (!response.ok || !json.settings) throw new Error(json.error || "Gagal menyimpan pengaturan.");

      const nextData: SettingsResponse = {
        ...(data as SettingsResponse),
        settings: json.settings,
        runtime: json.runtime || (data as SettingsResponse).runtime
      };
      setData(nextData);
      setDraft(cloneSettings(json.settings));
      setSaved(cloneSettings(json.settings));
      toast.push("Pengaturan berhasil disimpan.", "success");
      void loadSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan pengaturan.";
      setError(message);
      toast.push(message, "error");
    } finally {
      setSaving(false);
    }
  };

  function updateSection<K extends keyof SystemSettings, F extends keyof SystemSettings[K]>(section: K, field: F, value: SystemSettings[K][F]) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        [section]: {
          ...current[section],
          [field]: value
        }
      };
    });
  }

  function toggleAdminRole(role: string) {
    if (!draft) return;
    const exists = draft.security.allowedAdminRoles.includes(role);
    const nextRoles = exists
      ? draft.security.allowedAdminRoles.filter((item) => item !== role)
      : [...draft.security.allowedAdminRoles, role];
    updateSection("security", "allowedAdminRoles", nextRoles);
  }

  if (loading && !draft) {
    return (
      <PageStack>
        <PageHeader eyebrow="Administrasi" title="Pengaturan" description="Memuat konfigurasi sistem ASCIT." />
        <Card>
          <CardContent className="flex min-h-[120px] items-center justify-center text-sm font-medium text-muted-foreground">
            Memuat pengaturan sistem...
          </CardContent>
        </Card>
      </PageStack>
    );
  }

  if (!draft || !data) {
    return (
      <PageStack>
        <PageHeader eyebrow="Administrasi" title="Pengaturan" description="Konfigurasi sistem belum dapat dibaca." />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-red-800">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <div className="font-bold">Pengaturan belum dapat dimuat.</div>
                <div className="mt-1 text-sm">{error || "Periksa sesi login dan koneksi database."}</div>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadSettings()}>
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </PageStack>
    );
  }

  const canEdit = data.capabilities.canEdit;
  const readinessTone = data.runtime.readiness.status === "ready" ? "success" : data.runtime.readiness.status === "warning" ? "warning" : "danger";

  return (
    <PageStack>
      <PageHeader
        eyebrow="Administrasi"
        title="Pengaturan"
        description="Kelola profil aplikasi, kebijakan operasional, konfigurasi AI, keamanan, status database, dan readiness runtime tanpa menampilkan nilai rahasia."
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => void loadSettings()} disabled={loading || saving}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button type="button" variant="outline" onClick={() => draft && saved && setDraft(cloneSettings(saved))} disabled={!dirty || saving}>
              <Undo2 className="h-4 w-4" />
              Reset
            </Button>
            <Button type="button" onClick={saveSettings} disabled={!canEdit || !dirty || saving}>
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan" : "Simpan"}
            </Button>
          </>
        }
      />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Akun Anda dapat melihat pengaturan, tetapi tidak memiliki izin untuk menyimpan perubahan.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <SummaryTile icon={ServerCog} label="Readiness runtime" value={humanizeEnum(data.runtime.readiness.status)} tone={readinessTone} hint={`${data.runtime.readiness.blocking} blocker, ${data.runtime.readiness.warnings} peringatan`} />
        <SummaryTile icon={Bot} label="AI Decision Support" value={data.runtime.ai.configured ? "Siap" : "Belum lengkap"} tone={data.runtime.ai.configured ? "success" : "warning"} hint={data.runtime.ai.model} />
        <SummaryTile icon={KeyRound} label="Akses edit" value={canEdit ? "Diizinkan" : "Read only"} tone={canEdit ? "success" : "muted"} hint={data.runtime.auth.allowedAdminRoles.join(", ")} />
        <SummaryTile icon={Activity} label="Server" value={data.runtime.environment} tone="info" hint={`Uptime ${formatUptime(data.runtime.uptimeSeconds)}`} />
      </section>

      <DatabaseStatusPanel />

      <section className="grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
        <nav className="grid content-start gap-2">
          {sections.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md border px-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
                active === key ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {active === "profile" ? <ProfileSection draft={draft} updateSection={updateSection} disabled={!canEdit || saving} /> : null}
          {active === "operations" ? <OperationsSection draft={draft} updateSection={updateSection} disabled={!canEdit || saving} /> : null}
          {active === "ai" ? <AiSection draft={draft} data={data} updateSection={updateSection} disabled={!canEdit || saving} /> : null}
          {active === "security" ? (
            <SecuritySection draft={draft} updateSection={updateSection} toggleAdminRole={toggleAdminRole} disabled={!canEdit || saving} />
          ) : null}
          {active === "backup" ? <BackupSection draft={draft} /> : null}
          {active === "runtime" ? <RuntimeSection data={data} /> : null}
        </div>
      </section>
    </PageStack>
  );
}

function ProfileSection({
  draft,
  updateSection,
  disabled
}: {
  draft: SystemSettings;
  updateSection: <K extends keyof SystemSettings, F extends keyof SystemSettings[K]>(section: K, field: F, value: SystemSettings[K][F]) => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil Sistem</CardTitle>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">Identitas aplikasi dan batas scope data yang muncul di dokumentasi operasional.</p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <Field label="Nama sistem">
          <Input value={draft.profile.systemName} onChange={(event) => updateSection("profile", "systemName", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Subtitle sistem">
          <Input value={draft.profile.systemSubtitle} onChange={(event) => updateSection("profile", "systemSubtitle", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Organisasi">
          <Input value={draft.profile.organizationName} onChange={(event) => updateSection("profile", "organizationName", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Site">
          <Input value={draft.profile.siteName} onChange={(event) => updateSection("profile", "siteName", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Divisi">
          <Input value={draft.profile.divisionName} onChange={(event) => updateSection("profile", "divisionName", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Timezone">
          <Select value={draft.profile.timezone} onChange={(event) => updateSection("profile", "timezone", event.target.value)} disabled={disabled}>
            <option value="Asia/Jakarta">Asia/Jakarta</option>
            <option value="Asia/Makassar">Asia/Makassar</option>
            <option value="Asia/Jayapura">Asia/Jayapura</option>
            <option value="UTC">UTC</option>
          </Select>
        </Field>
        <Field label="Email support">
          <Input type="email" value={draft.profile.supportEmail} onChange={(event) => updateSection("profile", "supportEmail", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Telepon support">
          <Input value={draft.profile.supportPhone} onChange={(event) => updateSection("profile", "supportPhone", event.target.value)} disabled={disabled} />
        </Field>
        <div className="lg:col-span-2">
          <Field label="Batas scope data">
            <Textarea value={draft.profile.dataScopeNote} onChange={(event) => updateSection("profile", "dataScopeNote", event.target.value)} disabled={disabled} />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

function OperationsSection({
  draft,
  updateSection,
  disabled
}: {
  draft: SystemSettings;
  updateSection: <K extends keyof SystemSettings, F extends keyof SystemSettings[K]>(section: K, field: F, value: SystemSettings[K][F]) => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kebijakan Operasional</CardTitle>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">Nilai acuan untuk monitoring aset, garansi, maintenance, QR, dan laporan.</p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <NumberField label="Peringatan garansi (hari)" value={draft.operations.warrantyWarningDays} disabled={disabled} onChange={(value) => updateSection("operations", "warrantyWarningDays", value)} />
        <NumberField label="Reminder maintenance (hari)" value={draft.operations.maintenanceReminderDays} disabled={disabled} onChange={(value) => updateSection("operations", "maintenanceReminderDays", value)} />
        <NumberField label="Umur aset perlu pantau (tahun)" value={draft.operations.assetWatchYears} disabled={disabled} onChange={(value) => updateSection("operations", "assetWatchYears", value)} />
        <NumberField label="Umur aset kritis (tahun)" value={draft.operations.assetCriticalYears} disabled={disabled} onChange={(value) => updateSection("operations", "assetCriticalYears", value)} />
        <Field label="Base path QR">
          <Input value={draft.operations.qrBasePath} onChange={(event) => updateSection("operations", "qrBasePath", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Format laporan default">
          <Select value={draft.operations.defaultReportFormat} onChange={(event) => updateSection("operations", "defaultReportFormat", event.target.value as "CSV" | "PRINT")} disabled={disabled}>
            <option value="CSV">CSV</option>
            <option value="PRINT">Print</option>
          </Select>
        </Field>
        <SettingSwitch label="Approval mutasi wajib" description="Mutasi tetap melewati antrian approval sebelum dianggap selesai." checked={draft.operations.requireMutationApproval} disabled={disabled} onChange={(checked) => updateSection("operations", "requireMutationApproval", checked)} />
        <SettingSwitch label="Ringkasan eksekutif" description="Tampilkan ringkasan untuk dashboard dan laporan manajemen." checked={draft.operations.showExecutiveSummary} disabled={disabled} onChange={(checked) => updateSection("operations", "showExecutiveSummary", checked)} />
      </CardContent>
    </Card>
  );
}

function AiSection({
  draft,
  data,
  updateSection,
  disabled
}: {
  draft: SystemSettings;
  data: SettingsResponse;
  updateSection: <K extends keyof SystemSettings, F extends keyof SystemSettings[K]>(section: K, field: F, value: SystemSettings[K][F]) => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Decision Support</CardTitle>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">Atur kebijakan analisis AI. Secret API tetap berada di environment server.</p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">Status {draft.ai.providerName || "AI Lokal"}</div>
              <div className="mt-1 text-sm text-muted-foreground">{draft.ai.baseUrl || data.runtime.ai.baseUrl}</div>
            </div>
            <Badge tone={draft.ai.apiKey ? "success" : "warning"}>{draft.ai.apiKey ? "API key tersedia" : "API key belum diisi"}</Badge>
          </div>
        </div>
        <SettingSwitch label="Aktifkan AI" description={`Rule engine tetap berjalan; ${draft.ai.providerName || "AI Lokal"} dipakai untuk narasi jika diaktifkan.`} checked={draft.ai.enabled} disabled={disabled} onChange={(checked) => updateSection("ai", "enabled", checked)} />
        <SettingSwitch label={`Narasi ${draft.ai.providerName || "AI Lokal"}`} description="Tambahkan penjelasan natural language pada rekomendasi aset." checked={draft.ai.allowNarrativeExplanation} disabled={disabled} onChange={(checked) => updateSection("ai", "allowNarrativeExplanation", checked)} />
        <Field label="Provider AI">
          <Input value={draft.ai.providerName} onChange={(event) => updateSection("ai", "providerName", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="API Key">
          <Input type="password" placeholder="gsk_..." value={draft.ai.apiKey} onChange={(event) => updateSection("ai", "apiKey", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Base URL API">
          <Input value={draft.ai.baseUrl} onChange={(event) => updateSection("ai", "baseUrl", event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Model default">
          <Input value={draft.ai.defaultModel} onChange={(event) => updateSection("ai", "defaultModel", event.target.value)} disabled={disabled} />
        </Field>
        <NumberField label="Maksimal aset per run" value={draft.ai.maxAssetsPerRun} disabled={disabled} onChange={(value) => updateSection("ai", "maxAssetsPerRun", value)} />
        <NumberField label="Threshold pantau" value={draft.ai.watchThreshold} disabled={disabled} onChange={(value) => updateSection("ai", "watchThreshold", value)} />
        <NumberField label="Threshold upgrade" value={draft.ai.upgradeThreshold} disabled={disabled} onChange={(value) => updateSection("ai", "upgradeThreshold", value)} />
        <NumberField label="Threshold penggantian" value={draft.ai.replacementThreshold} disabled={disabled} onChange={(value) => updateSection("ai", "replacementThreshold", value)} />
        
        <div className="lg:col-span-2 border-t pt-4 mt-2">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Konfigurasi Lanjut Model (Model Parameters)</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="API Timeout (detik)" value={draft.ai.apiTimeoutSeconds ?? 30} disabled={disabled} onChange={(value) => updateSection("ai", "apiTimeoutSeconds", value)} />
            <NumberField label="Maksimal Tokens Output" value={draft.ai.maxTokens ?? 2048} disabled={disabled} onChange={(value) => updateSection("ai", "maxTokens", value)} />
            <Field label="Temperature (kreativitas narasi AI)">
              <Input type="number" step="0.1" min="0" max="1" value={draft.ai.temperature ?? 0.3} onChange={(event) => updateSection("ai", "temperature", Number(event.target.value))} disabled={disabled} />
            </Field>
            <Field label="Gaya Bahasa Prompt AI">
              <Select value={draft.ai.systemPromptStyle ?? "FORMAL"} onChange={(event) => updateSection("ai", "systemPromptStyle", event.target.value as "FORMAL" | "DETAILED" | "CONCISE")} disabled={disabled}>
                <option value="FORMAL">Analitis & Formal (Default)</option>
                <option value="DETAILED">Teknis & Mendalam (Detail Logis)</option>
                <option value="CONCISE">Ringkas & Padat (To-the-point)</option>
              </Select>
            </Field>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySection({
  draft,
  updateSection,
  toggleAdminRole,
  disabled
}: {
  draft: SystemSettings;
  updateSection: <K extends keyof SystemSettings, F extends keyof SystemSettings[K]>(section: K, field: F, value: SystemSettings[K][F]) => void;
  toggleAdminRole: (role: string) => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Keamanan dan Akses</CardTitle>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">Batas keamanan sistem untuk akses admin, audit, password, dan data sensitif.</p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <NumberField label="Durasi sesi acuan (jam)" value={draft.security.sessionMaxAgeHours} disabled={disabled} onChange={(value) => updateSection("security", "sessionMaxAgeHours", value)} />
        <NumberField label="Retensi audit log (hari)" value={draft.security.auditRetentionDays} disabled={disabled} onChange={(value) => updateSection("security", "auditRetentionDays", value)} />
        <SettingSwitch label="Proteksi data pasien" description="ASCIT tetap dibatasi untuk data aset IT dan tidak menyimpan data klinis." checked={draft.security.patientDataGuard} disabled={disabled} onChange={(checked) => updateSection("security", "patientDataGuard", checked)} />
        <SettingSwitch label="Password kuat wajib" description="Akun baru harus memakai kombinasi huruf dan angka minimal 8 karakter." checked={draft.security.requireStrongPassword} disabled={disabled} onChange={(checked) => updateSection("security", "requireStrongPassword", checked)} />
        <SettingSwitch label="Registrasi publik" description="Selalu disimpan nonaktif untuk mencegah akun liar." checked={draft.security.allowPublicRegistration} disabled onChange={() => undefined} />
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-bold text-slate-900">Role yang boleh mengelola settings</div>
          <div className="mt-3 grid gap-2">
            {roleOptions.map((role) => (
              <label key={role.value} className="flex items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-200"
                  checked={draft.security.allowedAdminRoles.includes(role.value)}
                  onChange={() => toggleAdminRole(role.value)}
                  disabled={disabled}
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BackupSection({ draft }: { draft: SystemSettings }) {
  const toast = useToast();
  const [pruning, setPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePrune = async () => {
    setShowConfirm(false);
    setPruning(true);
    setPruneResult(null);
    try {
      const response = await fetch("/api/settings/backup", {
        method: "POST"
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal melakukan pemeliharaan.");
      toast.push(json.message, "success");
      setPruneResult(json.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memangkas log.";
      toast.push(msg, "error");
      setPruneResult(`Error: ${msg}`);
    } finally {
      setPruning(false);
    }
  };

  return (
    <div className="grid gap-4 animate-page-in">
      <Card>
        <CardHeader>
          <CardTitle>Ekspor Backup Database</CardTitle>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Unduh salinan data seluruh sistem ASCIT untuk cadangan keamanan atau migrasi.</p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Database className="h-5 w-5 text-emerald-700" />
                Database Backup (.SQL)
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Menggunakan PostgreSQL pg_dump untuk mengunduh file SQL lengkap dengan struktur tabel (DDL) dan data (INSERT). Kompatibel penuh untuk pemulihan langsung di pgAdmin/pgweb.
              </p>
            </div>
            <div className="mt-4">
              <a
                href="/api/settings/backup?format=sql"
                download
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white shadow transition hover:bg-emerald-800"
              >
                <Download className="h-4 w-4" />
                Unduh SQL Backup
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Download className="h-5 w-5 text-emerald-700" />
                Portable Data Export (.JSON)
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Ekspor seluruh data dari semua tabel sistem ke format JSON portable terstruktur. Berguna sebagai arsip data ringan, audit kepatuhan, atau impor offline.
              </p>
            </div>
            <div className="mt-4">
              <a
                href="/api/settings/backup?format=json"
                download
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white shadow transition hover:bg-emerald-800"
              >
                <Download className="h-4 w-4" />
                Unduh JSON Portable
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pemeliharaan Database (Database Maintenance)</CardTitle>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Optimalkan ukuran penyimpanan database PostgreSQL Anda dengan membersihkan data log audit lama.</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Pemangkasan Log Audit Otomatis</div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Hapus data riwayat aksi yang berumur lebih dari <span className="font-bold text-slate-800">{draft.security.auditRetentionDays} hari</span> (sesuai kebijakan retensi keamanan yang dikonfigurasi).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setShowConfirm(true)}
                disabled={pruning}
              >
                <Trash2 className="h-4 w-4" />
                {pruning ? "Memangkas..." : "Pangkas Log Audit"}
              </Button>
            </div>
            {pruneResult && (
              <div className="mt-3 rounded-md bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                {pruneResult}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showConfirm && (
        <ConfirmDialog
          title="Pangkas Log Audit"
          message={`Apakah Anda yakin ingin memangkas log audit yang berumur lebih dari ${draft.security.auditRetentionDays} hari? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Ya, Pangkas"
          variant="danger"
          onConfirm={handlePrune}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

function RuntimeSection({ data }: { data: SettingsResponse }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Runtime dan Environment</CardTitle>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Pemeriksaan readiness tanpa membocorkan nilai rahasia dari server.</p>
        </CardHeader>
        <CardContent className="grid gap-3">
          {data.runtime.envChecks.map((item) => (
            <div key={item.key} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-mono text-xs font-bold text-emerald-800">{item.key}</div>
                  <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                  {item.required ? <Badge tone="info">Wajib</Badge> : <Badge tone="muted">Opsional</Badge>}
                </div>
                <div className="mt-2 text-sm font-bold text-slate-900">{item.label}</div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p>
              </div>
              <div className="min-w-0 rounded-md border bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-600 lg:min-w-[220px]">
                {item.value}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Info Server</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Environment" value={data.runtime.environment} />
            <InfoRow label="Server time" value={formatDateTime(data.runtime.serverTime)} />
            <InfoRow label="Timezone aplikasi" value={data.runtime.timezone} />
            <InfoRow label="Uptime" value={formatUptime(data.runtime.uptimeSeconds)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Perubahan Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.recentAudit.length ? (
              data.recentAudit.map((row) => (
                <div key={row.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-slate-900">{row.user}</div>
                    <div className="text-xs font-medium text-muted-foreground">{formatDateTime(row.createdAt)}</div>
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">{row.action}</div>
                  <p className="mt-1 text-sm leading-5 text-slate-700">{row.description}</p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-muted-foreground">
                Belum ada perubahan settings yang tercatat.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
  tone
}: {
  icon: typeof Settings2;
  label: string;
  value: string;
  hint: string;
  tone: "success" | "warning" | "danger" | "info" | "muted";
}) {
  return (
    <Card>
      <CardContent className="flex min-h-[104px] items-start gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            tone === "success" && "bg-emerald-50 text-emerald-700",
            tone === "warning" && "bg-amber-50 text-amber-700",
            tone === "danger" && "bg-red-50 text-red-700",
            tone === "info" && "bg-emerald-50 text-emerald-700",
            tone === "muted" && "bg-slate-100 text-slate-600"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
          <div className="mt-1.5 break-words text-lg font-semibold leading-tight text-slate-950">{value}</div>
          <div className="mt-1.5 text-xs leading-5 text-muted-foreground">{hint}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function NumberField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (value: number) => void; disabled: boolean }) {
  return (
    <Field label={label}>
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled} />
    </Field>
  );
}

function SettingSwitch({
  label,
  description,
  checked,
  onChange,
  disabled
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4", disabled && "opacity-70")}>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-200"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-sm font-bold text-slate-900">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words text-right text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function statusTone(status: EnvStatus) {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  return "danger";
}

function statusLabel(status: EnvStatus) {
  if (status === "ok") return "Siap";
  if (status === "warning") return "Perlu dicek";
  return "Belum lengkap";
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} jam ${minutes} menit`;
  return `${minutes} menit`;
}
