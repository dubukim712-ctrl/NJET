'use client';

import { useId, useState } from 'react';
import { CalendarPlus, NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CrmWriteForms } from './CrmWriteForms';
import type { CrmStaffOption } from '@/types/crm';

type Panel = 'note' | 'follow-up';

export function CrmProfileActions({ customerId, staff }: { customerId: string; staff: CrmStaffOption[] }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const panelId = useId();

  function toggle(next: Panel) {
    setPanel((current) => current === next ? null : next);
  }

  if (!staff.length) return <p className="text-sm text-muted-foreground">An active branch with eligible CRM staff is required to add notes or follow-ups.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={panel === 'note' ? 'default' : 'outline'} className="min-h-11 gap-2"
          aria-expanded={panel === 'note'} aria-controls={panelId} onClick={() => toggle('note')}>
          <NotebookPen className="size-4" aria-hidden="true" /> Add note
        </Button>
        <Button type="button" variant={panel === 'follow-up' ? 'secondary' : 'default'} className="min-h-11 gap-2"
          aria-expanded={panel === 'follow-up'} aria-controls={panelId} onClick={() => toggle('follow-up')}>
          <CalendarPlus className="size-4" aria-hidden="true" /> Create follow-up
        </Button>
      </div>
      <div id={panelId} hidden={!panel}>
        {panel && <CrmWriteForms key={panel} mode={panel} customerId={customerId} staff={staff} />}
      </div>
    </div>
  );
}
