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
   git clone <your-repo-url>
   cd smart-travel-scout
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env.local
   ```
   Then open `.env.local` and add your Gemini API key.

4. Run the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key from https://aistudio.google.com |

## Live Demo

[Deployed on Vercel -> ADD YOUR URL HERE]

---

## Submission -- Passion Check

### 1. The "Under the Hood" Moment

> Write a specific real technical hurdle you faced and how you debugged it.
>
> **Example structure:** "When I first connected the Gemini API, I was calling it client-side and hitting CORS errors. I debugged this by checking the Network tab in DevTools which showed a 403 response. I moved the call to a Next.js API route at `/app/api/search/route.ts` which resolved it because the key was now server-side only."

_[Replace this block with your own real experience.]_

### 2. The Scalability Thought

If this app had 50,000 travel packages instead of 5, passing the full inventory to the LLM would be too expensive and imprecise. Here is how the approach would change:

- **Pre-computed embeddings** -- Generate an embedding vector for every inventory item using its title, tags, and location as input text.
- **Vector search / top-k retrieval** -- Store embeddings in a vector database (e.g. Pinecone, Supabase pgvector). At query time, embed the user's query and perform a top-k similarity search to retrieve the 10-20 most relevant items.
- **Pass only candidates to LLM** -- Send only these top-k items to the LLM instead of the full 50,000-item dataset, dramatically reducing token usage and cost.
- **Cache identical prompts** -- Cache results for identical or near-identical queries so repeated searches skip the LLM entirely.
- **Short system prompts** -- Keep prompts concise to minimize cost per request.
- **Cost controls / temperature near 0** -- Use `temperature: 0` for deterministic output and set token budgets to cap per-request spend.

### 3. The AI Reflection

> Name the specific AI tool you used (GitHub Copilot, ChatGPT, Cursor, etc.), then describe **one specific bad or buggy suggestion** it gave you and how you caught and fixed it. Be concrete about what the bug was.

_[Replace this block with your own real experience.]_
