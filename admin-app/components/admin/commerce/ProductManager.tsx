'use client';

import { useState } from 'react';
import { ProductCatalogTab } from '@/components/admin/commerce/ProductCatalogTab';
import { ProductEditor } from '@/components/admin/commerce/ProductEditor';
import { ProductStockTab } from '@/components/admin/commerce/ProductStockTab';
import { ProductVariantsTab } from '@/components/admin/commerce/ProductVariantsTab';
import { Modal } from '@/components/ui/Modal';
import type { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Variant = Database['public']['Tables']['product_variants']['Row'];
type Branch = Database['public']['Tables']['branches']['Row'];
type Inventory = Database['public']['Tables']['branch_inventory']['Row'];
type Category = Database['public']['Tables']['product_categories']['Row'];
type Subcategory = Database['public']['Tables']['product_subcategories']['Row'];
type Unit = Database['public']['Tables']['ebike_units']['Row'];
type Movement = Database['public']['Tables']['inventory_movements']['Row'];
type Transfer = Database['public']['Tables']['branch_transfers']['Row'];
type TransferItem = Database['public']['Tables']['branch_transfer_items']['Row'];

type ProductTab = 'catalog' | 'variants' | 'stock';

export function ProductManager({
  products,
  variants,
  branches,
  transferBranches,
  inventory,
  categories,
  subcategories,
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
  categories: Category[];
  subcategories: Subcategory[];
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
  const [activeTab, setActiveTab] = useState<ProductTab>('catalog');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Product management"
        className="flex gap-2 border-b"
      >
        <button
          id="product-catalog-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'catalog'}
          aria-controls="product-catalog-panel"
          onClick={() => setActiveTab('catalog')}
          className={`border-b-2 px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === 'catalog'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Product Catalog
        </button>
        <button
          id="product-variants-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'variants'}
          aria-controls="product-variants-panel"
          onClick={() => setActiveTab('variants')}
          className={`border-b-2 px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === 'variants'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Variants
        </button>
        <button
          id="product-stock-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'stock'}
          aria-controls="product-stock-panel"
          onClick={() => setActiveTab('stock')}
          className={`border-b-2 px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === 'stock'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Stock
        </button>
      </div>

      {activeTab === 'catalog' && (
        <section
          id="product-catalog-panel"
          role="tabpanel"
          aria-labelledby="product-catalog-tab"
          tabIndex={0}
        >
          <ProductCatalogTab
            products={products}
            variants={variants}
            categories={categories}
            subcategories={subcategories}
            canManageProducts={canManageProducts}
            onCreateProduct={() => setCreateModalOpen(true)}
          />
        </section>
      )}
      {activeTab === 'variants' && (
        <section
          id="product-variants-panel"
          role="tabpanel"
          aria-labelledby="product-variants-tab"
          tabIndex={0}
        >
          <ProductVariantsTab
            products={products}
            variants={variants}
            categories={categories}
            canManageProducts={canManageProducts}
          />
        </section>
      )}
      {activeTab === 'stock' && (
        <section
          id="product-stock-panel"
          role="tabpanel"
          aria-labelledby="product-stock-tab"
          tabIndex={0}
        >
          <ProductStockTab
            products={products}
            variants={variants}
            branches={branches}
            transferBranches={transferBranches}
            inventory={inventory}
            ebikeUnits={ebikeUnits}
            inventoryMovements={inventoryMovements}
            transfers={transfers}
            transferItems={transferItems}
            transferUnits={transferUnits}
            canManageProducts={canManageProducts}
            isBranchScopedStaff={isBranchScopedStaff}
            assignedBranchId={assignedBranchId}
          />
        </section>
      )}

      <Modal
        open={createModalOpen}
        title="Create product"
        size="wide"
        onClose={() => setCreateModalOpen(false)}
      >
        <ProductEditor
          key="new-product"
          categories={categories}
          subcategories={subcategories}
          onCancel={() => setCreateModalOpen(false)}
          onSaved={() => setCreateModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
