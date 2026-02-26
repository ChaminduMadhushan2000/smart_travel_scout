import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from "zod";
import { travelPackages, packageById, VALID_IDS } from "@/lib/data";

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

const SYSTEM_PROMPT = `You are a strict travel-matching assistant. Your ONLY job is to match the user's natural-language travel request to items from the INVENTORY below.

INVENTORY (JSON):
${JSON.stringify(travelPackages, null, 2)}

STEP 1 — EXTRACT CONSTRAINTS from the user query:
• Budget: Look for phrases like "under $X", "below $X", "less than $X", "within $X", "cheap", "budget", "affordable", "expensive", "luxury", "premium".
  - "cheap"/"budget"/"affordable" → treat as under $60
  - "expensive"/"luxury"/"premium" → treat as $200+
• Tags/activities: Map user words to inventory tags (e.g. "hike"→"hiking", "beach"→"beach", "culture"→"culture", "history"→"history", "adventure"→"adventure", "surf"→"surfing", "wildlife"/"safari"→"animals", "photo"→"photography", "climb"→"climbing", "walk"→"walking", "chill"→"young-vibe", "nature"→"nature", "cold"→"cold", "view"→"view")
• Location: Check if user mentions a specific destination.

RELATED TAG GROUPS (treat these as related when scoring vibe):
• "culture" ↔ "history" ↔ "walking" (cultural exploration)
• "nature" ↔ "hiking" ↔ "cold" ↔ "view" (outdoor/nature)
• "beach" ↔ "surfing" ↔ "young-vibe" (coastal/relaxation)
• "adventure" ↔ "animals" ↔ "photography" (thrill/safari)
• "climbing" ↔ "hiking" ↔ "view" (active exploration)

STEP 2 — HARD CONSTRAINTS (must ALL be satisfied, no exceptions):
• If the user specifies a budget, ONLY include items whose price is STRICTLY within that budget. An item priced $120 DOES NOT match "under $10" or "under $100". This is non-negotiable.
• If the user mentions a specific location, ONLY include items at that location.

STEP 3 — SOFT SCORING (among items that pass ALL hard constraints):
• Tag overlap: +3 per matching tag (exact match)
• Related tag: +2 if the item has a tag in the same related group as the user's request
• Vibe alignment: +1 if the overall mood matches

IMPORTANT: An item MUST have at least ONE matching or related tag to be included. Do NOT return items that only match on price but have zero tag or vibe relevance.

RULES — you MUST follow every rule:
1. Return ONLY items whose "id" exists in the INVENTORY above. NEVER invent, fabricate, or suggest any destination, title, or id not listed.
2. An item MUST pass ALL hard constraints to be included. NO EXCEPTIONS.
3. If NO item passes all hard constraints, return an empty "matches" array. Do NOT relax constraints.
4. Rank passing items by descending soft score.
5. For each match, write a concise "reason" (≤ 200 chars) that explains WHICH constraints were checked and HOW this item satisfies them (e.g. "Matches 'hiking' tag, price ($120) is within budget.").
6. Return at most 5 matches.

Respond with ONLY valid JSON — no markdown, no code fences, no extra text:
{
  "matches": [
    { "id": <number>, "reason": "<string>" }
  ]
}`;


function extractBudget(query: string): number | null {
  const lower = query.toLowerCase();

  const explicitMatch = lower.match(
    /(?:under|below|less\s+than|within|up\s+to|max(?:imum)?)\s*\$?\s*(\d+)/
  );
  if (explicitMatch) {
    return parseInt(explicitMatch[1], 10);
  }

  const suffixMatch = lower.match(/\$\s*(\d+)\s*(?:or\s+(?:less|under|below)|max(?:imum)?)/);
  if (suffixMatch) {
    return parseInt(suffixMatch[1], 10);
  }

  if (/\b(cheap|budget|affordable|low[- ]?cost|inexpensive)\b/.test(lower)) {
    return 60;
  }

  return null;
}


function wantsExpensive(query: string): number | null {
  const lower = query.toLowerCase();
  if (/\b(expensive|luxury|luxurious|premium|high[- ]?end|splurge)\b/.test(lower)) {
    return 200;
  }
  return null;
}

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
      const isRateLimit =
        err instanceof Error && /429/i.test(err.message);
      console.error("[search] LLM call failed:", err);
      if (isRateLimit) {
        return NextResponse.json(
          { error: "You are searching too fast! Please wait 60 seconds and try again." },
          { status: 429 },
        );
      }
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

    const budgetCeiling = extractBudget(userQuery);
    const budgetFloor = wantsExpensive(userQuery);
    let filteredMatches = safeMatches;

    if (budgetCeiling !== null) {
      filteredMatches = safeMatches.filter((m) => {
        const pkg = packageById.get(m.id);
        return pkg !== undefined && pkg.price <= budgetCeiling;
      });
    } else if (budgetFloor !== null) {
      filteredMatches = safeMatches.filter((m) => {
        const pkg = packageById.get(m.id);
        return pkg !== undefined && pkg.price >= budgetFloor;
      });
    }

    if (filteredMatches.length === 0) {
      let hint: string | undefined;

      if (budgetCeiling !== null) {
        const withinBudget = travelPackages.filter((p) => p.price <= budgetCeiling);
        if (withinBudget.length === 0) {
          const cheapest = Math.min(...travelPackages.map((p) => p.price));
          hint = `No experiences fit a $${budgetCeiling} budget. Our most affordable option starts at $${cheapest}. Try increasing your budget.`;
        } else {
          hint = `No experiences match all your criteria within $${budgetCeiling}. ${withinBudget.length} option${withinBudget.length > 1 ? "s" : ""} exist${withinBudget.length === 1 ? "s" : ""} in that price range — try broadening your interests.`;
        }
      } else if (budgetFloor !== null) {
        const aboveFloor = travelPackages.filter((p) => p.price >= budgetFloor);
        if (aboveFloor.length === 0) {
          hint = `No experiences are priced at $${budgetFloor}+. Try lowering your expectations or exploring mid-range options.`;
        } else {
          hint = `No experiences match your criteria at the $${budgetFloor}+ price point. Try broadening your interests.`;
        }
      } else {
        const conflictPairs: [string[], string[]][] = [
          [["beach", "surf", "coast", "ocean"], ["cold", "mountain", "snow", "highland"]],
          [["surfing", "diving", "snorkel"], ["climbing", "hiking", "trek"]],
        ];
        const lower = userQuery.toLowerCase();
        for (const [groupA, groupB] of conflictPairs) {
          const hasA = groupA.some((t) => lower.includes(t));
          const hasB = groupB.some((t) => lower.includes(t));
          if (hasA && hasB) {
            hint = "Your request combines things that don\u2019t overlap in our collection. Try focusing on one vibe or activity.";
            break;
          }
        }
      }

      return NextResponse.json({ matches: [], ...(hint ? { hint } : {}) });
    }

    return NextResponse.json({ matches: filteredMatches });
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