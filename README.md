# Smart Travel Scout

AI-powered travel experience finder for Sri Lanka. Type a natural-language request and get matched experiences from a curated inventory using Gemini AI.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Google Gemini AI API
- Zod schema validation
- Tailwind CSS

## How to Run Locally

1. Clone the repository

   ```bash
   git clone https://github.com/ChaminduMadhushan2000/smart_travel_scout.git
   cd smart-travel-scout
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up environment variables

   Create a `.env.local` file in the project root:

   ```bash
   echo GEMINI_API_KEY=your_key_here > .env.local
   ```

   Replace `your_key_here` with your Gemini API key from https://aistudio.google.com

4. Run the development server

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable         | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `GEMINI_API_KEY` | Your Google Gemini API key from https://aistudio.google.com |

## Live Demo

https://smart-travel-scout-theta.vercel.app/

---

## Answer Submission

### 1. The "Under the Hood" Moment

I originally built the API route using OpenAI's gpt-4o-mini model, but later
switched to Google's Gemini API. When I made the switch, the Gemini model kept
returning its JSON wrapped in markdown code fences (`json ... `) even though
my system prompt said "Respond with ONLY valid JSON — no markdown, no code fences."

This caused JSON.parse() to throw on every response, so users just saw
"The AI returned something unexpected."

**How I debugged it:**
I added console.error logging of the raw responseText and saw the code fences
in the server terminal. My first fix was regex stripping, but that felt fragile.

**The solution:**
I discovered Gemini's generationConfig accepts `responseMimeType: "application/json"`,
which forces structured JSON natively — no code fences. One config option fixed
everything, and I removed the regex workaround.

### 2. The Scalability Thought

If this app had 50,000 travel packages instead of 5, passing the full inventory to the LLM would be too expensive and imprecise. Here is how the approach would change:

- **Pre-computed embeddings** -- Generate an embedding vector for every inventory item using its title, tags, and location as input text.
- **Vector search / top-k retrieval** -- Store embeddings in a vector database. At query time, embed the user's query and perform a top-k similarity search to retrieve the 10-20 most relevant items.
- **Pass only candidates to LLM** -- Send only these top-k items to the LLM instead of the full 50,000 item dataset, dramatically reducing token usage and cost.
- **Cache identical prompts** -- Cache results for identical or near identical queries so repeated searches skip the LLM entirely.
- **Short system prompts** -- Keep prompts concise to minimize cost per request.
- **Cost controls / temperature near 0** -- Use `temperature: 0` for deterministic output and set token budgets to cap per request spend.

### 3. The AI Reflection

I used Copilot throughout. One buggy suggestion: Copilot suggested passing
an AbortSignal to `model.generateContent(userQuery, { signal: controller.signal })`,
but Gemini's SDK doesn't accept a signal options object — the signal was silently ignored.

**How I caught it:**
I tested with a deliberately slow query and noticed the request hung past my 15 second
limit. The timeout logic wasn't working.

**The fix:**
I replaced the approach with `Promise.race()` — racing generateContent against a
setTimeout rejection. This gave proper timeouts without casting to `as any`.

**Lesson:** Don't blindly trust AI suggestions, test thoroughly and value type safety.
