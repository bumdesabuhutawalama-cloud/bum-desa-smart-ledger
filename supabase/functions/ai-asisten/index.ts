// AI Asisten — menerima pesan user + konteks (unit aktif, daftar template, daftar akun, daftar unit)
// dan mengembalikan struktur "intent" yang siap dipreview di UI sebelum diposting.
//
// Tidak melakukan side-effect ke DB. UI yang menjalankan posting setelah user menekan tombol konfirmasi.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ error: "LOVABLE_API_KEY tidak terkonfigurasi" }, 500);
    }

    const body = await req.json();
    const messages: ChatMessage[] = body.messages ?? [];
    const ctx = body.context ?? {};

    const system = buildSystemPrompt(ctx);

    const tools = [
      {
        type: "function",
        function: {
          name: "draft_kegiatan",
          description:
            "Buat draf transaksi via TEMPLATE KEGIATAN. Gunakan ini untuk pencatatan rutin (penjualan, pembelian, pencairan/angsuran pinjaman, penyertaan, dll). Sistem akan auto-generate jurnal double-entry dari template. Selalu pakai cara ini bila ada template yang cocok.",
          parameters: {
            type: "object",
            properties: {
              template_code: { type: "string", description: "Kode template yang dipakai (lihat daftar TEMPLATES)." },
              business_unit_id: { type: "string", description: "ID unit usaha. Boleh kosong → pakai unit aktif." },
              values: {
                type: "object",
                description:
                  "Pasangan key→value untuk field template. Tanggal format YYYY-MM-DD. Angka berupa number, bukan string.",
                additionalProperties: true,
              },
              ringkasan: { type: "string", description: "Penjelasan singkat 1 kalimat untuk user." },
            },
            required: ["template_code", "values", "ringkasan"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "draft_jurnal_manual",
          description:
            "Buat draf jurnal MANUAL multi-baris. Pakai ini bila tidak ada template yang cocok. WAJIB total debit = total kredit, minimal 2 baris.",
          parameters: {
            type: "object",
            properties: {
              tanggal: { type: "string", description: "YYYY-MM-DD" },
              keterangan: { type: "string" },
              business_unit_id: { type: "string" },
              lines: {
                type: "array",
                minItems: 2,
                items: {
                  type: "object",
                  properties: {
                    account_kode: { type: "string", description: "Kode akun (contoh: 1.1.01.01)." },
                    debit: { type: "number" },
                    kredit: { type: "number" },
                    keterangan: { type: "string" },
                  },
                  required: ["account_kode", "debit", "kredit"],
                  additionalProperties: false,
                },
              },
              ringkasan: { type: "string" },
            },
            required: ["tanggal", "keterangan", "lines", "ringkasan"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "answer",
          description: "Jawab pertanyaan user atau minta klarifikasi. Pakai bila tidak perlu membuat draf transaksi.",
          parameters: {
            type: "object",
            properties: {
              text: { type: "string", description: "Jawaban dalam Bahasa Indonesia, ringkas dan jelas." },
              perlu_klarifikasi: { type: "boolean" },
            },
            required: ["text"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limit. Coba lagi sebentar." }, 429);
      if (aiResp.status === 402) return json({ error: "Kredit AI habis. Tambah kredit di Workspace." }, 402);
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ error: "AI Gateway error" }, 500);
    }

    const data = await aiResp.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    let action: any = { kind: "answer", text: msg?.content || "Maaf, saya tidak dapat memproses." };

    const toolCalls = msg?.tool_calls ?? [];
    if (toolCalls.length > 0) {
      const tc = toolCalls[0];
      const fn = tc.function?.name;
      let args: any = {};
      try {
        args = JSON.parse(tc.function?.arguments || "{}");
      } catch (e) {
        console.error("Tool args parse error", e);
      }
      if (fn === "draft_kegiatan") action = { kind: "draft_kegiatan", ...args };
      else if (fn === "draft_jurnal_manual") action = { kind: "draft_jurnal_manual", ...args };
      else if (fn === "answer") action = { kind: "answer", text: args.text };
    }

    return json({ action, raw_text: msg?.content ?? "" });
  } catch (e) {
    console.error("ai-asisten error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(ctx: any): string {
  const today = new Date().toISOString().slice(0, 10);
  const unit = ctx.active_unit;
  const units = ctx.units ?? [];
  const templates = ctx.templates ?? [];
  const accounts = ctx.accounts ?? [];

  const unitsList = units
    .map((u: any) => `- ${u.id} | ${u.kode} — ${u.nama} (jenis: ${u.jenis})${u.is_default ? " [DEFAULT]" : ""}`)
    .join("\n");

  const tplList = templates
    .map((t: any) => {
      const fields = (t.fields || [])
        .map((f: any) => `${f.key}:${f.type}${f.required ? "*" : ""}`)
        .join(", ");
      return `- ${t.code} | ${t.name} (jenis: ${t.business_type}) — fields: ${fields}\n  ${t.description ?? ""}`;
    })
    .join("\n");

  const accList = accounts
    .slice(0, 200)
    .map((a: any) => `- ${a.kode_akun} ${a.nama_akun} [${a.tipe_akun}]`)
    .join("\n");

  return `Anda adalah AI Asisten Akuntansi BUM Desa. Bahasa: Indonesia, ringkas.
Tanggal hari ini: ${today}.

ATURAN:
1. Jika user minta mencatat transaksi → SELALU pakai template (draft_kegiatan) bila ada yang cocok. Pakai draft_jurnal_manual hanya bila tidak ada template yang sesuai.
2. JANGAN pernah eksekusi langsung. Anda hanya membuat DRAFT — user yang konfirmasi.
3. Kalau ada field wajib yang tidak disebut user, gunakan asumsi wajar (misal tanggal=hari ini, akun_kas=kas tunai utama). Jelaskan asumsi di "ringkasan".
4. Untuk angka, parse dari kalimat user (misal "5 juta" → 5000000, "Rp 250.000" → 250000).
5. Bila user menyebut nama unit usaha (mis. "PAM", "simpan pinjam"), set business_unit_id sesuai daftar UNITS. Bila tidak menyebut → kosongkan, sistem pakai unit aktif.
6. Bila informasi terlalu kurang dan asumsi tidak masuk akal → pakai "answer" dengan perlu_klarifikasi=true dan tanyakan secukupnya.
7. Untuk pertanyaan laporan/saldo → pakai "answer" dengan jawaban informatif.

KONTEKS:
Unit aktif: ${unit ? `${unit.kode} — ${unit.nama} (jenis: ${unit.jenis})` : "ALL (konsolidasi)"}.

DAFTAR UNIT USAHA:
${unitsList || "(belum ada)"}

DAFTAR TEMPLATE KEGIATAN (gunakan field key persis):
${tplList || "(tidak ada template)"}

DAFTAR AKUN (kode | nama | tipe), gunakan kode akun untuk draft_jurnal_manual:
${accList || "(tidak ada akun)"}
`;
}
