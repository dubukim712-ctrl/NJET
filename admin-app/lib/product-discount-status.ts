type DiscountSchedule = {
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export function getDiscountStatus(discount: DiscountSchedule, now: number) {
  if (!discount.active) return 'Inactive';
  if (discount.ends_at && Date.parse(discount.ends_at) <= now) return 'Expired';
  if (discount.starts_at && Date.parse(discount.starts_at) > now) return 'Scheduled';
  return 'Active';
}
