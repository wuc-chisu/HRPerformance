export type WeeklyRecordWindow = {
  id: string;
  startDate: Date;
  endDate: Date;
  plannedWorkHours: number;
};

export type WeeklyRecordOverlap = {
  record: WeeklyRecordWindow;
  overlapDays: number;
};

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function countOverlappingDays(
  rangeStart: Date,
  rangeEnd: Date,
  weekStart: Date,
  weekEnd: Date
) {
  const start = Math.max(startOfDay(rangeStart).getTime(), startOfDay(weekStart).getTime());
  const end = Math.min(startOfDay(rangeEnd).getTime(), startOfDay(weekEnd).getTime());
  if (start > end) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

export function getDateSpanDays(startDate: Date, endDate: Date) {
  return countOverlappingDays(startDate, endDate, startDate, endDate);
}

export function getFullyCoveredOverlaps(
  requestStart: Date,
  requestEnd: Date,
  weeklyRecords: WeeklyRecordWindow[]
) {
  const overlaps = weeklyRecords
    .map((record) => ({
      record,
      overlapDays: countOverlappingDays(requestStart, requestEnd, record.startDate, record.endDate),
    }))
    .filter((entry) => entry.overlapDays > 0)
    .sort((left, right) => left.record.startDate.getTime() - right.record.startDate.getTime());

  const totalOverlapDays = overlaps.reduce((sum, entry) => sum + entry.overlapDays, 0);
  const requestDays = getDateSpanDays(requestStart, requestEnd);

  return {
    overlaps,
    totalOverlapDays,
    requestDays,
    isFullyCovered: totalOverlapDays >= requestDays,
  };
}

export function allocateHoursAcrossOverlaps(totalHours: number, overlaps: WeeklyRecordOverlap[]) {
  const totalOverlapDays = overlaps.reduce((sum, entry) => sum + entry.overlapDays, 0);
  let remainingHours = totalHours;

  return overlaps.map((entry, index) => {
    const isLast = index === overlaps.length - 1;
    const allocatedHours = isLast
      ? remainingHours
      : Math.round((totalHours * entry.overlapDays / totalOverlapDays) * 100) / 100;

    remainingHours = Math.round((remainingHours - allocatedHours) * 100) / 100;

    return {
      ...entry,
      allocatedHours,
    };
  });
}