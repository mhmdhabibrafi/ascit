import type { ScoreResult, ScoringAsset } from "@/lib/ai/scoring-engine";
import { prisma } from "@/lib/prisma";

export type GroqExplanation = {
  summary: string;
  recommendation: string;
  priority: "rendah" | "sedang" | "tinggi" | "kritis";
  recommendedActions: string[];
  reason: string;
  nextYearPlan: string;
};

export type GroqResult =
  | { ok: true; data: GroqExplanation }
  | { ok: false; error: string };

type GroqMessagesResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

const priorities = ["rendah", "sedang", "tinggi", "kritis"] as const;

function cleanContent(content: string) {
  return content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function extractJsonCandidate(content: string) {
  const cleaned = cleanContent(content);
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  return first >= 0 && last >= 0 ? cleaned.slice(first, last + 1) : cleaned;
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
  }
}

function readStringField(content: string, key: keyof GroqExplanation) {
  const closed = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i").exec(content);
  if (closed?.[1]) return decodeJsonString(closed[1]).trim();

  const open = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]+?)(?:",\\s*"\\w+"\\s*:|\\n\\s*[,}]|$)`, "i").exec(content);
  if (open?.[1]) return decodeJsonString(open[1].replace(/[,}]\s*$/, "")).trim();
  return "";
}

function readActions(content: string, fallback: string[]) {
  const match = /"recommendedActions"\s*:\s*\[([\s\S]*?)\]/i.exec(content);
  if (!match?.[1]) return fallback;
  const values = Array.from(match[1].matchAll(/"((?:\\.|[^"\\])*)"/g))
    .map((item) => decodeJsonString(item[1]).trim())
    .filter(Boolean);
  return values.length ? values : fallback;
}

function readPriority(content: string, fallback: GroqExplanation["priority"]) {
  const match = /"priority"\s*:\s*"([^"]+)"/i.exec(content);
  const value = match?.[1]?.toLowerCase();
  return priorities.includes(value as GroqExplanation["priority"]) ? (value as GroqExplanation["priority"]) : fallback;
}

function normalizeExplanation(value: unknown, asset: ScoringAsset, score: ScoreResult): GroqExplanation {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const fallbackActions = score.recommendationTypes.map((item) => String(item));
  const priority = priorities.includes(String(data.priority).toLowerCase() as GroqExplanation["priority"])
    ? (String(data.priority).toLowerCase() as GroqExplanation["priority"])
    : score.priority;

  return {
    summary: String(data.summary || `${asset.assetCode} - ${asset.assetName} dianalisis oleh Groq dengan skor ${score.score}.`).trim(),
    recommendation: String(data.recommendation || "Gunakan rekomendasi Groq bersama skor rule engine ASCIT untuk menentukan tindak lanjut.").trim(),
    priority,
    recommendedActions: Array.isArray(data.recommendedActions)
      ? data.recommendedActions.map((item) => String(item).trim()).filter(Boolean)
      : fallbackActions,
    reason: String(data.reason || "Groq memberikan analisis, namun format detail alasan tidak lengkap. Gunakan skor dan faktor rule engine sebagai pendamping.").trim(),
    nextYearPlan: String(data.nextYearPlan || "Masukkan aset ke evaluasi berkala tahun depan sesuai prioritas dan ketersediaan anggaran.").trim()
  };
}

function explanationFromLooseText(content: string, asset: ScoringAsset, score: ScoreResult): GroqExplanation {
  const cleaned = cleanContent(content);
  const fallbackActions = score.recommendationTypes.map((item) => String(item));
  const plainText = cleaned
    .replace(/[{}]/g, " ")
    .replace(/"\w+"\s*:/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    summary: readStringField(cleaned, "summary") || `${asset.assetCode} - ${asset.assetName} dianalisis oleh Groq dengan skor ${score.score}.`,
    recommendation: readStringField(cleaned, "recommendation") || "Gunakan penjelasan Groq sebagai dasar tindak lanjut aset.",
    priority: readPriority(cleaned, score.priority),
    recommendedActions: readActions(cleaned, fallbackActions),
    reason: readStringField(cleaned, "reason") || plainText.slice(0, 1600) || "Groq memberikan penjelasan, tetapi formatnya tidak lengkap.",
    nextYearPlan: readStringField(cleaned, "nextYearPlan") || "Masukkan aset ke evaluasi berkala tahun depan sesuai prioritas dan ketersediaan anggaran."
  };
}

function parseGroqExplanation(content: string, asset: ScoringAsset, score: ScoreResult): GroqExplanation {
  try {
    return normalizeExplanation(JSON.parse(extractJsonCandidate(content)), asset, score);
  } catch {
    return explanationFromLooseText(content, asset, score);
  }
}

function messagesEndpoint(baseUrl: string) {
  if (baseUrl.includes("11434")) {
    return `${baseUrl.replace(/\/$/, "")}/chat`;
  }
  if (baseUrl.includes("openai") || baseUrl.includes("groq") || baseUrl.includes("/v1")) {
    return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  }
  return `${baseUrl.replace(/\/$/, "")}/messages`;
}

function extractMessageText(payload: any) {
  if (payload.message?.content) {
    return payload.message.content.trim();
  }
  if (payload.choices && payload.choices[0]?.message?.content) {
    return payload.choices[0].message.content.trim();
  }
  return payload.content
    ?.filter((item: any) => item.type === "text" || item.text)
    .map((item: any) => item.text || "")
    .join("\n")
    .trim();
}

function errorMessage(status: number, payload: unknown) {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: { message?: string; type?: string } }).error;
    if (error?.message) return `${error.type ? `${error.type}: ` : ""}${error.message}`;
  }
  return `AI API gagal dengan status ${status}.`;
}

export async function askGroq(asset: ScoringAsset, score: ScoreResult): Promise<GroqResult> {
  let apiKey = process.env.GROQ_API_KEY;
  let baseUrl = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  let model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const anthropicVersion = process.env.GROQ_ANTHROPIC_VERSION || "2023-06-01";

  let maxTokens = Number(process.env.GROQ_MAX_TOKENS || 2048);
  let timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 120000); // default to 120s for local Ollama
  let temperature = 0.3;
  let modelStyle = "FORMAL";

  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: "ai" } });
    if (row && row.value && typeof row.value === "object") {
      const val = row.value as any;
      if (val.apiTimeoutSeconds) timeoutMs = val.apiTimeoutSeconds * 1000;
      if (val.maxTokens) maxTokens = val.maxTokens;
      if (typeof val.temperature === "number") temperature = val.temperature;
      if (val.systemPromptStyle) modelStyle = val.systemPromptStyle;
      if (val.apiKey) apiKey = val.apiKey;
      if (val.baseUrl) baseUrl = val.baseUrl;
      if (val.defaultModel) model = val.defaultModel;
    }
  } catch {
    // ignore database errors on bootstrap
  }

  if (!apiKey || apiKey.includes("isi_api_key")) {
    if (!baseUrl.includes("11434")) {
      return { ok: false, error: "API Key belum diisi di Pengaturan > AI." };
    }
  }

  const simplifiedAsset = {
    kode: asset.assetCode,
    nama: asset.assetName,
    kategori: (asset as any).category?.name || (asset as any).category || "Umum",
    umurTahun: asset.purchaseDate ? new Date().getFullYear() - new Date(asset.purchaseDate).getFullYear() : 0,
    spesifikasi: {
      processor: asset.processor || "-",
      ram: asset.ram || "-",
      storage: asset.storage || "-",
      os: asset.operatingSystem || "-",
    },
    kondisi: asset.conditionStatus,
    lifecycle: asset.lifecycleStatus,
    garansiAktif: asset.warrantyEndDate ? new Date(asset.warrantyEndDate).getTime() > Date.now() : false,
    riwayatPerbaikan: {
      jumlah: asset.serviceRecords?.length || 0,
      totalBiaya: (asset.serviceRecords || []).reduce((sum, r) => sum + Number(r.cost || 0), 0)
    }
  };

  const prompt = `
Anda adalah AI Assistant IT Asset Management. Tugas Anda adalah memberikan analisis teknis berdasarkan evaluasi data.

DATA ASET:
- Kode/Nama: ${simplifiedAsset.kode} / ${simplifiedAsset.nama}
- Umur: ${simplifiedAsset.umurTahun} tahun
- Kondisi: ${simplifiedAsset.kondisi}
- Perbaikan: ${simplifiedAsset.riwayatPerbaikan.jumlah} kali (Total Rp${simplifiedAsset.riwayatPerbaikan.totalBiaya})
- Hardware: RAM ${simplifiedAsset.spesifikasi.ram}, Storage ${simplifiedAsset.spesifikasi.storage}

EVALUASI TEKNIS:
- Tingkat Risiko: ${score.score}/100
- Aksi Disarankan: ${score.recommendationTypes.join(", ")}
- Prioritas: ${score.priority}
- Alasan Teknis Utama: ${score.details.join("; ")}

INSTRUKSI OUTPUT (WAJIB JSON STRICT):
Buatlah narasi profesional tanpa menyebut "rule engine". Kembalikan HANYA format JSON valid tanpa text pembuka/penutup, tanpa markdown block.
{
  "summary": "Ringkasan 1 kalimat kondisi teknis aset.",
  "recommendation": "Tuliskan rekomendasi tindakan teknis yang sejalan dengan Aksi Disarankan di atas.",
  "priority": "${score.priority}",
  "recommendedActions": ${JSON.stringify(score.recommendationTypes)},
  "reason": "Penjelasan logis 2-3 kalimat mengapa direkomendasikan (sebutkan spesifikasi, umur, atau riwayat perbaikan).",
  "nextYearPlan": "Saran perlakuan aset 1 tahun ke depan."
}
`;

  const isOllamaFormat = baseUrl.includes("11434");
  const isOpenAiFormat = !isOllamaFormat && (baseUrl.includes("openai") || baseUrl.includes("groq") || baseUrl.includes("/v1"));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 20000);
    
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey || ""}`,
      "Content-Type": "application/json"
    };
    
    if (!isOpenAiFormat && !isOllamaFormat) {
      headers["X-Api-Key"] = apiKey || "";
      headers["anthropic-version"] = anthropicVersion;
    }

    const systemMessage = modelStyle === "DETAILED"
      ? "Anda menjawab sebagai AI Decision Support ASCIT dalam bahasa Indonesia teknis, mendalam, dan analitis."
      : modelStyle === "CONCISE"
      ? "Anda menjawab sebagai AI Decision Support ASCIT dalam bahasa Indonesia yang ringkas, to-the-point, dan informatif."
      : "Anda menjawab sebagai AI Decision Support ASCIT dalam bahasa Indonesia formal.";

    const body = isOllamaFormat ? {
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      stream: false,
      format: "json",
      options: {
        temperature: Number.isFinite(temperature) ? temperature : 0.3,
        num_predict: Number.isFinite(maxTokens) ? maxTokens : 1024
      }
    } : isOpenAiFormat ? {
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      max_tokens: Number.isFinite(maxTokens) ? maxTokens : 1024,
      temperature: Number.isFinite(temperature) ? temperature : 0.3,
      response_format: { type: "json_object" }
    } : {
      model,
      max_tokens: Number.isFinite(maxTokens) ? maxTokens : 1024,
      system: systemMessage,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: Number.isFinite(temperature) ? temperature : 0.3
    };

    const response = await fetch(messagesEndpoint(baseUrl), {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify(body)
    });
    clearTimeout(timeout);

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return { ok: false, error: errorMessage(response.status, payload) };
    }

    const content = extractMessageText(payload);
    if (!content) {
      return { ok: false, error: "AI API tidak mengembalikan konten." };
    }

    return { ok: true, data: parseGroqExplanation(content, asset, score) };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: `AI timeout setelah ${Number.isFinite(timeoutMs) ? timeoutMs : 20000} ms.` };
    }
    return { ok: false, error: error instanceof Error ? error.message : "AI API gagal dipanggil." };
  }
}
