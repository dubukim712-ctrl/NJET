export function singleParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value?: string | string[]): number {
  const page = Number(singleParam(value));
  return Number.isInteger(page) && page > 0 ? page : 1;
}
