type BranchSummary = { id: string; name: string; address: string };

export const defaultBusinessHours = 'Mon - Sun, 08:00 AM - 06:00 PM';

function branchOrder(branch: BranchSummary) {
  if (/\bmain\b/i.test(branch.name) || /hillsview/i.test(branch.name + branch.address)) return 0;
  if (/halang/i.test(branch.name)) return 1;
  if (/malainen bago/i.test(branch.name)) return 2;
  return 3;
}

export function orderStorefrontBranches<T extends BranchSummary>(branches: T[]): T[] {
  return [...branches].sort((a, b) => branchOrder(a) - branchOrder(b));
}

export function footerBranchName(branch: BranchSummary) {
  return branchOrder(branch) === 0 ? 'NJET Main — Hillsview' : branch.name;
}
