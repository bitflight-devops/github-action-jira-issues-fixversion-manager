export const issueIdRegEx = /([a-zA-Z0-9]+-[0-9]+)/g

export function nullIfEmpty(str: string[] | undefined | null): string[] | null {
  if (!str) {
    return null
  }
  if (str === []) {
    return null
  }
  if (str[0] === '') {
    return null
  }
  return str
}

export function formatDate(date: string | number | Date): string {
  var d = new Date(date),
    month = `${d.getMonth() + 1}`,
    day = `${d.getDate()}`,
    year = `${d.getFullYear()}`

  if (month.length < 2) month = '0' + month
  if (day.length < 2) day = '0' + day

  return [year, month, day].join('-')
}
