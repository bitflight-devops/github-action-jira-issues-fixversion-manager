export const issueIdRegEx = /([\dA-Za-z]+-\d+)/g;

export function isError(error: any): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
export function toCommaDelimitedString(strSet?: Set<string> | IterableIterator<string> | string[]): string {
  if (strSet) {
    return [...strSet].join(',');
  }
  return '';
}

export function nullIfEmpty(str?: string[] | null): string[] | null {
  if (!str || !Array.isArray(str)) {
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

export function formatDate(date: string | number | Date): string {
  const d = new Date(date);
  let month = `${d.getMonth() + 1}`;
  let day = `${d.getDate()}`;
  const year = d.getFullYear();

  if (month.length < 2) month = `0${month}`;
  if (day.length < 2) day = `0${day}`;

  return [year, month, day].join('-');
}
