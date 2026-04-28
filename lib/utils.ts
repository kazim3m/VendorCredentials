export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function addMinutesUtc(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function dateOnlyUtc(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

export function dateOnlyDubai(input = new Date()): Date {
  const dubaiString = input.toLocaleDateString("en-CA", {
    timeZone: "Asia/Dubai"
  });
  return new Date(`${dubaiString}T00:00:00.000Z`);
}

export function daysBetween(fromDate: Date, toDate: Date): number {
  const ms = dateOnlyUtc(toDate).getTime() - dateOnlyUtc(fromDate).getTime();
  return Math.floor(ms / 86_400_000);
}

export function fullName(firstName: string, middleName: string | null | undefined, lastName: string) {
  return [firstName, middleName, lastName].filter(Boolean).join(" ");
}

export function formatDateOnly(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  return date.toISOString().slice(0, 10);
}

export function formatDateInputValue(input: Date | string): string {
  return formatDateOnly(input);
}

export function normalizeDateOnly(input: Date | string): string {
  return formatDateOnly(input);
}

export function normalizeDateOnlyUtc(input: Date): Date {
  return dateOnlyUtc(input);
}

export function makePersonFileBase(firstName: string, lastName: string): string {
  return `${sanitizeFilename(firstName)}_${sanitizeFilename(lastName)}`;
}
