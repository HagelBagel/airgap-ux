import { describe, expect, it } from 'vitest'
import { parseProjectName, toProjectDto } from './dto.ts'

describe('toProjectDto', () => {
  it('maps a row to camelCase with createdAt as an ISO string', () => {
    const dto = toProjectDto({
      id: 'a5f0c1de-0000-4000-8000-000000000000',
      name: 'Onboarding study',
      created_at: new Date('2026-11-06T09:30:00Z'),
    })
    expect(dto).toEqual({
      id: 'a5f0c1de-0000-4000-8000-000000000000',
      name: 'Onboarding study',
      createdAt: '2026-11-06T09:30:00.000Z',
    })
  })
})

describe('parseProjectName', () => {
  it('trims the name', () => {
    expect(parseProjectName('  Onboarding  ')).toEqual({ ok: true, name: 'Onboarding' })
  })

  it.each([
    ['empty', ''],
    ['only whitespace', '   '],
    ['201 characters', 'x'.repeat(201)],
    ['not a string', 42],
    ['missing', undefined],
  ])('rejects a name that is %s', (_label, input) => {
    expect(parseProjectName(input).ok).toBe(false)
  })

  it('accepts exactly 200 characters', () => {
    expect(parseProjectName('x'.repeat(200)).ok).toBe(true)
  })

  it('counts an emoji as one character, like Postgres char_length', () => {
    expect(parseProjectName('😀'.repeat(200)).ok).toBe(true)
  })
})
