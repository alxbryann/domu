# Domu Agent Quality Eval — One Pager

## What failure modes we targeted (and why)

Domu voice agents make real collections calls regulated by FDCPA. We targeted 7 failure modes that map to business, legal, and commercial risk:

| Failure Mode | Criterion | Why it matters |
|---|---|---|
| Compliance violation (threats, no mini-Miranda, harassment) | FDCPA Compliance (1.5x weight, hard gate) | One bad line = regulatory action, not just a bad call |
| Wrong/insensitive tone | Empathy & Tone | Sensitive conversations; aggression kills conversion and reputation |
| Hallucinated payment terms | Factual Accuracy (1.2x weight) | Invented plans/balances create liability and broken customer trust |
| No outcome captured | Promise-to-Pay | Calls must move accounts forward or they're wasted |
| Missed escalation (attorney, dispute, bankruptcy) | Escalation Handling | Continuing collection after escalation signals is a compliance event |
| Poor objection handling | Objection Handling | "Can't afford," "wrong person," "already paid" are daily scenarios |
| Weak identity verification | Identity Verification | Discussing debt before confirming right-party is an FDCPA prerequisite |

## Who uses this and how

| User | Workflow |
|---|---|
| **QA reviewer** | Opens dashboard → reviews flagged calls → spot-checks evidence quotes in <30s |
| **CS lead** | Checks Overview for compliance failure count and pass rate trends |
| **Engineer iterating on agent** | Runs eval on new prompt version → compares scores across transcripts |
| **GTM / client-facing** | Shows eval reports to give clients confidence agents are provably compliant |

Nobody needs the author in the room: scores appear on `/calls` when calls complete, using each company's configured criteria profile.

## How it improves Domu's GTM/CS motion

- **Faster QA:** transcripts scored in seconds, not hours of listening
- **Compliance risk caught pre-ship:** hard gate on FDCPA + rule-based alerts before agents reach production
- **Agent version comparison:** same criteria, same rubric, comparable scores across prompt iterations
- **Client confidence:** evidence-backed eval reports, not "trust us, it's fine"

## How we prove the eval system itself works

1. **Golden set** with human labels (good/bad/edge) in `data/golden-labels.json`. Run `npm run eval:validate` to measure judge agreement.
2. **Rule-based sanity layer** — deterministic regex checks for obvious violations (threats, garnishment language). If rules fire but judge passes → `judgeDisagreement: true` surfaced in dashboard.
3. **Calibration prompts** — few-shot good/bad examples in the judge system prompt.
4. **Evidence requirement** — every score must cite exact transcript quotes, enabling fast human verification.

## How we'd scale it

| Today (prototype) | Production |
|---|---|
| JSON file storage | Postgres + S3 for transcripts |
| Single Anthropic judge pass | 2-of-3 ensemble on compliance criterion only |
| Manual trigger (CLI for dev) | Webhook on every Domu-orchestrated call |
| Default criteria profile in code | Per-company criteria in DB with admin UI |
| Empty data dirs at start | Continuous golden set expansion from human-reviewed calls |
| Rule-based regex | Expand to structured FDCPA rule engine + LLM hybrid |

## Tech stack

- **Eval:** Anthropic Claude (LLM-as-judge) + Zod structured output + FDCPA regex rules
- **Voice:** Vapi (web test call → transcript import)
- **Dashboard:** React + Domu design system (dark mode, MetricCard, criterion cards)
- **API:** Express + JSON files
