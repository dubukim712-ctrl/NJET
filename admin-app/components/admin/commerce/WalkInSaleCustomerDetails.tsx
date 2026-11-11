'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  PhilippineAddressFields,
  type PhilippineAddressValues,
} from '@/components/admin/commerce/PhilippineAddressFields';
import type { WalkInBranchOption } from '@/data/commerce/walk-in-sales';

export function WalkInSaleCustomerDetails({
  branches,
  branchId,
  customerName,
  contactNumber,
  address,
  disabled,
  onBranchChange,
  onCustomerNameChange,
  onContactNumberChange,
  onAddressChange,
}: {
  branches: WalkInBranchOption[];
  branchId: string;
  customerName: string;
  contactNumber: string;
  address: PhilippineAddressValues;
  disabled: boolean;
  onBranchChange: (branchId: string) => void;
  onCustomerNameChange: (value: string) => void;
  onContactNumberChange: (value: string) => void;
  onAddressChange: (address: PhilippineAddressValues) => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <header>
        <h2 className="text-lg font-semibold">Customer and sale information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the customer&apos;s contact details and select the branch fulfilling this sale.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Customer name"
          autoComplete="name"
          required
          value={customerName}
          onChange={(event) => onCustomerNameChange(event.target.value)}
        />
        <Input
          label="Contact number"
          type="tel"
          autoComplete="tel"
          required
          value={contactNumber}
          onChange={(event) => onContactNumberChange(event.target.value)}
        />
        {branches.length > 1 ? (
          <Select
            label="Selling branch"
            value={branchId}
            disabled={disabled}
            onChange={(event) => onBranchChange(event.target.value)}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </Select>
        ) : (
          <p className="self-end pb-2 text-sm text-muted-foreground">
            Branch: <span className="font-medium text-foreground">{branches[0]?.name}</span>
          </p>
        )}
      </div>
      <PhilippineAddressFields
        values={address}
        onChange={onAddressChange}
        disabled={disabled}
      />
    </section>
  );
}
