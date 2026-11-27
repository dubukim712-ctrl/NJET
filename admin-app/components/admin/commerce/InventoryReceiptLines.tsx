"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { ProductType } from "@/types/commerce-tables";
import type { Dispatch, SetStateAction } from "react";

export type ReceiptVariant = {
  id: string;
  name: string;
  modelName: string;
  sku: string;
  productType: ProductType;
};

type ReceiptUnit = { serialNumber: string; motorNumber: string };

const maxEbikeQuantity = 50;

function ebikeQuantity(value: string) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= maxEbikeQuantity
    ? quantity
    : 0;
}

function resizeUnits(units: ReceiptUnit[], quantity: number) {
  return Array.from({ length: quantity }, (_, index) =>
    units[index] ?? { serialNumber: "", motorNumber: "" },
  );
}

export type ReceiptLine = {
  key: number;
  variantId: string;
  quantity: string;
  supplierUnitCost: string;
  units: ReceiptUnit[];
};

export function InventoryReceiptLines({
  variants,
  lines,
  setLines,
}: {
  variants: ReceiptVariant[];
  lines: ReceiptLine[];
  setLines: Dispatch<SetStateAction<ReceiptLine[]>>;
}) {
  const updateLine = (key: number, patch: (line: ReceiptLine) => Partial<ReceiptLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch(line) } : line)),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">Received products</h3>
        <Button
          type="button"
          variant="outline"
          disabled={lines.length >= Math.min(30, variants.length)}
          onClick={() =>
            setLines((current) => [
              ...current,
              {
                key: Math.max(...current.map((line) => line.key)) + 1,
                variantId:
                  variants.find(
                    (variant) =>
                      !current.some((line) => line.variantId === variant.id),
                  )?.id ?? "",
                quantity: "1",
                supplierUnitCost: "",
                units: [],
              },
            ])
          }
        >
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Add product
        </Button>
      </div>
      {lines.map((line, index) => {
        const variant = variants.find((entry) => entry.id === line.variantId);
        const isEbike = variant?.productType === "ebike";
        const unitCount = isEbike ? ebikeQuantity(line.quantity) : 0;
        const usedVariantIds = lines
          .filter((entry) => entry.key !== line.key)
          .map((entry) => entry.variantId);
        return (
          <fieldset
            key={line.key}
            className="space-y-3 rounded-lg border p-3"
          >
            <legend className="px-1 text-sm font-medium">
              Product {index + 1}
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <SearchableSelect
                label="Product variant"
                placeholder="Type to search SKU, model, or color..."
                emptyMessage="No matching variants."
                value={line.variantId}
                options={variants
                  .filter((entry) => !usedVariantIds.includes(entry.id))
                  .map((entry) => ({
                    value: entry.id,
                    label: `${entry.sku} · ${entry.modelName} · ${entry.name}`,
                  }))}
                onChange={(value) =>
                  updateLine(line.key, (current) =>
                    current.variantId === value ? {} : { variantId: value, units: [] },
                  )
                }
                browseOnFocus
                required
              />
              <Input
                label="Quantity"
                type="number"
                min="1"
                max={isEbike ? maxEbikeQuantity : 1000000}
                onWheel={(event) => event.currentTarget.blur()}
                className="number-no-spinner"
                value={line.quantity}
                onChange={(event) => {
                  const quantity = event.target.value;
                  const count = isEbike ? ebikeQuantity(quantity) : 0;
                  updateLine(line.key, (current) => ({
                    quantity,
                    units: count ? resizeUnits(current.units, count) : current.units,
                  }));
                }}
                required
              />
              <Input
                label="Supplier unit price (PHP)"
                type="number"
                min="0"
                max="21474836.47"
                onWheel={(event) => event.currentTarget.blur()}
                className="number-no-spinner"
                value={line.supplierUnitCost}
                onChange={(event) =>
                  updateLine(line.key, () => ({
                    supplierUnitCost: event.target.value,
                  }))
                }
                required
              />
            </div>
            {unitCount > 0 && (
              <div className="space-y-3">
                {resizeUnits(line.units, unitCount).map((unit, unitIndex) => (
                  <div key={unitIndex} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(["serialNumber", "motorNumber"] as const).map((field) => {
                      const label = field === "serialNumber" ? "Serial number" : "Motor number";
                      return (
                        <Input
                          key={field}
                          label={`Unit ${unitIndex + 1} ${label.toLowerCase()}`}
                          placeholder={label}
                          value={unit[field]}
                          maxLength={100}
                          required
                          onChange={(event) => {
                            const value = event.target.value;
                            updateLine(line.key, (current) => ({
                              units: resizeUnits(current.units, unitCount).map((entry, entryIndex) =>
                                entryIndex === unitIndex ? { ...entry, [field]: value } : entry,
                              ),
                            }));
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {lines.length > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setLines((current) =>
                    current.filter((entry) => entry.key !== line.key),
                  )
                }
                aria-label={`Remove product ${index + 1}`}
              >
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                Remove product
              </Button>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
