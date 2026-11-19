"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createInventoryReceiptAction } from "@/data/actions/commerce-admin";
import { useInvalidateAdminProductsQuery } from "@/data/commerce/admin-products-client";
import { useInvalidateInventoryValuationQuery } from "@/data/commerce/inventory-valuation-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  InventoryReceiptLines,
  type ReceiptLine,
  type ReceiptVariant,
} from "@/components/admin/commerce/InventoryReceiptLines";

function localDateTimeValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toMinor(value: string) {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 21474836.47
    ? Math.round(amount * 100)
    : null;
}

function parseUnits(value: string) {
  return value
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split(",").map((part) => part.trim());
      const [serialNumber = "", motorNumber = ""] =
        parts.length === 2 ? parts : [];
      return { serialNumber, motorNumber };
    });
}

export function InventoryReceiptForm({
  branches,
  variants,
  branchId: initialBranchId,
  variantId: initialVariantId,
  onClose,
}: {
  branches: { id: string; name: string }[];
  variants: ReceiptVariant[];
  branchId?: string;
  variantId?: string;
  onClose: () => void;
}) {
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const invalidateValuation = useInvalidateInventoryValuationQuery();
  const [branchId, setBranchId] = useState(
    initialBranchId ?? branches[0]?.id ?? "",
  );
  const [lines, setLines] = useState<ReceiptLine[]>([
    {
      key: 0,
      variantId: initialVariantId ?? variants[0]?.id ?? "",
      quantity: "1",
      supplierUnitCost: "",
      units: "",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const items = lines.map((line) => {
      const variant = variants.find((entry) => entry.id === line.variantId);
      return {
        variantId: line.variantId,
        quantity: Number(line.quantity),
        unitSupplierCostMinor: toMinor(line.supplierUnitCost),
        units: variant?.productType === "ebike" ? parseUnits(line.units) : [],
      };
    });
    const sharedCostMinor = toMinor(String(formData.get("sharedCost") ?? ""));
    const receivedAt = new Date(String(formData.get("receivedAt") ?? ""));
    if (
      !branchId ||
      sharedCostMinor === null ||
      items.some(
        (item) =>
          !item.variantId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.unitSupplierCostMinor === null ||
          (variants.find((variant) => variant.id === item.variantId)
            ?.productType === "ebike" &&
            item.units.length !== item.quantity),
      ) ||
      !Number.isFinite(receivedAt.getTime())
    ) {
      const message =
        "Enter a branch, valid costs and quantities, and one serial/motor pair per e-bike.";
      setError(message);
      toast.error(message);
      setBusy(false);
      return;
    }
    const validItems: {
      variantId: string;
      quantity: number;
      unitSupplierCostMinor: number;
      units: { serialNumber: string; motorNumber: string }[];
    }[] = [];
    for (const item of items) {
      if (item.unitSupplierCostMinor === null) {
        setError("Enter a valid supplier unit price for every product.");
        toast.error("Enter a valid supplier unit price for every product.");
        setBusy(false);
        return;
      }
      validItems.push({
        ...item,
        unitSupplierCostMinor: item.unitSupplierCostMinor,
      });
    }

    try {
      const result = await createInventoryReceiptAction({
        branchId,
        supplierName: formData.get("supplierName"),
        documentReference:
          String(formData.get("documentReference") ?? "") || null,
        receivedAt: receivedAt.toISOString(),
        sharedCostMinor,
        items: validItems,
      });
      if (!result.success) {
        const details = [...new Set(
          Object.values(result.fieldErrors ?? {}).flat()
        )].slice(0, 3);
        const message = [result.error, ...details].join(" ");
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Inventory receipt recorded.");
      void invalidateProducts();
      void invalidateValuation();
      onClose();
    } catch (receiptError) {
      console.error("Could not record inventory receipt.", receiptError);
      const message = "Could not record this receipt. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Receiving branch"
          value={branchId}
          onValueChange={(value) => setBranchId(value)}
          required
        >
          <option value="">Select a branch</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <Input name="supplierName" label="Supplier" required maxLength={120} />
        <Input
          name="documentReference"
          label="Delivery receipt / invoice #"
          maxLength={120}
        />
        <Input
          name="receivedAt"
          label="Received date and time"
          type="datetime-local"
          defaultValue={localDateTimeValue()}
          required
        />
        <Input
          name="sharedCost"
          label="Shared freight / assembly (PHP)"
          type="number"
          min="0"
          onWheel={(event) => event.currentTarget.blur()}
          className="number-no-spinner"
          max="21474836.47"
          defaultValue="0"
          required
        />
      </div>

      <InventoryReceiptLines
        variants={variants}
        lines={lines}
        setLines={setLines}
      />
      <p className="text-xs text-muted-foreground">
        Shared costs are allocated across products in proportion to supplier
        line value.
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Record receipt
        </Button>
      </div>
    </form>
  );
}
