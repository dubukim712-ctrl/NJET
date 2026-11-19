"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ProductType } from "@/types/commerce-tables";
import type { Dispatch, SetStateAction } from "react";

export type ReceiptVariant = {
  id: string;
  name: string;
  sku: string;
  productType: ProductType;
};

export type ReceiptLine = {
  key: number;
  variantId: string;
  quantity: string;
  supplierUnitCost: string;
  units: string;
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
  const updateLine = (key: number, patch: Partial<ReceiptLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
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
                units: "",
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
              <Select
                label="Product variant"
                value={line.variantId}
                onValueChange={(value) =>
                  updateLine(line.key, { variantId: value })
                }
                required
              >
                <option value="">Select a variant</option>
                {variants
                  .filter(
                    (entry) =>
                      !usedVariantIds.includes(entry.id) ||
                      entry.id === line.variantId,
                  )
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.sku} - {entry.name}
                    </option>
                  ))}
              </Select>
              <Input
                label="Quantity"
                type="number"
                min="1"
                max={variant?.productType === "ebike" ? "50" : "1000000"}
                onWheel={(event) => event.currentTarget.blur()}
                className="number-no-spinner"
                value={line.quantity}
                onChange={(event) =>
                  updateLine(line.key, { quantity: event.target.value })
                }
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
                  updateLine(line.key, {
                    supplierUnitCost: event.target.value,
                  })
                }
                required
              />
            </div>
            {variant?.productType === "ebike" && (
              <label className="block space-y-1 text-sm font-medium">
                E-bike serial and motor numbers
                <textarea
                  className="min-h-28 w-full rounded-md border bg-background px-3 py-2 font-normal"
                  value={line.units}
                  onChange={(event) =>
                    updateLine(line.key, { units: event.target.value })
                  }
                  placeholder="One unit per line: serial number, motor number"
                  aria-label={`Serial and motor numbers for product ${index + 1}`}
                  required
                />
              </label>
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
