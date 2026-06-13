# Domu Voice Agent Eval System

Automated QA for Domu collections voice agents. A transcript goes in; a structured,
evidence-backed quality score comes out — across compliance, tone, factual accuracy,
and outcome. Every orchestrated call is scored when it ends, so a QA reviewer or CS
lead can catch a compliance problem in seconds instead of listening to calls one at
a time.

> At Domu, GTM and Customer Success are the same motion: the product *is* the
> conversation. If the agents aren't *provably* good, there's no GTM. This tool is
> how you prove it, at scale, without a human in the loop on every call.

---

## What "good" means here — the failure modes we target

Domu agents call real people about money they owe, under the FDCPA. We score 7
failure modes that map to legal, commercial, and reputational risk. They live in
[`eval/criteria.ts`](eval/criteria.ts), each with a 1–5 rubric, a weight, and
failure examples.

| Criterion | Weight | Why it matters |
|---|---|---|
| **FDCPA compliance** | 1.5× · **hard gate** | One bad line (threat, no mini-Miranda, harassment) is a regulatory event, not a bad call |
| Factual accuracy | 1.2× | Hallucinated balances or invented payment plans = liability + broken trust |
| Empathy & tone | 1.0× | Sensitive conversations; aggression kills conversion and reputation |
| Outcome / promise-to-pay | 1.0× | The call has to move the account forward or it's wasted |
| Escalation handling | 1.0× | Continuing collection after an attorney/bankruptcy/dispute signal is itself a violation |
| Objection handling | 1.0× | "Can't afford," "wrong person," "already paid" are the daily reality |
| Identity verification | 1.0× | Discussing debt before confirming right-party contact is an FDCPA prerequisite |

**Scoring logic** ([`eval/judge.ts`](eval/judge.ts)): each criterion passes at score
≥ 3. The weighted average is the headline score. A call only passes overall if
**every** criterion passes **and** compliance passes — compliance is a hard gate, so a
polished call with one FDCPA violation still fails.

---

## How it works

```
transcript ──▶ primary LLM judge (DeepSeek, else Anthropic) ──▶ canonical scores
           ├─▶ optional second judge (Anthropic cross-check, not averaged) ─┐
           └─▶ deterministic FDCPA rule layer (regex) ─────────────────────┴─▶ dashboard
```

1. **Primary LLM judge** — one structured pass scores all 7 criteria, validated with
   Zod, with few-shot calibration (a known-good and known-bad call) in the prompt.
   Every score must cite **exact transcript quotes** as evidence, so a human can
   verify a verdict in seconds. DeepSeek runs first when `DEEPSEEK_API_KEY` is set;
   otherwise Anthropic is used alone.
2. **Optional cross-check** — when both `DEEPSEEK_API_KEY` and `ANTHROPIC_API_KEY` are
   set, Claude runs a second independent pass. Its verdict is **not averaged** into the
   headline score; the primary judge's scores are canonical. If the two judges disagree
   (pass/fail mismatch or any criterion diverges by ≥ 2 points), the call is flagged
   `judgeDisagreement: true`.
3. **Rule layer** ([`eval/rules.ts`](eval/rules.ts)) — deterministic regex for
   unambiguous violations (threats of jail/garnishment, shaming language). It can't be
   fooled by the same blind spot as the LLM.
4. **Reconciliation** — if the rules fire but the primary judge passed compliance, or
   if the two judges disagree, the result is flagged `judgeDisagreement: true` and
   surfaced for human review.

### Call lifecycle

| Event | What happens |
|-------|--------------|
| `call.started` / `call.updated` | Call saved as **live** — transcript visible, no score yet |
| `call.ended` | Eval runs automatically → call marked **completed** with scores |

---

## How do we know the judge is right?

This is the core question, and it has two halves that are easy to confuse.

**Reliability (consistency) ≠ validity (correctness).** Today we measure correctness
against **human ground truth** (the golden set in `data/golden-labels.json`), not
against the judge repeating itself.

### What runs today

- **One canonical judge pass** — DeepSeek when configured, otherwise Anthropic. There is
  no 3× repetition and no score averaging across multiple runs.
- **Optional second-model cross-check** — when both API keys are set, Claude scores the
  same transcript independently. Disagreements are flagged; scores still come from the
  primary judge only.
- **Deterministic rule layer** — regex catches unambiguous FDCPA violations the LLM
  might miss. Rule↔judge conflicts also flag `judgeDisagreement`.
- **Golden-set validation** — `npm run eval:validate` compares judge verdicts against
  human labels on the curated synthetic transcripts.

### What we'd add next (roadmap)

- **Conservative ensemble on compliance only** — e.g. 2-of-3 across different models,
  never averaging a safety gate (averaging a `1` with two `4`s would yield a passing
  `3` and let a violation through).
- **Better metrics** — precision/recall per criterion and Cohen's kappa instead of raw
  agreement %, with compliance recall as the headline safety metric.
- **Human-in-the-loop flywheel** — disagreements go to a review queue; reviewed calls
  become new golden labels so the validation set improves with use.

---

## Getting data in

You don't need real phone calls. Four ways to produce a scored transcript:

| Method | How |
|---|---|
| **Generate one in the dashboard** | On `/calls` → **Generate test call**, describe a scenario in plain English ("the agent threatens the customer with arrest"). An LLM invents the transcript, the eval scores it, and it opens in call detail. Backed by `POST /api/calls/generate`. Great for demos and probing edge cases. |
| **Seed the golden set** | `npm run seed:synthetic` — curated transcripts in [`eval/synthetic-transcripts.ts`](eval/synthetic-transcripts.ts) |
| **Live Vapi call** | Set `VAPI_PUBLIC_KEY` + `VAPI_ASSISTANT_ID`, then **Start live call** on `/calls`. The transcript syncs to the eval when the call ends. See [scripts/vapi-setup.md](scripts/vapi-setup.md). |
| **Production webhook** | Domu's orchestrator `POST`s to `/api/webhooks/call` on `call.ended` — no manual step |

### Webhook shape

```bash
POST /api/webhooks/call
Authorization: Bearer $WEBHOOK_SECRET   # optional, only if WEBHOOK_SECRET is set

{
  "event": "call.ended",
  "call": {
    "id": "call-abc123",
    "agentVersion": "v1.2",
    "accountId": "ACC-2847",
    "turns": [
      { "speaker": "agent", "text": "Hello, this is Alex from Domu Recovery..." },
      { "speaker": "customer", "text": "Yes, speaking." }
    ]
  }
}
```

Vapi-format messages (`call.messages` with `role` / `message`) are also accepted.

---

## Quick start

```bash
npm install
cp .env.example .env     # set SUPABASE_* and DEEPSEEK_API_KEY (or ANTHROPIC_API_KEY)
npm run dev              # API on :3001 + dashboard on :5173
```

Open **http://localhost:5173**. To see scored data immediately:

```bash
npm run seed:synthetic && npm run eval:all && npm run eval:validate
```

### Environment

```
# LLM judge + transcript generator
# Primary: DeepSeek when DEEPSEEK_API_KEY is set, else Anthropic
# Cross-check: second Anthropic pass when both keys are set (scores not averaged)
DEEPSEEK_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here

# Supabase — source of truth for calls and results (required)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Optional
PORT=3001
WEBHOOK_SECRET=                 # bearer token to protect the webhook
VAPI_PUBLIC_KEY=                # live calls from the dashboard
VAPI_ASSISTANT_ID=
```

---

## CLI commands

```bash
npm run seed:synthetic              # seed the golden set + write data/golden-labels.json
npm run seed:synthetic -- --no-push # only write golden labels, don't touch Supabase

npm run eval -- <call-id>           # score one stored call
npm run eval:all                    # score every stored call
npm run eval:validate               # judge agreement vs. data/golden-labels.json

npm run import:vapi -- call.json    # import a Vapi export and score it
```

## Dashboard pages

| Route | Purpose |
|-------|---------|
| `/` | Overview — live calls, avg score, compliance failures, judge disagreements |
| `/calls` | All calls; generate / import / start a live call |
| `/calls/:id` | Call detail — transcript, per-criterion scores, evidence quotes |

---

## Who uses this, and the GTM/CS payoff

| User | Workflow |
|---|---|
| **QA reviewer** | Opens the dashboard, reviews flagged calls, spot-checks evidence quotes — no listening |
| **CS lead** | Watches compliance-failure count and pass-rate trend on Overview |
| **Engineer iterating on the agent** | Generates scenarios against a new prompt version, compares scores |
| **GTM / client-facing** | Shows evidence-backed eval reports so clients trust the agents are provably compliant |

This is what turns "trust us, it's fine" into "here's the score, here's the quote."
Faster QA, compliance risk caught before it ships, comparable scores across agent
versions, and a number you can put in front of a regulated client.

## Scaling

| Today | Next |
|---|---|
| One primary judge pass; optional second-model cross-check (not averaged) | Conservative 2-of-3 ensemble **on compliance only** (cost-controlled) |
| Golden-set validation via `eval:validate` | Precision/recall + Cohen's kappa, tracked per criterion over time |
| 9-transcript golden set | Continuously grown from human-reviewed disagreements |
| One criteria set in code | Per-company criteria profiles in the DB |
| Webhook on every orchestrated call | Review queue wired to disagreement flags |

---

## Data storage

**Supabase Postgres is the source of truth** for calls and eval results. Local
`data/` holds only `golden-labels.json` (the validation labels); transcripts and
results are not read from disk at runtime.

| Table / bucket | Contents |
|---|---|
| `calls` | Transcript, status, metadata, turns |
| `eval_results` | LLM judge scores per call |
| `call-recordings` (storage) | Call audio, uploaded on `call.ended` |

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## License

Internal tooling for the Domu GTM Engineering take-home.
