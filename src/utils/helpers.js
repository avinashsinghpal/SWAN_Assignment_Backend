/**
 * Utility helpers shared across the codebase.
 */

/**
 * Escape special regex characters in a string to prevent regex injection.
 * Used before inserting user-supplied search strings into a RegExp.
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a success response envelope.
 * @param {unknown} data
 * @param {{ page?: number, pageSize?: number, total?: number, totalPages?: number }} [meta]
 * @returns {{ success: boolean, data: unknown, meta?: object }}
 */
export function successResponse(data, meta) {
  const envelope = { success: true, data };
  if (meta !== undefined) envelope.meta = meta;
  return envelope;
}

/**
 * Sanitise a string for use in a CSV cell.
 * Prefix cells that start with = + - @ with an apostrophe to prevent CSV injection.
 * Wraps the value in double quotes and escapes any embedded double quotes.
 * @param {unknown} value
 * @returns {string}
 */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // CSV injection prevention
  const dangerous = ['=', '+', '-', '@'];
  const safe = dangerous.some((c) => str.startsWith(c)) ? `'${str}` : str;
  // Escape double quotes by doubling them and wrap in quotes if needed
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Convert an array of objects to a CSV string.
 * @param {string[]} headers - Column headers
 * @param {unknown[][]} rows - Array of row arrays
 * @returns {string}
 */
export function buildCsv(headers, rows) {
  const header = headers.map(csvCell).join(',');
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  return `${header}\n${body}`;
}

/**
 * Parse a comma-separated query parameter into an array of strings.
 * Returns an empty array if the param is missing or empty.
 * @param {string | undefined} param
 * @returns {string[]}
 */
export function parseCommaSeparated(param) {
  if (!param) return [];
  return param
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Validate that a string is a valid MongoDB ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
export function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}
