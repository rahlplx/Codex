import { describe, it, expect } from 'vitest'
import { classifyDomain } from '../../../backend/src/orchestrator/domain.js'

describe('classifyDomain', () => {
  it('returns general for empty messages', () => {
    expect(classifyDomain([])).toBe('general')
  })

  it('returns general when last user message has no content', () => {
    expect(classifyDomain([{ role: 'user', content: '' }])).toBe('general')
  })

  it('returns general when no domain keywords match', () => {
    expect(classifyDomain([{ role: 'user', content: 'hello there' }])).toBe('general')
  })

  it('classifies coding messages', () => {
    expect(classifyDomain([{ role: 'user', content: 'Can you help me debug this TypeScript function?' }])).toBe('coding')
    expect(classifyDomain([{ role: 'user', content: 'Write a Python script to parse JSON' }])).toBe('coding')
    expect(classifyDomain([{ role: 'user', content: 'Implement a binary search algorithm' }])).toBe('coding')
  })

  it('classifies creative messages', () => {
    expect(classifyDomain([{ role: 'user', content: 'Write a short story about a dragon' }])).toBe('creative')
    expect(classifyDomain([{ role: 'user', content: 'Compose a poem about autumn' }])).toBe('creative')
    expect(classifyDomain([{ role: 'user', content: 'Create a fictional character for my novel' }])).toBe('creative')
  })

  it('classifies reasoning messages', () => {
    expect(classifyDomain([{ role: 'user', content: 'Analyze the pros and cons of this decision' }])).toBe('reasoning')
    expect(classifyDomain([{ role: 'user', content: 'Compare these two architecture approaches' }])).toBe('reasoning')
    expect(classifyDomain([{ role: 'user', content: 'Explain why this strategy might fail' }])).toBe('reasoning')
  })

  it('uses the last user message, ignoring assistant turns', () => {
    const messages = [
      { role: 'user', content: 'Write a poem about the ocean' },
      { role: 'assistant', content: 'Here is a poem...' },
      { role: 'user', content: 'Now debug this TypeScript error' },
    ]
    expect(classifyDomain(messages)).toBe('coding')
  })

  it('ignores assistant and system messages when finding last user message', () => {
    const messages = [
      { role: 'system', content: 'You are a coding assistant' },
      { role: 'user', content: 'analyze the tradeoffs of this design' },
      { role: 'assistant', content: 'Great question...' },
    ]
    expect(classifyDomain(messages)).toBe('reasoning')
  })

  it('picks highest-scoring domain when multiple match', () => {
    const messages = [{ role: 'user', content: 'analyze compare explain why this code algorithm function is correct' }]
    expect(classifyDomain(messages)).toBe('reasoning')
  })
})
