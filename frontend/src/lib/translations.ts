type Translations = {
  status: Record<string, string>
  priority: Record<string, string>
  type: Record<string, string>
}

const TRANSLATIONS: Record<string, Translations> = {
  en: {
    status: {
      OPEN: 'Open', IN_PROGRESS: 'In Progress', WAITING_CLIENT: 'Awaiting Client',
      WAITING_DEV: 'Awaiting Dev', IN_DEV: 'In Development', WAITING_TEST: 'Awaiting Test',
      IN_TEST: 'In Testing', RESOLVED: 'Resolved', CLOSED: 'Closed', CANCELLED: 'Cancelled',
    },
    priority: { URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' },
    type: { BUG: 'Bug', IMPROVEMENT: 'Improvement', QUESTION: 'Question', SUPPORT: 'Support' },
  },
  'pt-BR': {
    status: {
      OPEN: 'Aberto', IN_PROGRESS: 'Em Atendimento', WAITING_CLIENT: 'Ag. Cliente',
      WAITING_DEV: 'Ag. Desenvolvimento', IN_DEV: 'Em Desenvolvimento', WAITING_TEST: 'Ag. Teste',
      IN_TEST: 'Em Teste', RESOLVED: 'Resolvido', CLOSED: 'Fechado', CANCELLED: 'Cancelado',
    },
    priority: { URGENT: 'Urgente', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo' },
    type: { BUG: 'Bug', IMPROVEMENT: 'Melhoria', QUESTION: 'Dúvida', SUPPORT: 'Suporte' },
  },
}

function resolve(lang: string): Translations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS[lang.split('-')[0] ?? ''] ?? TRANSLATIONS['en']!
}

export function tStatus(lang: string, value: string): string {
  const key = value.toUpperCase()
  return resolve(lang).status[key] ?? value
}

export function tPriority(lang: string, value: string): string {
  const key = value.toUpperCase()
  return resolve(lang).priority[key] ?? value
}

export function tType(lang: string, value: string): string {
  const key = value.toUpperCase()
  return resolve(lang).type[key] ?? value
}
