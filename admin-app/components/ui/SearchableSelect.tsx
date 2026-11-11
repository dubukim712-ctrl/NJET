'use client';

import { useId, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export type SearchableSelectOption = {
  value: string;
  label: string;
};

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Type to search',
  helperText,
  emptyMessage = 'No matching options.',
  disabled = false,
  required = false,
  containerClassName,
}: {
  label: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  containerClassName?: string;
}) {
  const generatedId = useId();
  const listId = `${generatedId}-options`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = options.find((option) => option.value === value);
  const inputValue = open ? query : selected?.label ?? '';
  const filteredOptions = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase();
    return options.filter((option) =>
      option.label.toLocaleLowerCase().includes(searchTerm)
    );
  }, [options, query]);

  const choose = (option: SearchableSelectOption) => {
    setQuery(option.label);
    setOpen(false);
    onChange(option.value);
  };

  return (
    <div className={`relative min-w-0 ${containerClassName ?? ''}`}>
      <Input
        label={label}
        required={required}
        disabled={disabled}
        value={inputValue}
        placeholder={placeholder}
        helperText={helperText}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && filteredOptions[activeIndex]
            ? `${listId}-${activeIndex}`
            : undefined
        }
        autoComplete="off"
        leadingIcon={<Search className="size-4" />}
        trailingIcon={<ChevronDown className="size-4" />}
        onFocus={() => {
          setQuery(selected?.label ?? '');
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          if (!value) setQuery('');
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (value) onChange('');
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) =>
              Math.min(index + 1, filteredOptions.length - 1)
            );
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open) {
            const option = filteredOptions[activeIndex] ??
              (activeIndex === -1 ? filteredOptions[0] : undefined);
            if (option) {
              event.preventDefault();
              choose(option);
            }
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => (
              <li key={option.value}>
                <button
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`min-h-10 w-full rounded px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    index === activeIndex ? 'bg-accent' : ''
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  {option.label}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted-foreground" role="status">
              {emptyMessage}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
