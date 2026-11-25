'use client';

import { useActionState, useState } from 'react';
import { addCrmFollowUp, addCrmNote, setCrmFollowUpStatus } from '@/data/actions/crm';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { CrmFollowUp, CrmStaffOption } from '@/types/crm';

function Feedback({ state }: { state: Awaited<ReturnType<typeof addCrmNote>> }) {
  return state && <p role={state.error ? 'alert' : 'status'} className={state.error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{state.message}</p>;
}

export function CrmWriteForms({ customerId, staff, mode }: {
  customerId: string; staff: CrmStaffOption[]; mode: 'note' | 'follow-up';
}) {
  const branches = [...new Map(staff.map((person) => [person.branch_id, person.branch_name]))];
  const [branch, setBranch] = useState(branches.length === 1 ? branches[0][0] : '');
  const [assignment, setAssignment] = useState(staff.length === 1 ? staff[0].branch_id + ':' + staff[0].id : '');
  const [dueOn, setDueOn] = useState('');
  const [body, setBody] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [noteState, noteAction, savingNote] = useActionState(async (
    state: Awaited<ReturnType<typeof addCrmNote>>, form: FormData,
  ) => {
    const result = await addCrmNote(customerId, state, form);
    if (result && !result.error) setBody('');
    return result;
  }, null);
  const [followUpState, followUpAction, savingFollowUp] = useActionState(async (
    state: Awaited<ReturnType<typeof addCrmFollowUp>>, form: FormData,
  ) => {
    const result = await addCrmFollowUp(customerId, state, form);
    if (result && !result.error) {
      setNextAction('');
      setDueOn('');
    }
    return result;
  }, null);
  return mode === 'note' ? (
      <form action={noteAction} className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Add internal note</h2>
        <Select label="Branch" name="branchId" className="min-h-11" required disabled={savingNote}
          value={branch} onValueChange={setBranch}>
          <option value="">Choose a branch</option>
          {branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </Select>
        <Textarea label="Note" name="body" required maxLength={2000} disabled={savingNote}
          value={body} onChange={(event) => setBody(event.currentTarget.value)} />
        <Feedback state={noteState} />
        <Button type="submit" className="min-h-11" loading={savingNote}>Save note</Button>
      </form>
  ) : (
      <form action={followUpAction} className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Create follow-up</h2>
        <Select label="Branch and assignee" name="assignment" className="min-h-11" required disabled={savingFollowUp}
          value={assignment} onValueChange={setAssignment}>
          <option value="">Choose a branch and assignee</option>
          {staff.map((person) => {
            const value = person.branch_id + ':' + person.id;
            return <option key={value} value={value}>{person.branch_name} / {person.name}</option>;
          })}
        </Select>
        <DatePicker label="Due date" name="dueOn" value={dueOn} onChange={setDueOn} required disabled={savingFollowUp} />
        <Textarea label="Next action" name="nextAction" required maxLength={300} disabled={savingFollowUp}
          placeholder="e.g., Call the customer about repair pickup" value={nextAction}
          onChange={(event) => setNextAction(event.currentTarget.value)} />
        <Feedback state={followUpState} />
        <Button type="submit" className="min-h-11" loading={savingFollowUp}>Create follow-up</Button>
      </form>
  );
}

export function CrmFollowUpStatusButton({ followUp }: { followUp: CrmFollowUp }) {
  const nextStatus = followUp.status === 'open' ? 'completed' : 'open';
  const [state, action, pending] = useActionState(setCrmFollowUpStatus.bind(null, followUp.id, nextStatus), null);
  return (
    <form action={action} className="space-y-1">
      <Button type="submit" variant="outline" loading={pending} className="min-h-11">
        {followUp.status === 'open' ? 'Mark complete' : 'Reopen follow-up'}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
