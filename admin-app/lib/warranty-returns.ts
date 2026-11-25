export const returnReasons = {
  awaiting_inspection: 'Awaiting inspection',
  damaged: 'Damaged',
  defective: 'Defective',
  other: 'Other',
} as const;

export const returnDispositions = {
  held_at_branch: 'Held at branch',
  sent_for_repair: 'Sent for repair',
  returned_to_supplier: 'Returned to supplier',
  written_off: 'Written off',
} as const;

export type ReturnReason = keyof typeof returnReasons;
export type ReturnDisposition = keyof typeof returnDispositions;
