/**
 * Regular expression pattern for matching Jira issue keys.
 *
 * Matches issue keys in the format `PROJECT-123` where:
 * - Project key: One or more alphanumeric characters (letters A-Z, a-z, or digits 0-9)
 * - Separator: A hyphen (`-`)
 * - Issue number: One or more digits
 *
 * The global flag (`g`) enables finding all matches in a string.
 *
 * @example
 * ```typescript
 * const text = 'Fixed PROJ-123 and ABC-456';
 * const matches = text.match(issueIdRegEx);
 * // matches: ['PROJ-123', 'ABC-456']
 * ```
 */
export const issueIdRegEx = /([\dA-Za-z]+-\d+)/g;

/**
 * Type guard that checks if a value is a Node.js error with errno properties.
 *
 * Determines whether the provided value is an instance of `Error`, which allows
 * TypeScript to narrow the type to `NodeJS.ErrnoException` for safe property access.
 *
 * @param error - The value to check, typically from a catch block.
 * @returns `true` if the value is an Error instance, `false` otherwise.
 *
 * @example
 * ```typescript
 * try {
 *   fs.readFileSync('/nonexistent');
 * } catch (error) {
 *   if (isError(error)) {
 *     console.error('Error code:', error.code);
 *     console.error('Error message:', error.message);
 *   }
 * }
 * ```
 */
export function isError(error: any): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

/**
 * Converts an iterable collection of strings to a comma-delimited string.
 *
 * Accepts various iterable types including `Set<string>`, `IterableIterator<string>`,
 * or `string[]` and joins all elements with commas.
 *
 * @param strSet - The collection of strings to join. Can be a Set, Iterator, or array.
 *                 If `undefined` or falsy, returns an empty string.
 * @returns A comma-separated string of all elements, or an empty string if input is empty or undefined.
 *
 * @example
 * ```typescript
 * // From a Set
 * const issueSet = new Set(['PROJ-1', 'PROJ-2', 'PROJ-3']);
 * toCommaDelimitedString(issueSet); // 'PROJ-1,PROJ-2,PROJ-3'
 *
 * // From an array
 * toCommaDelimitedString(['a', 'b', 'c']); // 'a,b,c'
 *
 * // From undefined
 * toCommaDelimitedString(undefined); // ''
 * ```
 */
export function toCommaDelimitedString(strSet?: Set<string> | IterableIterator<string> | string[]): string {
  if (strSet) {
    return [...strSet].join(',');
  }
  return '';
}

/**
 * Returns `null` if the input array is empty, contains only an empty string, or is not a valid array.
 *
 * This utility normalizes "empty" array states to `null` for consistent handling
 * in contexts where an absent value should be explicitly represented as `null`
 * rather than an empty array.
 *
 * @param str - The string array to check. Can be `undefined`, `null`, or an array of strings.
 * @returns The original array if it contains meaningful values, or `null` if the array
 *          is empty, undefined, null, or contains only an empty string as its first element.
 *
 * @example
 * ```typescript
 * nullIfEmpty(['PROJ-1', 'PROJ-2']); // ['PROJ-1', 'PROJ-2']
 * nullIfEmpty([]);                   // null
 * nullIfEmpty(['']);                 // null
 * nullIfEmpty(null);                 // null
 * nullIfEmpty(undefined);            // null
 * ```
 */
export function nullIfEmpty(str?: string[] | null): string[] | null {
  if (!(str && Array.isArray(str))) {
    return null;
  }
  if (str.length === 0) {
    return null;
  }
  if (str[0] === '') {
    return null;
  }
  return str;
}

/**
 * Formats a date value as an ISO 8601 date string (YYYY-MM-DD).
 *
 * Converts various date input types to a standardized date string format
 * suitable for Jira API calls and other systems expecting ISO date format.
 *
 * @param date - The date to format. Accepts:
 *               - A `Date` object
 *               - A numeric timestamp (milliseconds since Unix epoch)
 *               - A date string parseable by `Date` constructor
 * @returns The formatted date string in `YYYY-MM-DD` format.
 *
 * @example
 * ```typescript
 * // From Date object
 * formatDate(new Date('2024-03-15')); // '2024-03-15'
 *
 * // From timestamp
 * formatDate(1710460800000); // '2024-03-15'
 *
 * // From date string
 * formatDate('March 15, 2024'); // '2024-03-15'
 * ```
 */
export function formatDate(date: string | number | Date): string {
  const d = new Date(date);
  let month = `${d.getMonth() + 1}`;
  let day = `${d.getDate()}`;
  const year = d.getFullYear();

  if (month.length < 2) month = `0${month}`;
  if (day.length < 2) day = `0${day}`;

  return [year, month, day].join('-');
}
