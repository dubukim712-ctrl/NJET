'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
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
  error,
  emptyMessage = 'No matching options.',
  disabled = false,
  required = false,
  containerClassName,
  browseOnFocus = false,
}: {
  label: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  containerClassName?: string;
  browseOnFocus?: boolean;
}) {
  const generatedId = useId();
  const listId = `${generatedId}-options`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [dialogPopup, setDialogPopup] = useState<{ target: HTMLDialogElement; style: CSSProperties } | null>(null);

  useEffect(() => {
    if (!open || disabled) return;
    const input = inputRef.current;
    // A native modal dialog is in the top layer. Portal into it outside its scroll panel.
    const dialog = input?.closest('dialog');
    if (!input || !dialog) return;
    const viewport = window.visualViewport;

    const position = () => {
      const bounds = input.getBoundingClientRect();
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const above = Math.max(0, bounds.top - viewportTop - 12);
      const below = Math.max(0, viewportBottom - bounds.bottom - 12);
      const openAbove = below < 240 && above > below;
      setDialogPopup({
        target: dialog,
        style: {
          left: bounds.left,
          width: bounds.width,
          maxHeight: Math.min(240, openAbove ? above : below),
          ...(openAbove ? { bottom: window.innerHeight - bounds.top + 4 } : { top: bounds.bottom + 4 }),
        },
      });
    };

    position();
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    viewport?.addEventListener('scroll', position);
    viewport?.addEventListener('resize', position);
    return () => {
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
      viewport?.removeEventListener('scroll', position);
      viewport?.removeEventListener('resize', position);
    };
  }, [open, disabled]);

  useEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>('[data-keyboard-active]');
    if (!list || !option) return;
    const listBounds = list.getBoundingClientRect();
    const optionBounds = option.getBoundingClientRect();
    if (optionBounds.bottom > listBounds.bottom) list.scrollTop += optionBounds.bottom - listBounds.bottom;
    if (optionBounds.top < listBounds.top) list.scrollTop -= listBounds.top - optionBounds.top;
  }, [activeIndex]);
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

  const list = open && !disabled && (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      style={dialogPopup?.style}
      className={`${dialogPopup ? 'fixed z-50' : 'absolute z-20 mt-1 max-h-60 w-full'} overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-md`}
    >
      {filteredOptions.length ? (
        filteredOptions.map((option, index) => (
          <li key={option.value}>
            <button
              id={`${listId}-${index}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={option.value === value}
              data-keyboard-active={index === activeIndex ? '' : undefined}
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
  );

  return (
    <div className={`relative min-w-0 ${containerClassName ?? ''}`}>
      <Input
        ref={inputRef}
        label={label}
        required={required}
        disabled={disabled}
        value={inputValue}
        placeholder={placeholder}
        helperText={helperText}
        error={error}
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
          setQuery(browseOnFocus ? '' : selected?.label ?? '');
          setActiveIndex(-1);
          setOpen(true);
        }}
        onClick={() => {
          if (!browseOnFocus || open) return;
          setQuery('');
          setActiveIndex(-1);
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
          if (value && !browseOnFocus) onChange('');
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open && browseOnFocus) setQuery('');
            setOpen(true);
            setActiveIndex((index) =>
              Math.min(index + 1, filteredOptions.length - 1)
            );
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open) {
            event.preventDefault();
            const option = filteredOptions[activeIndex] ??
              (activeIndex === -1 ? filteredOptions[0] : undefined);
            if (option) choose(option);
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {dialogPopup ? createPortal(list, dialogPopup.target) : list}
    </div>
  );
}
