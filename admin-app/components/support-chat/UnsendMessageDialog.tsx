'use client';

import { useId } from 'react';
import { Modal } from '@/components/ui/Modal';

export type UnsendScope = 'for_you' | 'for_everyone';

export function UnsendMessageDialog({
  open,
  canUnsendForEveryone,
  scope,
  onScopeChange,
  onConfirm,
  onClose,
}: {
  open: boolean;
  canUnsendForEveryone: boolean;
  scope: UnsendScope;
  onScopeChange: (scope: UnsendScope) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const radioName = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={canUnsendForEveryone ? 'Who do you want to unsend this message for?' : 'Unsend this message?'}
    >
      <div className="space-y-5">
        {canUnsendForEveryone && (
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name={radioName}
              value="for_everyone"
              checked={scope === 'for_everyone'}
              onChange={() => onScopeChange('for_everyone')}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="font-semibold">Unsend for everyone</span>
              <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                This message will be removed for everyone in the chat. Others may have already seen it.
              </span>
            </span>
          </label>
        )}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name={radioName}
            value="for_you"
            checked={scope === 'for_you'}
            onChange={() => onScopeChange('for_you')}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="font-semibold">Unsend for you</span>
            <span className="mt-1 block text-sm leading-5 text-muted-foreground">
              This message will be removed for you. Others in the chat can still see it.
            </span>
          </span>
        </label>
        <div className="flex justify-end gap-3 border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg px-4 text-sm font-medium text-primary hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Remove
          </button>
        </div>
      </div>
    </Modal>
  );
}
