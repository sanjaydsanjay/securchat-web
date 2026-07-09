export function generateClientUniqueId(): number {
  return Math.floor(Math.random() * 899999) + 100000
}

export function isValidUniqueId(value: number): boolean {
  return Number.isInteger(value) && value >= 100000 && value <= 999999
}

export function formatUniqueId(value: number): string {
  return value.toString().padStart(6, '0')
}
