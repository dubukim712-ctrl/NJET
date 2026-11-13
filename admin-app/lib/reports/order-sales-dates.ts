export type OrderSalesDatePreset = 'today' | 'this_week' | 'this_month' | 'year_to_date';

function datePartsInManila(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getManilaToday() {
  return datePartsInManila(new Date());
}

export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function getOrderSalesPresetRange(
  preset: OrderSalesDatePreset,
  today = getManilaToday()
) {
  if (preset === 'today') return { startDate: today, endDate: today };
  if (preset === 'this_month') {
    return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  }
  if (preset === 'year_to_date') {
    return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today };
  }

  const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  return {
    startDate: addCalendarDays(today, -((weekday + 6) % 7)),
    endDate: today,
  };
}
