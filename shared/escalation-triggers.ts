export interface EscalationTurn {
  speaker: 'agent' | 'customer' | 'system'
  text: string
}

export interface EscalationTriggerDefinition {
  id: string
  pattern: RegExp
  label: string
  severity: 'critical' | 'high'
  description: string
}

export interface EscalationTriggerMatch {
  id: string
  label: string
  severity: 'critical' | 'high'
  description: string
  matchedText: string
  quote: string
  speaker: EscalationTurn['speaker']
  turnIndex: number
}

export const ESCALATION_TRIGGERS: EscalationTriggerDefinition[] = [
  {
    id: 'lawsuit-threat',
    pattern:
      /\b(voy a demandar|quiero demandar|los voy a demandar|demandarlos|demandar|lawsuit|sue you|suing|my lawyer|mi abogado|attorney|legal action|acción legal|accion legal)\b/i,
    label: 'Legal / lawsuit threat',
    severity: 'critical',
    description: 'Customer mentioned lawsuit or legal action',
  },
  {
    id: 'debt-dispute',
    pattern:
      /\b(no gast[eé]|no reconozco|no es mi deuda|not my debt|never spent|didn't spend|did not spend|no hice esa compra|no compr[eé]|fraudulent|fraude|es un fraude|identity theft|robo de identidad|unauthorized charges|cargos no autorizados)\b/i,
    label: 'Debt dispute / fraud claim',
    severity: 'critical',
    description: 'Customer disputes the debt or claims fraud / unauthorized charges',
  },
  {
    id: 'cease-desist',
    pattern:
      /\b(cease and desist|dejen de llamar|deja de llamarme|stop calling|no me llamen|no vuelvan a llamar)\b/i,
    label: 'Cease contact request',
    severity: 'high',
    description: 'Customer requested to stop contact',
  },
  {
    id: 'bankruptcy',
    pattern: /\b(bankruptcy|bancarrota|chapter 7|chapter 13|capítulo 7|capitulo 7)\b/i,
    label: 'Bankruptcy mention',
    severity: 'high',
    description: 'Customer mentioned bankruptcy',
  },
  {
    id: 'harassment-claim',
    pattern:
      /\b(harassment|acoso|hostigamiento|voy a reportarlos|report you|consumer protection|protección al consumidor|proteccion al consumidor|cfpb|ftc)\b/i,
    label: 'Harassment / regulator threat',
    severity: 'high',
    description: 'Customer threatened regulatory complaint or harassment claim',
  },
]

export function detectEscalationInText(
  text: string,
  speaker: EscalationTurn['speaker'],
  turnIndex: number,
): EscalationTriggerMatch[] {
  const matches: EscalationTriggerMatch[] = []
  for (const trigger of ESCALATION_TRIGGERS) {
    const match = text.match(trigger.pattern)
    if (match) {
      matches.push({
        id: trigger.id,
        label: trigger.label,
        severity: trigger.severity,
        description: trigger.description,
        matchedText: match[0],
        quote: text.trim(),
        speaker,
        turnIndex,
      })
    }
  }
  return matches
}

export function detectEscalationInTurns(
  turns: EscalationTurn[],
  fromIndex = 0,
): EscalationTriggerMatch[] {
  const found: EscalationTriggerMatch[] = []
  turns.forEach((turn, index) => {
    if (index < fromIndex) return
    if (turn.speaker !== 'customer' && turn.speaker !== 'agent') return
    found.push(...detectEscalationInText(turn.text, turn.speaker, index))
  })
  return found
}

export function escalationAlertKey(match: EscalationTriggerMatch): string {
  return `${match.id}:${match.turnIndex}`
}
