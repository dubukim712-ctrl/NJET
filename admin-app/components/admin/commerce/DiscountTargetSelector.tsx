'use client';

import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function DiscountTargetSelector({
  label,
  helperText,
  options,
  selectedIds,
  onToggle,
  onClear,
  disabled = false,
}: {
  label: string;
  helperText: string;
  options: { id: string; label: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const searchTerm = query.trim().toLowerCase();
  const visibleOptions = options.filter(({ label }) => label.toLowerCase().includes(searchTerm));

  return (
    <div role="group" aria-label={label} className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            selectedIds.length && !disabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {selectedIds.length} selected
          </span>
          {onClear && selectedIds.length > 0 && (
            <Button type="button" variant="ghost" size="sm" aria-label="Clear selected variants" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      </div>
      {onClear && (
        <Input
          type="search"
          aria-label="Search variants"
          placeholder="Search variants..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          leadingIcon={<Search className="size-4" />}
        />
      )}
      <fieldset disabled={disabled} className="max-h-48 min-w-0 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-2 disabled:opacity-50">
        {visibleOptions.length ? visibleOptions.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          return (
            <Button
              key={option.id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              size={null}
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onToggle(option.id)}
              className="min-h-11 w-full justify-start gap-3 whitespace-normal px-3 py-2 text-left"
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {isSelected && <Check className="size-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1 break-words">{option.label}</span>
            </Button>
          );
        }) : (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {searchTerm ? 'No matching variants.' : 'No options available.'}
          </p>
        )}
      </fieldset>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}
