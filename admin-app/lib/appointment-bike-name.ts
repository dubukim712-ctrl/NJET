export function formatAppointmentBikeName(make: string | null, model: string): string {
  const brand = make?.trim() ?? '';
  const name = model.trim();
  if (!brand || /^njet$/i.test(brand) || name.toLowerCase() === brand.toLowerCase()
    || name.toLowerCase().startsWith(`${brand.toLowerCase()} `)) {
    return name;
  }
  return `${brand} ${name}`.trim();
}
