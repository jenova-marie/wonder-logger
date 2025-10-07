/**
 * Utility functions for parsing JSON from LLM responses
 * LLMs sometimes include explanatory text before/after JSON
 *
 * @requires - No external dependencies (pure TypeScript utility)
 */

/**
 * Extract JSON from text that may contain additional content
 * Handles common patterns:
 * - "Here is the JSON: {...}"
 * - "```json\n{...}\n```"
 * - "{...}\n\nLet me explain..."
 * - Pure JSON
 */
export function extractJSON(text: string): string {
  // First, try to find JSON within code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find properly balanced JSON object or array
  // This handles cases where there's text after the JSON
  const jsonExtracted = extractBalancedJSON(text);
  if (jsonExtracted) {
    return jsonExtracted;
  }

  // Return original text if no JSON pattern found
  return text.trim();
}

/**
 * Extract a balanced JSON object or array from text
 * Handles text before and after the JSON
 */
function extractBalancedJSON(text: string): string | null {
  // Find first { or [
  const startBrace = text.indexOf('{');
  const startBracket = text.indexOf('[');

  let start = -1;
  let isObject = true;

  if (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) {
    start = startBrace;
    isObject = true;
  } else if (startBracket !== -1) {
    start = startBracket;
    isObject = false;
  } else {
    return null;
  }

  // Find matching closing brace/bracket
  const openChar = isObject ? '{' : '[';
  const closeChar = isObject ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === openChar) {
      depth++;
    } else if (char === closeChar) {
      depth--;
      if (depth === 0) {
        // Found the matching closing character
        return text.substring(start, i + 1).trim();
      }
    }
  }

  return null;
}

/**
 * Sanitize JSON string by removing/escaping control characters
 * Claude Haiku often returns JSON with literal newlines/tabs in description fields
 */
function sanitizeJSON(text: string): string {
  // First, replace literal control characters globally (not just in strings)
  // This handles cases where control chars appear anywhere in the JSON
  let sanitized = text
    .replace(/\r\n/g, ' ')  // Windows line endings
    .replace(/\n/g, ' ')     // Unix line endings
    .replace(/\r/g, ' ')     // Old Mac line endings
    .replace(/\t/g, ' ')     // Tabs
    .replace(/[\x00-\x1F]/g, ' '); // Other control characters

  return sanitized;
}

/**
 * Parse JSON with robust error handling
 * Attempts to extract JSON from text if direct parsing fails
 */
export function parseJSONResponse<T = any>(text: string): T {
  // First attempt: sanitize and parse directly
  try {
    const sanitized = sanitizeJSON(text);
    return JSON.parse(sanitized);
  } catch (firstError) {
    // Second attempt: extract JSON first, then sanitize and parse
    try {
      const extracted = extractJSON(text);
      const sanitized = sanitizeJSON(extracted);
      return JSON.parse(sanitized);
    } catch (secondError) {
      // If both fail, throw error with context
      throw new Error(
        `Failed to parse JSON response. Direct parse error: ${firstError instanceof Error ? firstError.message : 'Unknown'}. ` +
        `Extraction parse error: ${secondError instanceof Error ? secondError.message : 'Unknown'}. ` +
        `Text preview: ${text.substring(0, 100)}...`
      );
    }
  }
}

/**
 * Validate that the parsed result has expected structure
 */
export function validateJSONStructure(
  data: any,
  requiredFields: string[]
): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return requiredFields.every((field) => field in data);
}
