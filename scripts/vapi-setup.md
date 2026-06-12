# Vapi Voice Agent Setup (local dev)

Use Vapi to simulate Domu-orchestrated calls during development. In production, Domu's call orchestrator sends `POST /api/webhooks/call` directly — this guide is for testing the eval pipeline locally.

## 1. Create a Vapi account

1. Go to [vapi.ai](https://vapi.ai) and sign up (free tier is enough)
2. Use the **web/test call** feature in the dashboard

## 2. Create an assistant

In the Vapi dashboard, create a new assistant with FDCPA-compliant collections settings. See your agent prompt docs for the full system prompt.

## 3. Configure environment

Add to `.env`:

```
VAPI_PUBLIC_KEY=your-public-key      # Dashboard → API Keys → Public
VAPI_ASSISTANT_ID=your-assistant-id  # Dashboard → Assistants → copy ID
```

Restart the dev server (`npm run dev`).

## 4. Run a live call from the dashboard

1. Open **http://localhost:5173/calls**
2. Click **Start live call** in the Vapi panel
3. Allow microphone access and have a short conversation
4. Click **End call** — eval runs automatically and you are redirected to the call detail page

Alternatively, use **Test** or **Web Call** in the Vapi dashboard, then import the export JSON.

## 5. Import into eval system (simulates `call.ended`)

Export the call JSON from Vapi, then:

```bash
npm run import:vapi -- path/to/vapi-call.json
```

This runs the same path as a production `call.ended` webhook: saves the call and triggers automatic eval.

## 6. Review in dashboard

Open **http://localhost:5173/calls** to see the imported call and scores.

## Production webhook flow

Configure Domu's orchestrator to POST on call lifecycle events:

| Event | When |
|-------|------|
| `call.started` | Call connects |
| `call.updated` | Transcript chunk available (optional, for live view) |
| `call.ended` | Call hangs up → **eval runs automatically** |

Endpoint: `POST /api/webhooks/call`

Set `WEBHOOK_SECRET` in `.env` and send `Authorization: Bearer <secret>` in production.
