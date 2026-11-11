'use client';

import { useState } from 'react';
import { BranchInventorySection } from '@/components/admin/commerce/BranchInventorySection';
import { BranchTransferManager } from '@/components/admin/commerce/BranchTransferManager';
import { InventoryMovementLog } from '@/components/admin/commerce/InventoryMovementLog';
import type { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Variant = Database['public']['Tables']['product_variants']['Row'];
type Branch = Database['public']['Tables']['branches']['Row'];
type Inventory = Database['public']['Tables']['branch_inventory']['Row'];
type Unit = Database['public']['Tables']['ebike_units']['Row'];
type Movement = Database['public']['Tables']['inventory_movements']['Row'];
type Transfer = Database['public']['Tables']['branch_transfers']['Row'];
type TransferItem = Database['public']['Tables']['branch_transfer_items']['Row'];

export function ProductStockTab({
  products,
  variants,
  branches,
  transferBranches,
  inventory,
  ebikeUnits,
  inventoryMovements,
  transfers,
  transferItems,
  transferUnits,
  canManageProducts,
  isBranchScopedStaff,
  assignedBranchId,
}: {
  products: Product[];
  variants: Variant[];
  branches: Branch[];
  transferBranches: { id: string; name: string; active: boolean }[];
  inventory: Inventory[];
  ebikeUnits: Unit[];
  inventoryMovements: Movement[];
  transfers: Transfer[];
  transferItems: TransferItem[];
  transferUnits: {
    transferItemId: string;
    serial_number: string | null;
    motor_number: string | null;
  }[];
  canManageProducts: boolean;
  isBranchScopedStaff: boolean;
  assignedBranchId: string | null;
}) {
  const activeVariants = variants.filter((variant) =>
    products.some((product) => product.id === variant.product_id)
  );
  const [transferRequest, setTransferRequest] = useState<{
    sourceBranchId: string;
    variantId: string;
  } | null>(null);

  if (isBranchScopedStaff && !assignedBranchId) {
    return (
      <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground" role="status">
        No branch is assigned to your account. Contact an administrator to access branch inventory.
      </p>
    );
  }

  const inventoryBranches = assignedBranchId
    ? branches.filter((branch) => branch.id === assignedBranchId)
    : branches;

  return (
    <div className="space-y-8">
      <BranchInventorySection
        products={products}
        variants={variants}
        branches={inventoryBranches}
        assignedBranchId={assignedBranchId}
        inventory={inventory}
        units={ebikeUnits}
        canManageProducts={canManageProducts}
        onTransfer={(sourceBranchId, variantId) =>
          setTransferRequest({ sourceBranchId, variantId })
        }
      />
      <BranchTransferManager
        branches={transferBranches}
        variants={activeVariants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          productType:
            products.find((product) => product.id === variant.product_id)
              ?.product_type ?? 'part',
        }))}
        inventory={inventory}
        units={ebikeUnits}
        transfers={transfers}
        transferItems={transferItems}
        transferUnits={transferUnits}
        canManage={canManageProducts}
        assignedBranchId={assignedBranchId}
        transferRequest={transferRequest}
        onCloseTransfer={() => setTransferRequest(null)}
      />
      <InventoryMovementLog
        movements={inventoryMovements}
        branches={branches}
        variants={variants}
      />
    </div>
  );
}
