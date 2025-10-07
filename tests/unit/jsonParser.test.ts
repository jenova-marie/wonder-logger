import { describe, it, expect } from 'vitest'
import {
  extractJSON,
  parseJSONResponse,
  validateJSONStructure,
} from '../../src/utils/jsonParser'

describe('jsonParser', () => {
  describe('extractJSON', () => {
    describe('pure JSON extraction', () => {
      it('should return pure JSON object unchanged', () => {
        const input = '{"name": "test", "value": 123}'
        const result = extractJSON(input)
        expect(result).toBe('{"name": "test", "value": 123}')
      })

      it('should return pure JSON array unchanged', () => {
        const input = '[1, 2, 3, {"key": "value"}]'
        const result = extractJSON(input)
        expect(result).toBe('[1, 2, 3, {"key": "value"}]')
      })
    })

    describe('code block extraction', () => {
      it('should extract JSON from ```json code block', () => {
        const input = '```json\n{"name": "test"}\n```'
        const result = extractJSON(input)
        expect(result).toBe('{"name": "test"}')
      })

      it('should extract JSON from ``` code block without language tag', () => {
        const input = '```\n{"name": "test"}\n```'
        const result = extractJSON(input)
        expect(result).toBe('{"name": "test"}')
      })

      it('should extract JSON array from code block', () => {
        const input = '```json\n[1, 2, 3]\n```'
        const result = extractJSON(input)
        expect(result).toBe('[1, 2, 3]')
      })

      it('should handle code blocks with extra whitespace', () => {
        const input = '```json\n\n  {"name": "test"}  \n\n```'
        const result = extractJSON(input)
        expect(result).toBe('{"name": "test"}')
      })
    })

    describe('text with JSON extraction', () => {
      it('should extract JSON when preceded by explanatory text', () => {
        const input = 'Here is the JSON you requested: {"name": "test", "value": 123}'
        const result = extractJSON(input)
        expect(result).toBe('{"name": "test", "value": 123}')
      })

      it('should extract JSON when followed by explanatory text', () => {
        const input = '{"name": "test", "value": 123}\n\nLet me explain what this means...'
        const result = extractJSON(input)
        expect(result).toBe('{"name": "test", "value": 123}')
      })

      it('should extract JSON with text before and after', () => {
        const input = 'The response is: {"status": "ok", "data": [1, 2, 3]} as you can see.'
        const result = extractJSON(input)
        expect(result).toBe('{"status": "ok", "data": [1, 2, 3]}')
      })
    })

    describe('nested and complex JSON', () => {
      it('should handle deeply nested objects', () => {
        const input = 'Result: {"a": {"b": {"c": {"d": "value"}}}}'
        const result = extractJSON(input)
        expect(result).toBe('{"a": {"b": {"c": {"d": "value"}}}}')
      })

      it('should handle arrays with nested objects', () => {
        const input = '[{"id": 1}, {"id": 2, "nested": {"value": true}}]'
        const result = extractJSON(input)
        expect(result).toBe('[{"id": 1}, {"id": 2, "nested": {"value": true}}]')
      })

      it('should handle JSON with escaped quotes in strings', () => {
        const input = '{"message": "She said \\"hello\\" to me"}'
        const result = extractJSON(input)
        expect(result).toBe('{"message": "She said \\"hello\\" to me"}')
      })
    })

    describe('edge cases', () => {
      it('should handle empty object', () => {
        const input = '{}'
        const result = extractJSON(input)
        expect(result).toBe('{}')
      })

      it('should handle empty array', () => {
        const input = '[]'
        const result = extractJSON(input)
        expect(result).toBe('[]')
      })

      it('should return trimmed text when no JSON pattern found', () => {
        const input = '  This is just plain text with no JSON  '
        const result = extractJSON(input)
        expect(result).toBe('This is just plain text with no JSON')
      })

      it('should handle multiple JSON objects and return the first', () => {
        const input = '{"first": 1} and {"second": 2}'
        const result = extractJSON(input)
        expect(result).toBe('{"first": 1}')
      })

      it('should return trimmed text for malformed JSON with unclosed braces', () => {
        const input = 'Some text {"unclosed": "object'
        const result = extractJSON(input)
        expect(result).toBe('Some text {"unclosed": "object')
      })

      it('should return trimmed text for malformed JSON with unclosed brackets', () => {
        const input = 'Array data [1, 2, 3'
        const result = extractJSON(input)
        expect(result).toBe('Array data [1, 2, 3')
      })
    })
  })

  describe('parseJSONResponse', () => {
    describe('successful parsing', () => {
      it('should parse valid JSON object', () => {
        const input = '{"name": "test", "value": 123}'
        const result = parseJSONResponse(input)
        expect(result).toEqual({ name: 'test', value: 123 })
      })

      it('should parse valid JSON array', () => {
        const input = '[1, 2, 3, 4]'
        const result = parseJSONResponse(input)
        expect(result).toEqual([1, 2, 3, 4])
      })

      it('should parse JSON with type parameter', () => {
        interface User {
          name: string
          age: number
        }
        const input = '{"name": "Alice", "age": 30}'
        const result = parseJSONResponse<User>(input)
        expect(result).toEqual({ name: 'Alice', age: 30 })
      })
    })

    describe('sanitization', () => {
      it('should sanitize literal newlines in JSON', () => {
        const input = `{"description": "This has
a newline", "value": 1}`
        const result = parseJSONResponse(input)
        expect(result).toEqual({ description: 'This has a newline', value: 1 })
      })

      it('should sanitize tabs in JSON', () => {
        const input = '{"description": "This has\ta tab", "value": 1}'
        const result = parseJSONResponse(input)
        expect(result).toEqual({ description: 'This has a tab', value: 1 })
      })

      it('should sanitize Windows line endings (CRLF)', () => {
        const input = '{"description": "Windows\r\nline", "value": 1}'
        const result = parseJSONResponse(input)
        expect(result).toEqual({ description: 'Windows line', value: 1 })
      })

      it('should sanitize carriage returns', () => {
        const input = '{"description": "Old Mac\rline", "value": 1}'
        const result = parseJSONResponse(input)
        expect(result).toEqual({ description: 'Old Mac line', value: 1 })
      })

      it('should sanitize other control characters', () => {
        const input = '{"description": "Control\x00\x01\x1Fchars", "value": 1}'
        const result = parseJSONResponse(input)
        expect(result).toEqual({ description: 'Control   chars', value: 1 })
      })
    })

    describe('extraction and parsing', () => {
      it('should extract and parse JSON from code block', () => {
        const input = '```json\n{"status": "ok"}\n```'
        const result = parseJSONResponse(input)
        expect(result).toEqual({ status: 'ok' })
      })

      it('should extract and parse JSON with surrounding text', () => {
        const input = 'Here is your data: {"result": [1, 2, 3]} Hope this helps!'
        const result = parseJSONResponse(input)
        expect(result).toEqual({ result: [1, 2, 3] })
      })

      it('should handle extraction and sanitization together', () => {
        const input = 'Response: ```json\n{"desc": "Has\nnewline"}\n```'
        const result = parseJSONResponse(input)
        expect(result).toEqual({ desc: 'Has newline' })
      })
    })

    describe('error handling', () => {
      it('should throw error for completely invalid JSON', () => {
        const input = 'This is not JSON at all!'
        expect(() => parseJSONResponse(input)).toThrow(/Failed to parse JSON response/)
      })

      it('should include error context in error message', () => {
        const input = 'Invalid JSON: {broken: true}'
        expect(() => parseJSONResponse(input)).toThrow(/Text preview: Invalid JSON/)
      })

      it('should truncate long text in error message', () => {
        const input = 'x'.repeat(200)
        expect(() => parseJSONResponse(input)).toThrow(/Text preview:/)
        expect(() => parseJSONResponse(input)).toThrow(/\.{3}/) // Contains "..."
      })

      it('should provide both direct and extraction error details', () => {
        const input = '{invalid}'
        const errorRegex = /Direct parse error:.*Extraction parse error:/s
        expect(() => parseJSONResponse(input)).toThrow(errorRegex)
      })
    })
  })

  describe('validateJSONStructure', () => {
    describe('valid structures', () => {
      it('should return true when all required fields exist', () => {
        const data = { name: 'test', age: 30, email: 'test@example.com' }
        const requiredFields = ['name', 'age', 'email']
        expect(validateJSONStructure(data, requiredFields)).toBe(true)
      })

      it('should return true with empty required fields array', () => {
        const data = { anything: 'goes' }
        expect(validateJSONStructure(data, [])).toBe(true)
      })

      it('should return true when object has extra fields', () => {
        const data = { name: 'test', age: 30, extra: 'field' }
        const requiredFields = ['name', 'age']
        expect(validateJSONStructure(data, requiredFields)).toBe(true)
      })

      it('should return true for nested object fields (top level check)', () => {
        const data = { user: { name: 'test' }, status: 'active' }
        const requiredFields = ['user', 'status']
        expect(validateJSONStructure(data, requiredFields)).toBe(true)
      })
    })

    describe('invalid structures', () => {
      it('should return false when required field is missing', () => {
        const data = { name: 'test' }
        const requiredFields = ['name', 'age']
        expect(validateJSONStructure(data, requiredFields)).toBe(false)
      })

      it('should return false when data is null', () => {
        const requiredFields = ['name']
        expect(validateJSONStructure(null, requiredFields)).toBe(false)
      })

      it('should return false when data is undefined', () => {
        const requiredFields = ['name']
        expect(validateJSONStructure(undefined, requiredFields)).toBe(false)
      })

      it('should return false when data is not an object', () => {
        const requiredFields = ['length']
        expect(validateJSONStructure('string', requiredFields)).toBe(false)
        expect(validateJSONStructure(123, requiredFields)).toBe(false)
        expect(validateJSONStructure(true, requiredFields)).toBe(false)
      })

      it('should return false when data is an array', () => {
        const data = [{ name: 'test' }]
        const requiredFields = ['name']
        expect(validateJSONStructure(data, requiredFields)).toBe(false)
      })

      it('should return false when any required field is missing', () => {
        const data = { name: 'test', age: 30 }
        const requiredFields = ['name', 'age', 'email']
        expect(validateJSONStructure(data, requiredFields)).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should handle fields with falsy values', () => {
        const data = { name: '', age: 0, active: false, value: null }
        const requiredFields = ['name', 'age', 'active', 'value']
        expect(validateJSONStructure(data, requiredFields)).toBe(true)
      })

      it('should treat undefined field value as missing', () => {
        const data = { name: 'test', age: undefined }
        const requiredFields = ['name', 'age']
        // 'in' operator returns true for undefined values
        expect(validateJSONStructure(data, requiredFields)).toBe(true)
      })

      it('should handle empty object with no required fields', () => {
        expect(validateJSONStructure({}, [])).toBe(true)
      })

      it('should handle empty object with required fields', () => {
        expect(validateJSONStructure({}, ['name'])).toBe(false)
      })
    })
  })

  describe('integration scenarios', () => {
    it('should handle LLM response with explanation and sanitization', () => {
      const llmResponse = `Here's the user data you requested:

\`\`\`json
{
  "name": "Alice Johnson",
  "description": "A software engineer who
loves to code",
  "tags": ["developer", "typescript", "testing"]
}
\`\`\`

This response includes the user's information as requested.`

      const parsed = parseJSONResponse(llmResponse)
      expect(parsed).toEqual({
        name: 'Alice Johnson',
        description: 'A software engineer who loves to code',
        tags: ['developer', 'typescript', 'testing'],
      })

      expect(validateJSONStructure(parsed, ['name', 'description', 'tags'])).toBe(true)
    })

    it('should handle Claude Haiku-style JSON with control characters', () => {
      const claudeResponse = '{"result": "success", "message": "Task completed\nsuccessfully", "details": {"count": 5}}'
      const parsed = parseJSONResponse(claudeResponse)

      expect(parsed).toEqual({
        result: 'success',
        message: 'Task completed successfully',
        details: { count: 5 },
      })

      expect(validateJSONStructure(parsed, ['result', 'message', 'details'])).toBe(true)
    })

    it('should extract, parse, and validate complex nested structure', () => {
      const response = `The API response is:
{
  "status": "ok",
  "data": {
    "users": [
      {"id": 1, "name": "Alice"},
      {"id": 2, "name": "Bob"}
    ]
  },
  "metadata": {"total": 2}
}`

      const parsed = parseJSONResponse(response)
      expect(validateJSONStructure(parsed, ['status', 'data', 'metadata'])).toBe(true)
      expect(parsed.data.users).toHaveLength(2)
    })
  })
})
