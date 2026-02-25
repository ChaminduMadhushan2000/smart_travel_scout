import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from "zod";
import { travelPackages, VALID_IDS } from "@/lib/data";

const MAX_QUERY_LENGTH = 500;
const LLM_TIMEOUT_MS = 15_000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 10;

  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= maxRequests) return true;

  entry.count++;
  return false;
}

const RequestSchema = z.object({
  query: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Please describe the kind of trip you're looking for.")
        .max(MAX_QUERY_LENGTH, `Query must be ${MAX_QUERY_LENGTH} characters or fewer.`),
    ),
});

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

export type SearchRequest = {
  query: string;
};

export type SearchResponse = {
  matches: Array<{ id: number; reason: string }>;
  hint?: string;
};

export type SearchErrorResponse = {
  error: string;
};

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

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error — the AI service isn't set up yet." },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid request body.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const userQuery = parsed.data.query;

    let responseText = "";
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      });

      const resultPromise = model.generateContent(userQuery);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          const err = new Error("LLM request timed out");
          err.name = "AbortError";
          reject(err);
        }, LLM_TIMEOUT_MS);
      });

      const result = await Promise.race([resultPromise, timeoutPromise]);
      responseText = result.response.text();
    } catch (err) {
      const isTimeout =
        err instanceof Error && err.name === "AbortError";
      console.error("[search] LLM call failed:", err);
      return NextResponse.json(
        {
          error: isTimeout
            ? "The AI took too long to respond. Please try a simpler query."
            : "Could not reach the AI service right now. Please try again shortly.",
        },
        { status: 502 },
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    let llmJson: unknown;
    try {
      llmJson = JSON.parse(responseText);
    } catch {
      console.error("[search] LLM returned non-JSON:", responseText);
      return NextResponse.json(
        { error: "The AI returned something unexpected. Please try rephrasing your query." },
        { status: 502 },
      );
    }

    const validated = AIResponseSchema.safeParse(llmJson);

    if (!validated.success) {
      console.error(
        "[search] Zod validation failed:",
        validated.error.flatten(),
      );
      return NextResponse.json(
        { error: "The AI response didn't match our expected format. Please try again." },
        { status: 502 },
      );
    }

    const safeMatches = validated.data.matches.filter((m) =>
      VALID_IDS.has(m.id),
    );

    if (safeMatches.length === 0) {
      const budgetMatch = userQuery.match(/under\s*\$?(\d+)/i);
      if (budgetMatch) {
        const budget = parseInt(budgetMatch[1], 10);
        const cheapest = Math.min(...travelPackages.map((p) => p.price));
        if (budget < cheapest) {
          return NextResponse.json({
            matches: [],
            hint: `No experiences match a budget of $${budget}. Our most affordable option starts at $${cheapest}. Try increasing your budget.`,
          });
        }
      }

      const conflictPairs: [string[], string[]][] = [
        [["beach", "surf", "coast", "ocean"], ["cold", "mountain", "snow", "highland"]],
        [["surfing", "diving", "snorkel"], ["climbing", "hiking", "trek"]],
      ];
      const lower = userQuery.toLowerCase();
      for (const [groupA, groupB] of conflictPairs) {
        const hasA = groupA.some((t) => lower.includes(t));
        const hasB = groupB.some((t) => lower.includes(t));
        if (hasA && hasB) {
          return NextResponse.json({
            matches: [],
            hint: "Your request combines things that don\u2019t overlap in our collection. Try focusing on one vibe or activity.",
          });
        }
      }
    }

    return NextResponse.json({ matches: safeMatches });
  } catch (err: unknown) {
    console.error("[search] Unhandled error:", err);

    const isFetchError =
      err instanceof TypeError && /fetch/i.test(err.message);

    const message = isFetchError
      ? "Unable to connect to the AI service. Please check your network."
      : "Something unexpected went wrong. Please try again.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}