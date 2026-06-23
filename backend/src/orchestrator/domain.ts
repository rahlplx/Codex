const PATTERNS: Record<string, RegExp> = {
  coding: /\b(code|function|class|bug|error|implement|debug|refactor|script|algorithm|typescript|javascript|python|rust|go|api|database|sql|query|endpoint|test|lint|compile|build|deploy|docker|git|pr|pull request|type|interface|generic|async|await|promise|loop|array|object|method|variable|import|export)\b/gi,
  creative: /\b(write|story|poem|essay|blog|creative|fiction|character|narrative|describe|imagine|create|novel|plot|dialogue|screenplay|lyrics|rhyme|haiku|metaphor|tone|voice|style|scene|setting)\b/gi,
  reasoning: /\b(analyze|analyse|compare|explain|plan|why|how does|evaluate|assess|strategy|think|reason|logic|pros|cons|decision|tradeoff|trade-off|architecture|design|approach|consider|critique|review|summarize|summarise|implications|consequences)\b/gi,
}

export type Domain = 'coding' | 'creative' | 'reasoning' | 'general'

export function classifyDomain(messages: Array<{ role: string; content: string }>): Domain {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  if (!lastUser?.content) return 'general'

  const text = lastUser.content
  const scores: Record<string, number> = {
    coding: (text.match(PATTERNS['coding']!) ?? []).length,
    creative: (text.match(PATTERNS['creative']!) ?? []).length,
    reasoning: (text.match(PATTERNS['reasoning']!) ?? []).length,
  }

  const max = Math.max(...Object.values(scores))
  if (max === 0) return 'general'

  const winner = Object.entries(scores).find(([, v]) => v === max)
  return (winner?.[0] ?? 'general') as Domain
}
