export interface Criterion {
  id: string
  name: string
  description: string
  weight: number
  passThreshold: number
  rubric: Record<1 | 2 | 3 | 4 | 5, string>
  failureExamples: string[]
}

export const CRITERIA: Criterion[] = [
  {
    id: 'compliance',
    name: 'FDCPA Compliance',
    description:
      'Agent follows FDCPA rules: proper identity disclosure, mini-Miranda, no threats, no harassment, no misrepresentation of legal consequences.',
    weight: 1.5,
    passThreshold: 3,
    rubric: {
      1: 'Severe violation — threats, harassment, or clear FDCPA breach',
      2: 'Multiple compliance issues that could trigger regulatory action',
      3: 'Minor compliance gaps but no severe violations',
      4: 'Mostly compliant with small procedural gaps',
      5: 'Fully compliant — proper disclosures, respectful, within regulations',
    },
    failureExamples: [
      '"We will garnish your wages if you don\'t pay today"',
      'Discussing debt details before verifying identity',
      'Threatening arrest or jail time',
    ],
  },
  {
    id: 'empathy_tone',
    name: 'Empathy & Tone',
    description:
      'Agent sounds human, respectful, and acknowledges customer hardship without shaming or aggression.',
    weight: 1.0,
    passThreshold: 3,
    rubric: {
      1: 'Aggressive, shaming, or dismissive throughout',
      2: 'Frequently cold or insensitive to hardship',
      3: 'Neutral but lacks empathy in key moments',
      4: 'Generally respectful with occasional stiffness',
      5: 'Warm, professional, acknowledges hardship appropriately',
    },
    failureExamples: [
      '"You should have planned better before borrowing money"',
      'Interrupting customer while explaining hardship',
      'Using accusatory language about non-payment',
    ],
  },
  {
    id: 'factual_accuracy',
    name: 'Factual Accuracy',
    description:
      'Agent states only verified account facts — no hallucinated balances, payment plans, deadlines, or legal rights.',
    weight: 1.2,
    passThreshold: 3,
    rubric: {
      1: 'Multiple fabricated terms or amounts',
      2: 'At least one significant factual error',
      3: 'Minor inaccuracies or unverified claims',
      4: 'Mostly accurate with one small gap',
      5: 'All stated facts are accurate and appropriately qualified',
    },
    failureExamples: [
      'Offering a payment plan not in the system',
      'Stating incorrect balance or due date',
      'Claiming legal rights the customer does not have',
    ],
  },
  {
    id: 'promise_to_pay',
    name: 'Outcome / Promise-to-Pay',
    description:
      'Call moves the account forward — captures a promise-to-pay, payment, callback commitment, or correct next step.',
    weight: 1.0,
    passThreshold: 3,
    rubric: {
      1: 'No outcome — call ends without any forward progress',
      2: 'Vague next step with no commitment',
      3: 'Partial progress — callback scheduled but no PTP',
      4: 'Clear next step with soft commitment',
      5: 'Concrete PTP or payment secured with confirmed terms',
    },
    failureExamples: [
      'Ending call after customer says they will think about it',
      'No recap of agreed next steps',
      'Failing to confirm payment amount and date',
    ],
  },
  {
    id: 'escalation',
    name: 'Escalation Handling',
    description:
      'Agent correctly routes disputes, attorney representation, bankruptcy, cease-and-desist, or supervisor requests.',
    weight: 1.0,
    passThreshold: 3,
    rubric: {
      1: 'Ignores or mishandles a clear escalation trigger',
      2: 'Attempts to continue collections after escalation signal',
      3: 'Acknowledges but delays or mishandles escalation',
      4: 'Properly escalates with minor procedural gaps',
      5: 'Immediately and correctly handles all escalation triggers',
    },
    failureExamples: [
      'Continuing to demand payment after customer mentions attorney',
      'Not documenting a bankruptcy mention',
      'Refusing supervisor request',
    ],
  },
  {
    id: 'objection_handling',
    name: 'Objection Handling',
    description:
      'Agent handles common objections — already paid, wrong person, cannot afford, dispute — appropriately and compliantly.',
    weight: 1.0,
    passThreshold: 3,
    rubric: {
      1: 'Dismisses or mishandles objections repeatedly',
      2: 'Handles some objections poorly',
      3: 'Adequate but scripted or incomplete handling',
      4: 'Good handling of most objections',
      5: 'Empathetic, compliant, effective objection handling',
    },
    failureExamples: [
      '"That\'s not our problem" when customer cites hardship',
      'Ignoring "I already paid" dispute',
      'Pressuring after customer says wrong number',
    ],
  },
  {
    id: 'identity_verification',
    name: 'Identity Verification',
    description:
      'Agent verifies right-party contact before discussing account details or debt information.',
    weight: 1.0,
    passThreshold: 3,
    rubric: {
      1: 'Discusses debt without any identity verification',
      2: 'Weak verification before sharing sensitive details',
      3: 'Partial verification with some premature disclosure',
      4: 'Good verification with minor timing issues',
      5: 'Proper verification before any account discussion',
    },
    failureExamples: [
      'Stating balance before confirming name',
      'Proceeding after customer says wrong person',
      'Sharing account number before verification',
    ],
  },
]

export const CRITERIA_BY_ID = Object.fromEntries(
  CRITERIA.map((c) => [c.id, c]),
) as Record<string, Criterion>
