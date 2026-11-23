const DATE_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateValue(value: string) {
  const match = DATE_VALUE_PATTERN.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function toDateValue(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function shiftMonth(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

export function monthDays(date: Date) {
  const firstDay = monthStart(date);
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const numberOfDays = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: numberOfDays }, (_, index) => index + 1),
  ];
}

export function displayDate(value: string) {
  const date = parseDateValue(value);
  return date
    ? date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Select a date";
}
