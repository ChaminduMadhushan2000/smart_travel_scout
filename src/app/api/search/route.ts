import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { travelPackages, packageById, VALID_IDS } from "@/lib/data";

// --- constants ---

const MAX_QUERY_LENGTH = 500;
const LLM_TIMEOUT_MS = 15_000; // 15 sec timeout for gemini
const CACHE_TTL_MS = 5 * 60_000; // cache same queries for 5 mins to save API calls

// --- simple rate limiter (10 requests per minute per IP) ---

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

// --- prompt cache ---
// if someone searches the same thing again we just return the cached result
// instead of calling the AI again (saves tokens and money)

interface CacheEntry {
  data: { matches: Array<{ id: number; reason: string }> };
  expiresAt: number;
}

const promptCache = new Map<string, CacheEntry>();

function getCached(query: string): CacheEntry["data"] | null {
  const key = query.toLowerCase().trim();
  const entry = promptCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    promptCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(query: string, data: CacheEntry["data"]): void {
  const key = query.toLowerCase().trim();
  promptCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// --- keyword shortcut ---
// for simple one-word queries like "beaches" or "culture" we can match
// directly against the tags without bothering the AI at all

const TAG_KEYWORD_MAP: Record<string, string[]> = {
  beaches: ["beach"],
  beach: ["beach"],
  nature: ["nature"],
  culture: ["culture", "history"],
  adventure: ["adventure"],
  hiking: ["hiking"],
  surfing: ["surfing"],
  history: ["history", "culture"],
  wildlife: ["animals"],
  safari: ["animals"],
  photography: ["photography"],
  climbing: ["climbing"],
  walking: ["walking"],
};

function tryKeywordMatch(query: string): Array<{ id: number; reason: string }> | null {
  const lower = query.toLowerCase().trim();
  const tags = TAG_KEYWORD_MAP[lower];
  if (!tags) return null;

  const matches: Array<{ id: number; reason: string }> = [];
  for (const pkg of travelPackages) {
    const overlap = pkg.tags.filter((t) => tags.includes(t));
    if (overlap.length > 0) {
      matches.push({
        id: pkg.id,
        reason: `Matched '${overlap.join("', '")}' tag${overlap.length > 1 ? "s" : ""}.`,
      });
    }
  }
  return matches;
}

// --- zod schemas for validating request and AI response ---

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

// types used by the frontend too

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

// --- system prompt for gemini ---
// we send the full inventory in the prompt so the AI is grounded to real data
// it only returns IDs and reasons, we look up the rest server-side

const SYSTEM_PROMPT = `You are a strict travel-matching assistant. Match the user query to INVENTORY items ONLY.

INVENTORY:
${JSON.stringify(travelPackages)}

TAG MAP: hike→hiking, surf→surfing, wildlife/safari→animals, photo→photography, climb→climbing, walk→walking, chill→young-vibe, cheap/budget/affordable→under $60, expensive/luxury/premium→$200+.

RELATED TAGS: culture↔history↔walking | nature↔hiking↔cold↔view | beach↔surfing↔young-vibe | adventure↔animals↔photography | climbing↔hiking↔view.

HARD CONSTRAINTS (all must pass):
- Budget: item price must be STRICTLY within budget. $120 does NOT match "under $100".
- Location: if user names a place, only items at that place.

SCORING (among passing items): +3 exact tag, +2 related tag, +1 vibe.
- Items MUST have ≥1 matching/related tag UNLESS the query is budget-only (e.g. "under $100"), in which case return ALL within budget.

RULES:
1. Only return IDs from INVENTORY. Never invent.
2. Empty "matches" if nothing passes hard constraints.
3. Max 5 results, ranked by score.
4. Each "reason" ≤200 chars, explain which constraints matched.

Respond ONLY with valid JSON: {"matches":[{"id":<number>,"reason":"<string>"}]}`;


// --- budget parsing helpers ---
// figures out if the user mentioned a budget like "under $100" or "cheap"
// we use this server-side too as a safety net in case the AI ignores the budget

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

// checks if user wants expensive/luxury stuff (returns $200 as minimum price)
function wantsExpensive(query: string): number | null {
  const lower = query.toLowerCase();
  if (/\b(expensive|luxury|luxurious|premium|high[- ]?end|splurge)\b/.test(lower)) {
    return 200;
  }
  return null;
}

// --- main POST handler ---
// flow: rate limit -> validate -> check cache -> try keyword shortcut ->
// call gemini -> validate response with zod -> filter by budget -> return

export async function POST(req: NextRequest) {
  // 1. check rate limit
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  try {
    // 2. make sure API key is set
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error — the AI service isn't set up yet." },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 3. parse and validate the request body with zod
    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid request body.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const userQuery = parsed.data.query;

    // 4. check if we already have this query cached
    const cached = getCached(userQuery);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 5. if its a simple keyword like "beaches", skip the AI entirely
    const keywordResult = tryKeywordMatch(userQuery);
    if (keywordResult) {
      // still apply budget filter even for keyword matches
      const budgetCeiling = extractBudget(userQuery);
      const budgetFloor = wantsExpensive(userQuery);
      let filtered = keywordResult;
      if (budgetCeiling !== null) {
        filtered = keywordResult.filter((m) => {
          const pkg = packageById.get(m.id);
          return pkg !== undefined && pkg.price <= budgetCeiling;
        });
      } else if (budgetFloor !== null) {
        filtered = keywordResult.filter((m) => {
          const pkg = packageById.get(m.id);
          return pkg !== undefined && pkg.price >= budgetFloor;
        });
      }
      const response = { matches: filtered };
      setCache(userQuery, response);
      return NextResponse.json(response);
    }

    // 6. call gemini AI with a timeout so it doesnt hang forever
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

    // 7. parse the AI's JSON response and validate with zod
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

    // 8. double check budget on our side too (don't fully trust the AI)
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

    // 9. if no results, give the user a helpful hint
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

    // 10. all good - cache it and send back the results
    const successResponse = { matches: filteredMatches };
    setCache(userQuery, successResponse);
    return NextResponse.json(successResponse);
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