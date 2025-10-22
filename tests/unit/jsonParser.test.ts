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
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ name: 'test', value: 123 })
        }
      })

      it('should parse valid JSON array', () => {
        const input = '[1, 2, 3, 4]'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual([1, 2, 3, 4])
        }
      })

      it('should parse JSON with type parameter', () => {
        interface User {
          name: string
          age: number
        }
        const input = '{"name": "Alice", "age": 30}'
        const result = parseJSONResponse<User>(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ name: 'Alice', age: 30 })
        }
      })
    })

    describe('sanitization', () => {
      it('should sanitize literal newlines in JSON', () => {
        const input = `{"description": "This has
a newline", "value": 1}`
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ description: 'This has a newline', value: 1 })
        }
      })

      it('should sanitize tabs in JSON', () => {
        const input = '{"description": "This has\ta tab", "value": 1}'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ description: 'This has a tab', value: 1 })
        }
      })

      it('should sanitize Windows line endings (CRLF)', () => {
        const input = '{"description": "Windows\r\nline", "value": 1}'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ description: 'Windows line', value: 1 })
        }
      })

      it('should sanitize carriage returns', () => {
        const input = '{"description": "Old Mac\rline", "value": 1}'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ description: 'Old Mac line', value: 1 })
        }
      })

      it('should sanitize other control characters', () => {
        const input = '{"description": "Control\x00\x01\x1Fchars", "value": 1}'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ description: 'Control   chars', value: 1 })
        }
      })
    })

    describe('extraction and parsing', () => {
      it('should extract and parse JSON from code block', () => {
        const input = '```json\n{"status": "ok"}\n```'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ status: 'ok' })
        }
      })

      it('should extract and parse JSON with surrounding text', () => {
        const input = 'Here is your data: {"result": [1, 2, 3]} Hope this helps!'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ result: [1, 2, 3] })
        }
      })

      it('should handle extraction and sanitization together', () => {
        const input = 'Response: ```json\n{"desc": "Has\nnewline"}\n```'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual({ desc: 'Has newline' })
        }
      })
    })

    describe('error handling', () => {
      it('should return error for completely invalid JSON', () => {
        const input = 'This is not JSON at all!'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.kind).toBe('JSONExtractionError')
          expect(result.error.message).toMatch(/Failed to parse JSON response/)
        }
      })

      it('should include error context in error message', () => {
        const input = 'Invalid JSON: {broken: true}'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.context.textPreview).toContain('Invalid JSON')
        }
      })

      it('should truncate long text in error context', () => {
        const input = 'x'.repeat(200)
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.context.textPreview).toBeDefined()
          expect(result.error.context.textPreview.length).toBeLessThanOrEqual(100)
        }
      })

      it('should provide both direct and extraction error details', () => {
        const input = '{invalid}'
        const result = parseJSONResponse(input)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toMatch(/Direct parse error/)
          expect(result.error.message).toMatch(/Extraction parse error/)
        }
      })
    })
  })

  describe('validateJSONStructure', () => {
    describe('valid structures', () => {
      it('should return ok when all required fields exist', () => {
        const data = { name: 'test', age: 30, email: 'test@example.com' }
        const requiredFields = ['name', 'age', 'email']
        const result = validateJSONStructure(data, requiredFields)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toEqual(data)
        }
      })

      it('should return ok with empty required fields array', () => {
        const data = { anything: 'goes' }
        const result = validateJSONStructure(data, [])
        expect(result.ok).toBe(true)
      })

      it('should return ok when object has extra fields', () => {
        const data = { name: 'test', age: 30, extra: 'field' }
        const requiredFields = ['name', 'age']
        const result = validateJSONStructure(data, requiredFields)
        expect(result.ok).toBe(true)
      })

      it('should return ok for nested object fields (top level check)', () => {
        const data = { user: { name: 'test' }, status: 'active' }
        const requiredFields = ['user', 'status']
        const result = validateJSONStructure(data, requiredFields)
        expect(result.ok).toBe(true)
      })
    })

    describe('invalid structures', () => {
      it('should return error when required field is missing', () => {
        const data = { name: 'test' }
        const requiredFields = ['name', 'age']
        const result = validateJSONStructure(data, requiredFields)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.kind).toBe('JSONStructureError')
          expect(result.error.context.missingFields).toEqual(['age'])
        }
      })

      it('should return error when data is null', () => {
        const requiredFields = ['name']
        const result = validateJSONStructure(null, requiredFields)
        expect(result.ok).toBe(false)
      })

      it('should return error when data is undefined', () => {
        const requiredFields = ['name']
        const result = validateJSONStructure(undefined, requiredFields)
        expect(result.ok).toBe(false)
      })

      it('should return error when data is not an object', () => {
        const requiredFields = ['length']
        expect(validateJSONStructure('string', requiredFields).ok).toBe(false)
        expect(validateJSONStructure(123, requiredFields).ok).toBe(false)
        expect(validateJSONStructure(true, requiredFields).ok).toBe(false)
      })

      it('should return error when data is an array', () => {
        const data = [{ name: 'test' }]
        const requiredFields = ['name']
        const result = validateJSONStructure(data, requiredFields)
        expect(result.ok).toBe(false)
      })

      it('should return error when any required field is missing', () => {
        const data = { name: 'test', age: 30 }
        const requiredFields = ['name', 'age', 'email']
        const result = validateJSONStructure(data, requiredFields)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.context.missingFields).toEqual(['email'])
        }
      })
    })

    describe('edge cases', () => {
      it('should handle fields with falsy values', () => {
        const data = { name: '', age: 0, active: false, value: null }
        const requiredFields = ['name', 'age', 'active', 'value']
        const result = validateJSONStructure(data, requiredFields)
        expect(result.ok).toBe(true)
      })

      it('should treat undefined field value as present (in operator behavior)', () => {
        const data = { name: 'test', age: undefined }
        const requiredFields = ['name', 'age']
        // 'in' operator returns true for undefined values
        const result = validateJSONStructure(data, requiredFields)
        expect(result.ok).toBe(true)
      })

      it('should handle empty object with no required fields', () => {
        const result = validateJSONStructure({}, [])
        expect(result.ok).toBe(true)
      })

      it('should handle empty object with required fields', () => {
        const result = validateJSONStructure({}, ['name'])
        expect(result.ok).toBe(false)
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

      const parseResult = parseJSONResponse(llmResponse)
      expect(parseResult.ok).toBe(true)
      if (!parseResult.ok) return

      expect(parseResult.value).toEqual({
        name: 'Alice Johnson',
        description: 'A software engineer who loves to code',
        tags: ['developer', 'typescript', 'testing'],
      })

      const validateResult = validateJSONStructure(parseResult.value, ['name', 'description', 'tags'])
      expect(validateResult.ok).toBe(true)
    })

    it('should handle Claude Haiku-style JSON with control characters', () => {
      const claudeResponse = '{"result": "success", "message": "Task completed\nsuccessfully", "details": {"count": 5}}'
      const parseResult = parseJSONResponse(claudeResponse)
      expect(parseResult.ok).toBe(true)
      if (!parseResult.ok) return

      expect(parseResult.value).toEqual({
        result: 'success',
        message: 'Task completed successfully',
        details: { count: 5 },
      })

      const validateResult = validateJSONStructure(parseResult.value, ['result', 'message', 'details'])
      expect(validateResult.ok).toBe(true)
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

      const parseResult = parseJSONResponse(response)
      expect(parseResult.ok).toBe(true)
      if (!parseResult.ok) return

      const validateResult = validateJSONStructure(parseResult.value, ['status', 'data', 'metadata'])
      expect(validateResult.ok).toBe(true)
      expect(parseResult.value.data.users).toHaveLength(2)
    })
  })
})
