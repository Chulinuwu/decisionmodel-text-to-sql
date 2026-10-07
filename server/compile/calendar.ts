const parse = (date: string) => new Date(`${date}T00:00:00Z`);
const format = (date: Date) => date.toISOString().slice(0, 10);

export function addMonths(date: string, months: number) {
  const value = parse(date);
  value.setUTCMonth(value.getUTCMonth() + months);
  return format(value);
}

export function addDays(date: string, days: number) {
  const value = parse(date);
  value.setUTCDate(value.getUTCDate() + days);
  return format(value);
}

export const monthsBetween = (from: string, to: string) => {
  const a = parse(from), b = parse(to);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
};
export const daysBetween = (from: string, to: string) => Math.round((parse(to).getTime() - parse(from).getTime()) / 86400000);
export const yearStart = (date: string) => `${date.slice(0, 4)}-01-01`;
export const isIsoDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && format(parse(value)) === value;
