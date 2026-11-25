"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Barcode, Cog } from "lucide-react";
import { registerEbikeUnitsAction } from "@/data/actions/commerce-admin";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useInvalidateAdminProductsQuery } from "@/data/commerce/admin-products-client";
import { useInvalidateInventoryValuationQuery } from "@/data/commerce/inventory-valuation-client";

export function EbikeUnitForm({
  branchId,
  variantId,
  pendingUnits,
  onCancel,
  onSaved,
}: {
  branchId: string;
  variantId: string;
  pendingUnits: { id: string }[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const invalidateValuation = useInvalidateInventoryValuationQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitId, setUnitId] = useState(pendingUnits[0]?.id ?? "");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await registerEbikeUnitsAction({
        branchId,
        variantId,
        units: [
          {
            unitId,
            serialNumber: formData.get("serialNumber"),
            motorNumber: formData.get("motorNumber"),
          },
        ],
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Legacy e-bike identifiers saved.");
      void invalidateProducts();
      void invalidateValuation();
      onSaved();
    } catch (saveError) {
      console.error("Could not save e-bike identifiers.", saveError);
      const message = "Could not save this e-bike. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <Select
        label="Unit"
        value={unitId}
        onValueChange={(value) => setUnitId(value)}
        required
      >
        {pendingUnits.map((unit) => (
          <option key={unit.id} value={unit.id}>
            Complete existing stock unit {unit.id.slice(0, 8)}
          </option>
        ))}
      </Select>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          name="serialNumber"
          label="Serial number"
          maxLength={100}
          required
          leadingIcon={<Barcode className="h-4 w-4" />}
        />
        <Input
          name="motorNumber"
          label="Motor number"
          maxLength={100}
          required
          leadingIcon={<Cog className="h-4 w-4" />}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Identifying a legacy unit does not change stock. New e-bikes must be
        entered as a costed receipt.
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
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button type="submit" loading={busy} disabled={!unitId}>
          Save identifiers
        </Button>
      </div>
    </form>
  );
}
