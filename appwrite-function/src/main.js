import Anthropic from '@anthropic-ai/sdk'

// ════════════════════════════════════════════════════════════
// FLOWIQ AI PROXY — Appwrite Function (Node.js 18+)
//
// This function is the ONLY place the Anthropic API key lives.
// The React client never touches the key directly.
//
// Receives a JSON payload from the client via
// functions.createExecution(), routes to the correct handler,
// and returns a JSON response.
//
// Supported actions:
//   categorize  — cluster narrations into category labels
//   insights    — generate insight cards from tx summary
//   query       — answer a NL question about transactions
//   anomalies   — detect unusual transactions
//
// Environment variables required (set in Appwrite Console):
//   ANTHROPIC_API_KEY — your Anthropic API key
// ════════════════════════════════════════════════════════════

const MODEL = 'claude-sonnet-4-6'

export default async ({ req, res, log, error }) => {
  // ── Parse incoming payload ───────────────────────────────
  let payload
  try {
    payload = JSON.parse(req.body ?? '{}')
  } catch {
    return res.json({ error: 'Invalid JSON payload' }, 400)
  }

  const { action, data } = payload

  if (!action || !data) {
    return res.json({ error: 'Missing action or data field' }, 400)
  }

  // ── Initialise Anthropic client ──────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    error('ANTHROPIC_API_KEY environment variable is not set')
    return res.json({ error: 'AI service not configured' }, 500)
  }

  const client = new Anthropic({ apiKey })

  // ── Route to handler ─────────────────────────────────────
  try {
    switch (action) {
      case 'categorize': return res.json(await handleCategorize(client, data, log))
      case 'insights':   return res.json(await handleInsights(client, data, log))
      case 'query':      return res.json(await handleQuery(client, data, log))
      case 'anomalies':  return res.json(await handleAnomalies(client, data, log))
      default:
        return res.json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (err) {
    error(`Handler error for action "${action}": ${err?.message ?? err}`)
    return res.json({ error: 'AI request failed. Please try again.' }, 500)
  }
}

// ════════════════════════════════════════════════════════════
// HANDLER: categorize
// Groups unique narration strings into human-readable category labels.
// Returns: Record<string, string>  (narration → category label)
// ════════════════════════════════════════════════════════════

/**
 * Sends a list of unique transaction narrations to Claude for clustering.
 * Claude returns a JSON object mapping each narration to a category label.
 * Labels should be short (2–4 words), human-readable, and consistent.
 *
 * Example input:  ["AIRTIME MTN 0803...", "NETFLIX SUBSCRIPTION", "POS GROCERY MART"]
 * Example output: { "AIRTIME MTN 0803...": "Airtime & Data", "NETFLIX...": "Streaming", ... }
 */
async function handleCategorize(client, data, log) {
  const { narrations } = data

  if (!Array.isArray(narrations) || narrations.length === 0) {
    return {}
  }

  // Batch in chunks of 200 to stay within context limits
  const CHUNK_SIZE = 200
  const result = {}

  for (let i = 0; i < narrations.length; i += CHUNK_SIZE) {
    const chunk = narrations.slice(i, i + CHUNK_SIZE)
    log(`Categorising chunk ${Math.floor(i / CHUNK_SIZE) + 1} — ${chunk.length} narrations`)

    const prompt = `You are a Nigerian personal finance assistant. Categorise each transaction narration into a short, human-readable category label (2-4 words max).

Rules:
- Use consistent labels across similar narrations (e.g. all airtime = "Airtime & Data")
- Common Nigerian categories: Airtime & Data, Food & Dining, Transport, Utilities, Transfers, ATM Withdrawal, Online Shopping, Entertainment, Healthcare, Education, Savings, Salary, Business Income
- If truly unclear, use "Miscellaneous"
- Never invent long category names

Return ONLY a valid JSON object with no markdown, no explanation. Format:
{"narration text": "Category Label", ...}

Narrations to categorise:
${JSON.stringify(chunk)}`

    const message = await client.messages.create({
      model:      MODEL,
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.text ?? '{}'

    // Strip any accidental markdown fences before parsing
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(cleaned)
      Object.assign(result, parsed)
    } catch {
      log(`JSON parse failed for chunk ${i} — skipping`)
    }
  }

  return result
}

// ════════════════════════════════════════════════════════════
// HANDLER: insights
// Generates pre-built insight cards from aggregated tx summary.
// Returns: InsightCard[]
// ════════════════════════════════════════════════════════════

/**
 * Generates 4–6 insight cards from a summarised view of the user's
 * transaction data. Never receives raw transaction rows — only
 * aggregated totals and category summaries.
 *
 * Each card has: id, type (info|warning|positive|tip), title, body, metric?
 */
async function handleInsights(client, data, log) {
  const { summary } = data
  log('Generating insights from summary')

  const prompt = `You are FlowIQ, a Nigerian personal finance AI assistant. Analyse this transaction summary and generate 4-6 concise, actionable insight cards.

Transaction Summary:
${JSON.stringify(summary, null, 2)}

Return ONLY a valid JSON array of insight cards. No markdown, no explanation.
Each card must have exactly these fields:
- id: unique string (e.g. "insight_1")
- type: one of "info" | "warning" | "positive" | "tip"
- title: short title (max 8 words)
- body: 1-2 sentence insight in plain English, relevant to Nigerian context
- metric: optional short formatted figure (e.g. "₦45,000", "32%", "3×") — only if directly relevant

Use "warning" for overspending patterns, "positive" for good habits,
"tip" for actionable advice, "info" for neutral observations.
Reference Naira amounts where present. Be specific, not generic.

Return format: [{"id":"...","type":"...","title":"...","body":"...","metric":"..."}, ...]`

  const message = await client.messages.create({
    model:      MODEL,
    max_tokens: 1500,
    messages:   [{ role: 'user', content: prompt }],
  })

  const text    = message.content[0]?.text ?? '[]'
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    log('Failed to parse insights JSON')
    return []
  }
}

// ════════════════════════════════════════════════════════════
// HANDLER: query
// Answers a natural language question about the user's finances.
// Returns: { answer: string }
// ════════════════════════════════════════════════════════════

/**
 * Multi-turn NL query handler. Receives the user's question,
 * a summarised transaction context, and the conversation history.
 *
 * The system prompt establishes FlowIQ's persona and constrains
 * the AI to only answer questions about the provided data.
 */
async function handleQuery(client, data, log) {
  const { question, context, history = [] } = data
  log(`Query: "${question?.slice(0, 60)}..."`)

  const systemPrompt = `You are FlowIQ, a friendly Nigerian personal finance assistant embedded in a banking analytics app.

You have access to the user's transaction data summary below. Answer questions accurately and concisely based ONLY on this data.

Transaction Context:
${JSON.stringify(context, null, 2)}

Rules:
- Always format Naira amounts as ₦X,XXX.XX or ₦X.XM/K for large amounts
- Be specific — use the actual figures from the context
- If the answer is not in the context, say so honestly
- Keep answers under 150 words unless the question requires detail
- Use a friendly, direct tone appropriate for a Nigerian fintech product
- Never make up transactions or amounts not in the context`

  // Build conversation history for multi-turn support
  const messages = [
    ...history.map((turn) => ({
      role:    turn.role,
      content: turn.content,
    })),
    { role: 'user', content: question },
  ]

  const message = await client.messages.create({
    model:      MODEL,
    max_tokens: 500,
    system:     systemPrompt,
    messages,
  })

  return { answer: message.content[0]?.text ?? 'I was unable to answer that question.' }
}

// ════════════════════════════════════════════════════════════
// HANDLER: anomalies
// Detects unusual transactions from a sample of recent debits.
// Returns: AnomalyResult[]
// ════════════════════════════════════════════════════════════

/**
 * Scans a sample of recent debit transactions for anomalies:
 * - Unusually large amounts vs the user's normal range
 * - Duplicate transactions on the same day
 * - Transactions at unusual times (if time data available)
 * - New merchants not seen before
 *
 * Returns a list of flagged transactions with severity and explanation.
 */
async function handleAnomalies(client, data, log) {
  const { transactions } = data
  log(`Scanning ${transactions?.length ?? 0} transactions for anomalies`)

  if (!transactions?.length) return []

  const prompt = `You are a fraud and anomaly detection system for a Nigerian bank account.

Analyse these recent debit transactions and identify any that seem unusual, suspicious, or anomalous.

Transactions (date, amount in NGN, narration):
${JSON.stringify(
  transactions.slice(0, 100).map((t) => ({
    date:      t.date,
    amount:    t.amount,
    narration: t.narration,
  })),
  null, 2
)}

Identify anomalies based on:
1. Amounts much larger than typical for that narration type
2. Duplicate or near-duplicate transactions
3. Narrations that seem unusual or inconsistent
4. Spending patterns that deviate significantly from the norm

Return ONLY a valid JSON array. No markdown. Max 5 results.
Each item:
{"date":"ISO string","amount":number,"narration":"string","explanation":"1 sentence","severity":"low"|"medium"|"high"}

If no anomalies found, return [].`

  const message = await client.messages.create({
    model:      MODEL,
    max_tokens: 800,
    messages:   [{ role: 'user', content: prompt }],
  })

  const text    = message.content[0]?.text ?? '[]'
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    log('Failed to parse anomalies JSON')
    return []
  }
}
