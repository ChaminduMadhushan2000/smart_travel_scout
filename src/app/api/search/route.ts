import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { travelPackages, VALID_IDS } from "@/lib/data";

// ---------------------------------------------------------------------------
// Request schema — validates the incoming POST body before we touch the LLM.
// ---------------------------------------------------------------------------
const RequestSchema = z.object({
  query: z
    .string()
    .min(1, "Query must not be empty")
    .max(500, "Query must be 500 characters or fewer"),
});

// ---------------------------------------------------------------------------
// Response schemas — the LLM must return exactly this shape.
// The `id` refine ensures no fabricated IDs slip through.
// ---------------------------------------------------------------------------
const MatchSchema = z.object({
  id: z
    .number()
    .int()
    .refine((id) => VALID_IDS.has(id), {
      message: "ID does not exist in the inventory",
    }),
  reason: z
    .string()
    .min(1)
    .max(200, "Reason must be 200 characters or fewer"),
});

const AIResponseSchema = z.object({
  matches: z
    .array(MatchSchema)
    .max(5, "Cannot return more than 5 matches"),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

// ---------------------------------------------------------------------------
// System prompt — strictly grounds the model to our inventory with a
// scoring rubric so the LLM ranks deterministically.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a travel-matching assistant. Your ONLY job is to match the user's natural-language travel request to items from the INVENTORY below.

INVENTORY (JSON):
${JSON.stringify(travelPackages, null, 2)}

MATCHING RUBRIC — score each item and return only those with a positive score:
• Tag overlap: +3 per matching tag
• Price fit: +2 if the item's price is within the user's stated budget (or ±20% if no budget stated)
• Location preference: +2 if the user mentions the destination
• Vibe alignment: +1 if the overall mood matches (e.g. "chill" → beach tags)

RULES — you MUST follow every rule:
1. Return ONLY items whose "id" exists in the INVENTORY above. NEVER invent, fabricate, or suggest any destination, title, or id not listed.
2. Rank results by descending score.
3. If no item scores positively, return an empty "matches" array.
4. For each match, write a concise "reason" (≤ 200 chars) citing the specific tags, price, or location that earned the score.
5. Return at most 5 matches.

Respond with ONLY valid JSON — no markdown, no code fences, no extra text:
{
  "matches": [
    { "id": <number>, "reason": "<string>" }
  ]
}`;

// ---------------------------------------------------------------------------
// POST /api/search
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // 0. Ensure API key is available at runtime
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error: missing API key." },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey });

    // 1. Parse & validate the incoming request body with Zod
    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid request body.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const userQuery = parsed.data.query.trim();

    // 2. Call the LLM — low temperature keeps answers deterministic
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userQuery },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    // 3. Parse JSON from LLM response
    let llmJson: unknown;
    try {
      llmJson = JSON.parse(raw);
    } catch {
      console.error("[search] LLM returned non-JSON:", raw);
      return NextResponse.json(
        { error: "AI returned an invalid response. Please try again." },
        { status: 502 },
      );
    }

    // 4. Validate strict schema — rejects any unknown / fabricated IDs
    const validated = AIResponseSchema.safeParse(llmJson);

    if (!validated.success) {
      console.error("[search] Zod validation failed:", validated.error.flatten());
      return NextResponse.json(
        { error: "AI response did not match the expected schema." },
        { status: 502 },
      );
    }

    // 5. Post-processing: belt-and-suspenders filter on known IDs
    const safeMatches = validated.data.matches.filter((m) =>
      VALID_IDS.has(m.id),
    );

    return NextResponse.json({ matches: safeMatches });
  } catch (err: unknown) {
    // Catch-all — surface a safe message, log the full error server-side
    console.error("[search] Unhandled error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
