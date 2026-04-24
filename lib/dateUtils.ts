// Utility functions for date handling in Pacific Time

const PACIFIC_TIMEZONE = "America/Los_Angeles";

function extractPacificParts(date: Date, includeTime: boolean) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          fractionalSecondDigits: 3,
          hour12: false,
          timeZoneName: "shortOffset",
        }
      : {}),
  });

  const parts = formatter.formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: byType.get("year") || "0000",
    month: byType.get("month") || "01",
    day: byType.get("day") || "01",
    hour: byType.get("hour") || "00",
    minute: byType.get("minute") || "00",
    second: byType.get("second") || "00",
    fractionalSecond: byType.get("fractionalSecond") || "000",
    offsetLabel: byType.get("timeZoneName") || "GMT+0",
  };
}

function parseOffsetLabelToIso(offsetLabel: string): string {
  const match = offsetLabel.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return "Z";
  }

  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  const minutes = (match[3] || "00").padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function getPacificOffsetMinutes(utcDate: Date): number {
  const { offsetLabel } = extractPacificParts(utcDate, true);
  const match = offsetLabel.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || "0");
  return sign * (hours * 60 + minutes);
}

/**
 * Parse a date string (YYYY-MM-DD) and return a Date object in Pacific Time
 * This avoids timezone conversion issues when displaying dates
 */
export function parseDateInPacific(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date directly with local time to avoid UTC conversion
  return new Date(year, month - 1, day);
}

/**
 * Parse a date string (YYYY-MM-DD) for database storage
 * Returns a Date object at noon Pacific Time to avoid timezone edge cases
 */
export function parseDateForDatabase(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const pacificNoonAsUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offsetMinutes = getPacificOffsetMinutes(pacificNoonAsUtc);

  // Store the exact instant that corresponds to 12:00 PM in Pacific Time for this date.
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0) - offsetMinutes * 60 * 1000);
}

/**
 * Format a Date as YYYY-MM-DD in Pacific Time.
 */
export function formatDateForResponse(date: Date): string {
  const parts = extractPacificParts(date, false);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Format a Date as ISO-like datetime string with Pacific offset.
 * Example: 2026-04-24T09:15:30.123-07:00
 */
export function formatDateTimeForResponse(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }

  const parts = extractPacificParts(date, true);
  const offset = parseOffsetLabelToIso(parts.offsetLabel);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${parts.fractionalSecond}${offset}`;
}

/**
 * Format a date string (YYYY-MM-DD) for display in Pacific Time
 * Returns formatted date like "1/15/2020" or "Jan 15, 2020"
 */
export function formatDateInPacific(
  dateString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDateInPacific(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Los_Angeles',
    ...options,
  };
  return date.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format a date string with short month and day
 * Returns format like "Feb 10"
 */
export function formatShortDate(dateString: string): string {
  return formatDateInPacific(dateString, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string with full date
 * Returns format like "January 15, 2020"
 */
export function formatFullDate(dateString: string): string {
  return formatDateInPacific(dateString, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string with compact format
 * Returns format like "1/15/2020"
 */
export function formatCompactDate(dateString: string): string {
  return formatDateInPacific(dateString);
}
