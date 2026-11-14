'use server';

import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requireStaff } from '@/data/auth/guards';
import { getDashboardBranchContext } from '@/data/dashboard/branch-context';
import { getStaffDashboardData } from '@/data/dashboard/queries';
import type { DashboardBranchContext } from '@/data/dashboard/branch-context';
import type { StaffDashboardData } from '@/data/dashboard/queries';

const requestedBranchIdSchema = z.string().max(100).nullable();

export async function getStaffDashboardDataAction(
  requestedBranchId: string | null
): Promise<ActionResult<{ branchContext: DashboardBranchContext; data: StaffDashboardData }>> {
  const validation = requestedBranchIdSchema.safeParse(requestedBranchId);
  if (!validation.success) {
    return { success: false, error: 'The selected branch is invalid.' };
  }

  const { supabase, profile } = await requireStaff('/admin');
  try {
    const branchContext = await getDashboardBranchContext(
      supabase,
      profile,
      validation.data ?? undefined
    );
    const data = await getStaffDashboardData(
      supabase,
      profile,
      branchContext.selectedBranchId,
      branchContext.branches
    );
    return { success: true, data: { branchContext, data } };
  } catch (error) {
    console.error('Could not load the staff dashboard.', error);
    return { success: false, error: 'Dashboard data could not be loaded.' };
  }
}
