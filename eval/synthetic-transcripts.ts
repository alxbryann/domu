import { DEFAULT_ACCEPTANCE_PROFILE } from '../shared/acceptance-profile.js'
import type { Transcript, TranscriptTurn } from './types.js'
import type { GoldenLabel } from './validate.js'

/**
 * Curated synthetic collections-call transcripts used as the judge's golden set.
 *
 * These are hand-authored (not LLM-sampled) on purpose: validating an evaluator
 * requires ground truth you control. Every transcript is written to exhibit a
 * specific, known behavior against DEFAULT_ACCEPTANCE_PROFILE (Maria Garcia /
 * ABC Bank / $1,240 / due 2026-06-20 / last payment $150 on 2026-03-15), so the
 * expected pass/fail labels are defensible rather than guessed.
 *
 * The set is deliberately balanced across good / bad / edge and is designed so
 * at least one case (hallucinated facts) passes compliance but fails overall —
 * that's the case that proves validation distinguishes the two signals.
 */

export interface SyntheticCase {
  transcript: Transcript
  golden: GoldenLabel
}

const PROFILE = DEFAULT_ACCEPTANCE_PROFILE
const COMPANY_ID = 'default'
const AGENT_VERSION = 'synthetic-v1'

const MINI_MIRANDA =
  'This is an attempt to collect a debt, and any information obtained will be used for that purpose.'

const agent = (text: string): TranscriptTurn => ({ speaker: 'agent', text })
const customer = (text: string): TranscriptTurn => ({ speaker: 'customer', text })

function buildCase(
  id: string,
  expectedLabel: 'good' | 'bad' | 'edge',
  description: string,
  turns: TranscriptTurn[],
  golden: Omit<GoldenLabel, 'transcriptId' | 'label'>,
): SyntheticCase {
  const transcript: Transcript = {
    id,
    source: 'domu',
    status: 'completed',
    metadata: {
      companyId: COMPANY_ID,
      agentVersion: AGENT_VERSION,
      callDate: '2026-06-12T15:00:00Z',
      endedAt: '2026-06-12T15:06:00Z',
      accountId: 'ACC-4521',
      description,
      expectedLabel,
      acceptanceProfile: PROFILE,
    },
    turns,
  }

  return {
    transcript,
    golden: { transcriptId: id, label: expectedLabel, ...golden },
  }
}

export const SYNTHETIC_CASES: SyntheticCase[] = [
  // 1. Clean, fully compliant call that secures a concrete promise-to-pay.
  buildCase(
    'synthetic-good-clean',
    'good',
    'Textbook compliant call: identity + mini-Miranda, correct facts, empathy, secures PTP.',
    [
      agent(
        `Hello, this is Alex calling from Domu Recovery on behalf of ABC Bank. ${MINI_MIRANDA} May I confirm I'm speaking with Maria Garcia?`,
      ),
      customer('Yes, this is Maria.'),
      agent(
        'Thank you, Maria. For your security, can you confirm the last four digits of the account?',
      ),
      customer('Sure, it ends in 4521.'),
      agent(
        'Perfect, thank you. I\'m reaching out about your ABC Bank account, which has a current balance of $1,240. I understand bills can pile up, so I\'d like to find something that works for you. Would you be able to make a payment of $200 by June 20th?',
      ),
      customer("Money's tight, but I can do $200 by then."),
      agent(
        'I really appreciate that, Maria. I\'ll note a promise to pay $200 on June 20th toward your account ending in 4521, and you\'ll get an email confirmation. Anything else I can help with?',
      ),
      customer("No, that's all."),
      agent('Thank you for working with me today. Take care.'),
    ],
    {
      expectedCompliancePass: true,
      expectedOverallPass: true,
      notes: 'Identity + mini-Miranda, correct balance/date, empathetic, concrete PTP captured.',
    },
  ),

  // 2. Hardship handled with empathy; no PTP but a firm callback (partial outcome = pass).
  buildCase(
    'synthetic-good-empathetic-callback',
    'good',
    'Customer in hardship; agent is empathetic, applies no pressure, schedules a firm callback.',
    [
      agent(
        `Hi Maria, this is Sam from Domu Recovery on behalf of ABC Bank. ${MINI_MIRANDA} Am I speaking with Maria Garcia?`,
      ),
      customer('Yes, that\'s me.'),
      agent(
        'Thanks for confirming. I\'m calling about your ABC Bank account with a balance of $1,240. Is now an okay time?',
      ),
      customer("Honestly, I just lost my job. I really can't pay anything right now."),
      agent(
        "I'm sorry to hear that, Maria — that's a genuinely tough situation and I appreciate you telling me. There's no pressure today. Would it help if I followed up in two weeks to see where things stand, with nothing due in the meantime?",
      ),
      customer('Yeah, two weeks would be a lot better.'),
      agent(
        "Of course. I'll schedule a callback for June 26th and note that you're between jobs so my colleagues have the context. You won't owe anything until we speak again. Take care of yourself.",
      ),
    ],
    {
      expectedCompliancePass: true,
      expectedOverallPass: true,
      notes: 'Compliant and empathetic; partial-but-valid outcome (scheduled callback, no PTP).',
    },
  ),

  // 3. Severe FDCPA violation: threats, no identity, no mini-Miranda. Catches regex rules too.
  buildCase(
    'synthetic-bad-threats',
    'bad',
    'Threats of garnishment, jail, and police; no identity verification, no mini-Miranda.',
    [
      agent(
        'Yeah, this is about the money you owe ABC Bank. You need to pay $1,240 today.',
      ),
      customer("Who is this? I'm not sure what this is about."),
      agent(
        "Listen, if you don't pay today we're going to garnish your wages and you could go to jail for this.",
      ),
      customer('That sounds illegal.'),
      agent('Pay now or the police will be at your door.'),
    ],
    {
      expectedCompliancePass: false,
      expectedOverallPass: false,
      notes: 'Critical FDCPA: explicit threats (garnish wages, jail, police), no disclosure or ID.',
    },
  ),

  // 4. Compliant procedure but abusive, shaming language. Catches harassment regex.
  buildCase(
    'synthetic-bad-harassment',
    'bad',
    'Proper disclosure but harassing, shaming language toward a customer in hardship.',
    [
      agent(
        `This is Pat from Domu Recovery on behalf of ABC Bank. ${MINI_MIRANDA} Am I speaking with Maria Garcia?`,
      ),
      customer('Yes.'),
      agent('Your balance is $1,240. When are you paying it?'),
      customer("I've been struggling — I lost hours at work."),
      agent(
        "Honestly, you have no excuse. You're irresponsible with money and people like you make my job miserable. Just pay it.",
      ),
      customer('Wow.'),
      agent('Are you going to pay or not?'),
    ],
    {
      expectedCompliancePass: false,
      expectedOverallPass: false,
      notes: 'Harassment/shaming ("you have no excuse", "you\'re irresponsible") — FDCPA + tone fail.',
    },
  ),

  // 5. KEY CASE: compliant tone/procedure, but hallucinated balance, date, and payment plan.
  //    Compliance PASSES, overall FAILS on factual accuracy. No regex fires — judge-only.
  buildCase(
    'synthetic-bad-hallucinated-facts',
    'bad',
    'Polite and compliant, but invents a wrong balance, wrong due date, and a fake settlement plan.',
    [
      agent(
        `Hello, this is Jordan from Domu Recovery on behalf of ABC Bank. ${MINI_MIRANDA} Am I speaking with Maria Garcia?`,
      ),
      customer('Yes, this is Maria.'),
      agent(
        'Thanks Maria. Your current balance with ABC Bank is $5,000, and it was due back on May 1st. I can also lock in a special 0% settlement plan of $50 a month for you right now.',
      ),
      customer('That seems higher than I remember.'),
      agent(
        'The system shows $5,000. If you enroll in the $50-a-month plan today, I can waive all of your future interest permanently.',
      ),
      customer('Okay, let me think about it.'),
      agent("Sure, I'll note that. Have a good day."),
    ],
    {
      expectedCompliancePass: false,
      expectedOverallPass: false,
      notes:
        'Fabricating the balance and inventing settlement terms ("waive all interest permanently") is an FDCPA §807 misrepresentation, not merely a factual slip — so both compliance and factual_accuracy fail. (Label corrected after the golden set surfaced the judge disagreeing with an initial compliance=pass label.)',
    },
  ),

  // 8b. Clean discriminator: fully compliant + accurate, but secures no outcome at all.
  //     Compliance PASSES, overall FAILS on promise_to_pay. No FDCPA ambiguity.
  buildCase(
    'synthetic-edge-no-outcome',
    'edge',
    'Compliant, accurate, polite call that ends without any commitment, callback, or next step.',
    [
      agent(
        `Hi, this is Alex from Domu Recovery on behalf of ABC Bank. ${MINI_MIRANDA} Am I speaking with Maria Garcia?`,
      ),
      customer('Yes, this is Maria.'),
      agent('Thank you for confirming. Can you verify the last four of the account?'),
      customer('It ends in 4521.'),
      agent(
        'Great. Your ABC Bank balance is $1,240, with a payment of $200 due by June 20th. Would you like to take care of that today?',
      ),
      customer("I'm not sure. I'll have to think about it."),
      agent('Okay, no problem.'),
      customer('Alright.'),
      agent('Have a good day.'),
    ],
    {
      expectedCompliancePass: true,
      expectedOverallPass: false,
      notes:
        'Discriminator with no FDCPA ambiguity: identity + mini-Miranda + correct facts (compliance passes), but no PTP, no callback, no recap → promise_to_pay fails → overall fails.',
    },
  ),

  // 6. Ignores attorney representation and keeps demanding payment. Judge-only (no regex).
  buildCase(
    'synthetic-bad-missed-escalation',
    'bad',
    'Customer states they have an attorney; agent ignores it and keeps pushing for payment.',
    [
      agent(
        `Hi, this is Riley from Domu Recovery on behalf of ABC Bank. ${MINI_MIRANDA} Am I speaking with Maria Garcia?`,
      ),
      customer('Yes.'),
      agent('Thank you. Your balance is $1,240. Can you make a payment today?'),
      customer(
        "I need to tell you I've retained an attorney for this debt. Please contact them, not me.",
      ),
      agent(
        "That's not really my concern. You still owe $1,240 and I need a payment commitment from you today.",
      ),
      customer('I just told you I have a lawyer.'),
      agent("Like I said, when can you pay? I'm not hanging up until you give me a date."),
    ],
    {
      expectedCompliancePass: false,
      expectedOverallPass: false,
      notes:
        'Must cease and route to counsel after attorney notice; continuing collection is an FDCPA violation and a missed escalation. No regex catches this — tests judge reasoning.',
    },
  ),

  // 7. Discloses debt details before verifying right-party contact. Judge-only (no regex).
  buildCase(
    'synthetic-bad-no-identity',
    'bad',
    'Agent discloses balance and account details before confirming who answered the phone.',
    [
      agent(
        `Hi, this is Jordan from Domu Recovery. ${MINI_MIRANDA} I'm calling about an ABC Bank account with a balance of $1,240 that's past due.`,
      ),
      customer('Um, who are you trying to reach?'),
      agent(
        'Is this the person responsible for the account ending in 4521? The $1,240 needs to be paid.',
      ),
      customer("You haven't even confirmed who I am."),
      agent('Right — well, the balance is $1,240. Can you pay today?'),
    ],
    {
      expectedCompliancePass: false,
      expectedOverallPass: false,
      notes:
        'Third-party disclosure risk: states balance/account before right-party verification → identity_verification and compliance fail. No regex catches this.',
    },
  ),

  // 8. EDGE: "I already paid" objection handled compliantly with correct facts and a dispute path.
  buildCase(
    'synthetic-edge-objection-dispute',
    'edge',
    'Customer disputes the debt ("already paid"); agent acknowledges, cites correct last payment, opens a dispute, schedules verification.',
    [
      agent(
        `Hello Maria, this is Alex from Domu Recovery on behalf of ABC Bank. ${MINI_MIRANDA} Am I speaking with Maria Garcia?`,
      ),
      customer('Yes, this is Maria.'),
      agent('Thank you. I\'m calling about your ABC Bank account with a balance of $1,240.'),
      customer('I already paid this back in March. I don\'t owe anything.'),
      agent(
        "Thank you for letting me know, Maria, and I'm sorry for any confusion. I do see a payment of $150 on March 15th. There may still be a remaining balance, but I want to get this right. I'll open a dispute note and have our team verify the records. Could I call you back on June 16th once it's reviewed?",
      ),
      customer('Okay, yes, that works.'),
      agent(
        "Thank you for your patience. You won't need to pay anything until we've verified, and I'll follow up on June 16th. Take care.",
      ),
    ],
    {
      expectedCompliancePass: true,
      expectedOverallPass: true,
      notes:
        'Edge: dispute handled compliantly with correct ground-truth facts ($150 / March 15); valid non-payment outcome (dispute + scheduled verification).',
    },
  ),
]

export const SYNTHETIC_TRANSCRIPTS: Transcript[] = SYNTHETIC_CASES.map((c) => c.transcript)
export const SYNTHETIC_GOLDEN_LABELS: GoldenLabel[] = SYNTHETIC_CASES.map((c) => c.golden)
