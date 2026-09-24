import { describe, expect, it } from 'vitest'
import { isValidEmail } from './email'

describe('isValidEmail', () => {
  it('rejects incomplete addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('abc')).toBe(false)
    expect(isValidEmail('abc@')).toBe(false)
    expect(isValidEmail('abc@domain')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
  })

  it('accepts a normal email', () => {
    expect(isValidEmail('reader@example.com')).toBe(true)
    expect(isValidEmail('  you@email.co  ')).toBe(true)
  })
})
