import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const SYSTEM_PROMPT = `Anda adalah ASCIT Assistant, asisten AI khusus inventaris dan manajemen aset IT untuk rumah sakit.

ATURAN KETAT:
1. Anda HANYA boleh menjawab pertanyaan seputar:
   - Inventaris aset IT (komputer, laptop, printer, server, router, switch, UPS, monitor, dll)
   - Manajemen siklus hidup aset (pembelian, mutasi, perbaikan, penghapusan)
   - Spesifikasi hardware dan rekomendasi upgrade
   - Garansi, maintenance, dan service record
   - Evaluasi kondisi aset (scoring, prioritas penggantian, upgrade)
   - Kebijakan IT asset management di lingkungan rumah sakit
   - Tips perawatan perangkat IT
   - Analisis biaya perbaikan vs penggantian

2. Jika pengguna bertanya di LUAR topik inventaris IT, tolak dengan sopan:
   "Maaf, saya hanya bisa membantu pertanyaan seputar inventaris dan manajemen aset IT. Silakan ajukan pertanyaan terkait aset IT Anda."

3. Jawab dalam bahasa Indonesia, ringkas, profesional, dan informatif.
4. Jangan pernah memberikan kode program, SQL query, atau informasi teknis sistem internal.
5. Jika ditanya soal ringkasan atau statistik aset, gunakan referensi data sistem saat ini yang diberikan di bawah. Jika ditanya soal data spesifik per aset, arahkan untuk melihat halaman Data Aset IT.`;

async function buildSystemContext(): Promise<string> {
  try {
    const [totalAssets, totalUnits, totalServiceRecords, assetsRusak, catCounts, categories] = await Promise.all([
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.unit.count(),
      prisma.serviceRecord.count(),
      prisma.asset.count({
        where: { deletedAt: null, conditionStatus: { in: ["RUSAK_BERAT", "LAYAK_GANTI"] } }
      }),
      prisma.asset.groupBy({
        by: ["categoryId"],
        where: { deletedAt: null },
        _count: true
      }),
      prisma.assetCategory.findMany({ select: { id: true, name: true } })
    ]);

    const catMap = new Map(categories.map(c => [c.id, c.name]));
    const catSummary = catCounts
      .filter(c => c._count > 0)
      .map(c => `- ${catMap.get(c.categoryId) || c.categoryId}: ${c._count} unit`)
      .join("\n");

    return `\n\n=== DATA SISTEM ASCIT SAAT INI (REAL-TIME) ===
Total aset terdaftar: ${totalAssets} unit
Total unit/departemen: ${totalUnits} unit
Total riwayat perbaikan/maintenance: ${totalServiceRecords} catatan
Aset kondisi Rusak Berat/Layak Ganti: ${assetsRusak} unit

Kategori Aset:
${catSummary}
PENTING: Gunakan data di atas HANYA jika pengguna menanyakan jumlah, ringkasan, atau statistik sistem saat ini.`;
  } catch {
    return "";
  }
}

async function getAiConfig() {
  let baseUrl = "http://172.17.0.1:11434/api";
  let model = "qwen2.5:1.5b";
  let timeoutMs = 60000;
  let temperature = 0.4;

  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: "ai" } });
    if (row && row.value && typeof row.value === "object") {
      const val = row.value as any;
      if (val.baseUrl) baseUrl = val.baseUrl;
      if (val.defaultModel) model = val.defaultModel;
      if (val.apiTimeoutSeconds) timeoutMs = val.apiTimeoutSeconds * 1000;
      if (typeof val.temperature === "number") temperature = val.temperature;
    }
  } catch {
    // fallback to defaults
  }
  return { baseUrl, model, timeoutMs, temperature };
}

function chatEndpoint(baseUrl: string) {
  if (baseUrl.includes("11434")) return `${baseUrl.replace(/\/$/, "")}/chat`;
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userKey = String((session.user as { id?: string }).id || session.user?.email || "unknown");
  const limit = checkRateLimit(`ai-chat:${userKey}`, 20, 5 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak pesan. Silakan coba kembali nanti." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await request.json();
  const messages: Array<{ role: string; content: string }> = body.messages;

  if (!messages?.length) {
    return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
  }

  const config = await getAiConfig();
  const isOllama = config.baseUrl.includes("11434");

  const dbContext = await buildSystemContext();
  const finalSystemPrompt = SYSTEM_PROMPT + dbContext;

  const fullMessages = [
    { role: "system", content: finalSystemPrompt },
    ...messages.slice(-10) // ponytail: cap history to 10 messages to keep context window manageable for 1.5B model
  ];

  const payload = isOllama
    ? {
        model: config.model,
        messages: fullMessages,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: 512
        }
      }
    : {
        model: config.model,
        messages: fullMessages,
        max_tokens: 512,
        temperature: config.temperature
      };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    const response = await fetch(chatEndpoint(config.baseUrl), {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `AI gagal merespons (${response.status}). ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const result = await response.json();

    // ponytail: Ollama returns message.content, OpenAI returns choices[0].message.content
    const content =
      result.message?.content?.trim() ||
      result.choices?.[0]?.message?.content?.trim() ||
      "Maaf, AI tidak memberikan respons.";

    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "AI timeout, coba lagi." }, { status: 504 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghubungi AI." },
      { status: 500 }
    );
  }
}
