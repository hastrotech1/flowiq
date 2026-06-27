# FlowIQ AI Proxy — Appwrite Function

Secure server-side proxy between FlowIQ (React) and the Anthropic API.
The `ANTHROPIC_API_KEY` lives **only** here — never in the client.

## Setup

### 1. Create the function in Appwrite Console
- Go to **Functions** → Create Function
- Runtime: **Node.js 18**
- Name: `flowiq-ai-proxy`
- Entry point: `src/main.js`

### 2. Set environment variable
In the function's Settings → Variables:
```
ANTHROPIC_API_KEY = sk-ant-...
```

### 3. Deploy
Either via the Appwrite CLI or by uploading a zip of this folder:
```bash
cd appwrite-function
zip -r ../ai-proxy.zip .
```
Then upload the zip in Appwrite Console → Functions → Deploy.

### 4. Copy the Function ID
After deployment, copy the **Function ID** from the Console.
Paste it into your `.env.local`:
```
VITE_APPWRITE_AI_PROXY_FUNCTION_ID=your_function_id_here
```

## Supported actions

| Action | Input | Output |
|---|---|---|
| `categorize` | `{ narrations: string[] }` | `Record<string, string>` narration→category |
| `insights` | `{ summary: TransactionSummary }` | `InsightCard[]` |
| `query` | `{ question, context, history }` | `{ answer: string }` |
| `anomalies` | `{ transactions: TxSample[] }` | `AnomalyResult[]` |

## Security notes
- The function validates `action` and `data` fields before calling Anthropic
- Never log full transaction data — only counts and metadata
- Appwrite Functions execute in an isolated environment; no other function shares the key
- Set **Execute permissions** to `users` (authenticated users only) in Appwrite Console
