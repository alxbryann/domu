# Domu Voice Agent Eval System

Automated QA evaluation for Domu collections voice agents. Every orchestrated call is scored when it ends via an LLM-as-judge pipeline. Criteria are configured per company — the dashboard shows scores, not a global rubric.

## Quick Start

```bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev            # starts API (3001) + dashboard (5173)
```

Open **http://localhost:5173** — calls appear as Domu's orchestrator sends webhook events.

## Architecture

```
Domu orchestrator → POST /api/webhooks/call → eval pipeline → dashboard
eval/           → LLM-as-judge (Anthropic + Zod + FDCPA rules)
server/         → Express API + webhook ingestion
data/           → call transcripts + scored results
src/            → React dashboard (Domu design system)
scripts/        → Vapi import (dev) + setup guide
```

## Call lifecycle

| Event | What happens |
|-------|----------------|
| `call.started` | Call saved as **live** — transcript visible, no score yet |
| `call.updated` | Transcript turns refreshed while call is in progress |
| `call.ended` | Eval runs automatically → call marked **completed** with scores |

### Webhook

```bash
POST /api/webhooks/call
Authorization: Bearer $WEBHOOK_SECRET   # optional, if WEBHOOK_SECRET is set

{
  "event": "call.ended",
  "call": {
    "id": "call-abc123",
    "agentVersion": "v1.2",
    "accountId": "ACC-2847",
    "startedAt": "2026-06-12T14:30:00Z",
    "endedAt": "2026-06-12T14:35:00Z",
    "turns": [
      { "speaker": "agent", "text": "Hello, this is Alex from Domu Recovery..." },
      { "speaker": "customer", "text": "Yes, speaking." }
    ]
  }
}
```

Messages in Vapi format (`role` / `message`) are also accepted via `call.messages`.

Pass `companyId` on the call payload to tag which criteria profile was used (defaults to `default` until per-company configs are wired up).

## CLI Commands

```bash
# Run live eval on a call stored in Supabase (requires ANTHROPIC_API_KEY)
npm run eval -- <call-id>
npm run eval:all

# Validate judge against golden labels (data/golden-labels.json)
npm run eval:validate

# Dev: import a Vapi export and run eval (simulates call.ended)
npm run import:vapi -- path/to/vapi-call.json
```

## Dashboard Pages

| Route | Purpose |
|-------|---------|
| `/` | Overview — live calls, avg scores, compliance failures |
| `/calls` | All calls (live, evaluating, completed) |
| `/calls/:id` | Call detail — transcript, scores, evidence per criterion |

## Vapi Integration (dev)

See [scripts/vapi-setup.md](scripts/vapi-setup.md) for local testing with Vapi web calls.

**Live calls from the dashboard:** set `VAPI_PUBLIC_KEY` and `VAPI_ASSISTANT_ID` in `.env`, then use **Start live call** on `/calls`. The transcript syncs to the eval pipeline when the call ends.

In production, Domu's orchestrator sends webhooks directly — no manual import needed.

## Data Storage

**Supabase Postgres is the only source of truth** for calls and eval results.

| Table | Contents |
|-------|----------|
| `calls` | Transcript, status, metadata, turns |
| `eval_results` | LLM judge scores per call |
| Storage bucket `call-recordings` | Call audio (uploaded on `call.ended`) |

Local `data/transcripts/` and `data/results/` are not used at runtime. Use `npm run migrate:json-to-supabase` only once if you need to import legacy JSON files.

### Setup

```bash
supabase link --project-ref <your-project-ref>
supabase db push

# Or apply migrations manually:
# supabase db query --linked -f supabase/migrations/20260612234000_calls_storage.sql
# supabase db query --linked -f supabase/migrations/20260613010000_call_recordings_bucket.sql

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Golden labels for judge validation live in `data/golden-labels.json`.

## Environment

```
ANTHROPIC_API_KEY=your-key-here
PORT=3001
WEBHOOK_SECRET=optional-bearer-token-for-webhooks
VAPI_PUBLIC_KEY=your-vapi-public-key
VAPI_PRIVATE_KEY=your-vapi-private-key
VAPI_ASSISTANT_ID=your-assistant-id
```

## License

Internal tooling for Domu GTM Engineering take-home.
