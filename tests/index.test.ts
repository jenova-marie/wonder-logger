import { describe, it, expect } from 'vitest'
import { hello } from '../src/index'

describe('hello', () => {
  it('should return a greeting message', () => {
    expect(hello('World')).toBe('Hello, World!')
  })

  it('should greet by name', () => {
    expect(hello('Jenova')).toBe('Hello, Jenova!')
  })
})
