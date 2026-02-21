// Utility functions for date handling in Pacific Time

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
  // Set to noon Pacific Time to avoid timezone boundary issues when stored/retrieved
  return new Date(year, month - 1, day, 12, 0, 0);
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
