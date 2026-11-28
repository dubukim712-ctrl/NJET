'use client';

import dynamic from 'next/dynamic';

import { useState, type KeyboardEvent } from 'react';
import { ProductCatalogTab } from '@/components/admin/commerce/ProductCatalogTab';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { ProductDiscountAdminRow } from '@/lib/validations/product-discount';
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

const PRODUCT_TABS = [
  { id: 'catalog', label: 'Product Catalog' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'variants', label: 'Variants' },
  { id: 'stock', label: 'Stock' },
  { id: 'non-sellable', label: 'Non-sellable stock' },
  { id: 'discounts', label: 'Discounts' },
] as const;

type ProductTab = (typeof PRODUCT_TABS)[number]['id'];

const ProductEditor = dynamic(() => import('./ProductEditor').then((module) => module.ProductEditor));
const ProductStockTab = dynamic(() => import('./ProductStockTab').then((module) => module.ProductStockTab));
const ProductVariantsTab = dynamic(() => import('./ProductVariantsTab').then((module) => module.ProductVariantsTab));
const ProductDiscountsTab = dynamic(() => import('./ProductDiscountsTab').then((module) => module.ProductDiscountsTab));
const WarrantyReturnsTab = dynamic(() => import('./WarrantyReturnsTab').then((module) => module.WarrantyReturnsTab));
const ProductReviewsTab = dynamic(() => import('./ProductReviewsTab').then((module) => module.ProductReviewsTab));

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
  productDiscounts,
  userId,
  canManageProducts,
  canModerateProductReviews,
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
  productDiscounts: ProductDiscountAdminRow[];
  userId: string;
  canManageProducts: boolean;
  canModerateProductReviews: boolean;
  isBranchScopedStaff: boolean;
  assignedBranchId: string | null;
}) {
  const [activeTab, setActiveTab] = useState<ProductTab>('catalog');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const selectedTab = activeTab === 'reviews' && !canModerateProductReviews
    ? 'catalog'
    : activeTab === 'non-sellable' && !canManageProducts ? 'catalog' : activeTab;
  const tabs = PRODUCT_TABS.filter((tab) => (tab.id !== 'reviews' || canModerateProductReviews)
    && (tab.id !== 'non-sellable' || canManageProducts));

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextTab = tabs[nextIndex].id;
    setActiveTab(nextTab);
    document.getElementById(`product-${nextTab}-tab`)?.focus();
  }

  return (
    <div className="space-y-6">
      <Select
        label="Products section"
        value={selectedTab}
        onValueChange={(value) => {
          const tab = tabs.find((option) => option.id === value);
          if (tab) setActiveTab(tab.id);
        }}
        containerClassName="md:hidden"
        className="min-h-11"
      >
        {tabs.map((tab) => (
          <option key={tab.id} value={tab.id}>{tab.label}</option>
        ))}
      </Select>
      <div
        role="tablist"
        aria-label="Product management"
        className="hidden flex-wrap gap-2 border-b md:flex"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`product-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={selectedTab === tab.id}
            aria-controls={`product-${tab.id}-panel`}
            tabIndex={selectedTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={`border-b-2 px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selectedTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        id="product-catalog-panel"
        role="tabpanel"
        aria-labelledby="product-catalog-tab"
        tabIndex={0}
        hidden={selectedTab !== 'catalog'}
      >
        {selectedTab === 'catalog' && (
          <ProductCatalogTab
            products={products}
            variants={variants}
            categories={categories}
            subcategories={subcategories}
            canManageProducts={canManageProducts}
            onCreateProduct={() => setCreateModalOpen(true)}
          />
        )}
      </section>
      <section
        id="product-variants-panel"
        role="tabpanel"
        aria-labelledby="product-variants-tab"
        tabIndex={0}
        hidden={selectedTab !== 'variants'}
      >
        {selectedTab === 'variants' && (
          <ProductVariantsTab
            products={products}
            variants={variants}
            categories={categories}
            canManageProducts={canManageProducts}
          />
        )}
      </section>
      <section
        id="product-stock-panel"
        role="tabpanel"
        aria-labelledby="product-stock-tab"
        tabIndex={0}
        hidden={selectedTab !== 'stock'}
      >
        {selectedTab === 'stock' && (
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
        )}
      </section>
      {canManageProducts && (
        <section id="product-non-sellable-panel" role="tabpanel" aria-labelledby="product-non-sellable-tab"
          tabIndex={0} hidden={selectedTab !== 'non-sellable'}>
          {selectedTab === 'non-sellable' && <WarrantyReturnsTab userId={userId} />}
        </section>
      )}
      <section
        id="product-discounts-panel"
        role="tabpanel"
        aria-labelledby="product-discounts-tab"
        tabIndex={0}
        hidden={selectedTab !== 'discounts'}
      >
        {selectedTab === 'discounts' && (
          <ProductDiscountsTab
            discounts={productDiscounts}
            products={products}
            variants={variants}
            categories={categories}
            canManageProducts={canManageProducts}
          />
        )}
      </section>
      {canModerateProductReviews && (
        <section
          id="product-reviews-panel"
          role="tabpanel"
          aria-labelledby="product-reviews-tab"
          tabIndex={0}
          hidden={selectedTab !== 'reviews'}
        >
          {selectedTab === 'reviews' && (
            <ProductReviewsTab userId={userId} />
          )}
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
