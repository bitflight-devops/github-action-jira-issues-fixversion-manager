import * as fs from 'node:fs';
import { readFileSync } from 'node:fs';

/**
 * Error message constant for empty path arguments.
 * @internal
 */
const empty_path_error_msg = "Arg 'path' must not be empty";

/**
 * Checks whether a file or directory exists at the specified path.
 *
 * This is a synchronous wrapper around `fs.existsSync` with input validation.
 *
 * @param path - The absolute or relative path to check for existence.
 * @returns `true` if the path exists (file or directory), `false` otherwise.
 * @throws {Error} If the path argument is empty, null, or undefined.
 *
 * @example
 * ```typescript
 * if (existsSync('/path/to/file.txt')) {
 *   console.log('File exists');
 * }
 * ```
 */
export function existsSync(path: string): boolean {
  if (!path) {
    throw new Error(empty_path_error_msg);
  }

  return fs.existsSync(path);
}

/**
 * Checks whether a directory exists at the specified path.
 *
 * Verifies both that the path exists and that it refers to a directory (not a file).
 * Optionally throws an error if the directory is required but does not exist.
 *
 * @param path - The absolute or relative path to check.
 * @param required - If `true`, throws an error when the directory does not exist.
 *                   Defaults to `false`.
 * @returns `true` if the path exists and is a directory, `false` otherwise
 *          (when `required` is `false`).
 * @throws {Error} If the path argument is empty, null, or undefined.
 * @throws {Error} If `required` is `true` and the directory does not exist.
 *
 * @example
 * ```typescript
 * // Optional check - returns boolean
 * if (directoryExistsSync('/path/to/dir')) {
 *   console.log('Directory exists');
 * }
 *
 * // Required check - throws if missing
 * directoryExistsSync('/path/to/required/dir', true);
 * ```
 */
export function directoryExistsSync(path: string, required?: boolean): boolean {
  if (!path) {
    throw new Error(empty_path_error_msg);
  }
  if (existsSync(path)) {
    const stats: fs.Stats = fs.statSync(path);
    if (stats.isDirectory()) {
      return true;
    }
  }
  if (!required) {
    return false;
  }
  throw new Error(`Directory '${path}' does not exist`);
}

/**
 * Checks whether a file (not a directory) exists at the specified path.
 *
 * Verifies both that the path exists and that it refers to a regular file,
 * not a directory.
 *
 * @param path - The absolute or relative path to check.
 * @returns `true` if the path exists and is a file, `false` otherwise.
 * @throws {Error} If the path argument is empty, null, or undefined.
 *
 * @example
 * ```typescript
 * if (fileExistsSync('/path/to/config.json')) {
 *   const config = JSON.parse(loadFileSync('/path/to/config.json'));
 * }
 * ```
 */
export function fileExistsSync(path: string): boolean {
  if (!path) {
    throw new Error(empty_path_error_msg);
  }
  if (existsSync(path)) {
    const stats = fs.statSync(path);
    if (!stats.isDirectory()) {
      return true;
    }
  }

  return false;
}

/**
 * Reads and returns the entire contents of a file as a UTF-8 string.
 *
 * This is a synchronous file reading operation that validates the path
 * and checks for file existence before attempting to read.
 *
 * @param path - The absolute or relative path to the file to read.
 * @returns The file contents as a UTF-8 encoded string.
 * @throws {Error} If the path argument is empty, null, or undefined.
 * @throws {Error} If the file does not exist at the specified path.
 * @throws {Error} If an error occurs while reading the file (e.g., permission denied).
 *
 * @example
 * ```typescript
 * try {
 *   const content = loadFileSync('/path/to/config.yaml');
 *   const config = YAML.parse(content);
 * } catch (error) {
 *   console.error('Failed to load config:', error.message);
 * }
 * ```
 */
export function loadFileSync(path: string): string {
  if (!path) {
    throw new Error(empty_path_error_msg);
  }
  try {
    if (fileExistsSync(path)) {
      return readFileSync(path, 'utf8');
    }
  } catch (error) {
    throw new Error(`Encountered an error when reading file '${path}': ${(error as Error).message}`);
  }
  throw new Error(`Encountered an error when reading file '${path}': file not there`);
}
