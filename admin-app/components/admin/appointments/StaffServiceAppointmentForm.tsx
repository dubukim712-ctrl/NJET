'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { AppointmentDateTimeFields } from '@/components/appointments/AppointmentDateTimeFields';
import { AppointmentContactNumberInput } from '@/components/appointments/AppointmentContactNumberInput';
import {
  PhilippineAddressFields,
  type PhilippineAddressValues,
} from '@/components/admin/commerce/PhilippineAddressFields';
import {
  ServiceAppointmentsQueryError,
  useInvalidateServiceAppointmentsQuery,
  useServiceTechnicianOptionsQuery,
} from '@/data/appointments/client';
import { createStaffServiceAppointmentAction } from '@/data/actions/service-appointments';
import {
  SERVICE_APPOINTMENT_TYPES,
  staffServiceAppointmentCreateSchema,
} from '@/lib/validations/service-appointments';

const EMPTY_ADDRESS: PhilippineAddressValues = {
  addressLine1: '',
  province: '',
  city: '',
  barangay: '',
  postalCode: '',
};

export function StaffServiceAppointmentForm({
  userId,
  branches,
}: {
  userId: string;
  branches: { id: string; name: string }[];
}) {
  const [branchId, setBranchId] = useState('');
  const [serviceMode, setServiceMode] = useState<'branch_visit' | 'home_service'>('branch_visit');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const invalidate = useInvalidateServiceAppointmentsQuery();
  const selectedBranchId = branchId || branches[0]?.id || '';
  const techniciansQuery = useServiceTechnicianOptionsQuery(userId, selectedBranchId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaved(false);
    setFieldErrors({});
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => String(form.get(name) ?? '').trim();
    const parsed = staffServiceAppointmentCreateSchema.safeParse({
      branchId: selectedBranchId,
      serviceMode,
      serviceType: value('serviceType'),
      customerName: value('customerName'),
      contactNumber: value('contactNumber'),
      bikeMake: value('bikeMake'),
      bikeModel: value('bikeModel'),
      bikeSerialNumber: value('bikeSerialNumber'),
      issueDescription: value('issueDescription'),
      addressLine1: serviceMode === 'home_service' ? value('addressLine1') : '',
      barangay: serviceMode === 'home_service' ? value('barangay') : '',
      city: serviceMode === 'home_service' ? value('city') : '',
      province: serviceMode === 'home_service' ? value('province') : '',
      postalCode: serviceMode === 'home_service' ? value('postalCode') : '',
      scheduledAt: appointmentDate && appointmentTime
        ? `${appointmentDate}T${appointmentTime}:00+08:00`
        : '',
      assignedTechnicianId: value('assignedTechnicianId'),
      estimateMinor: value('estimate') ? Math.round(Number(value('estimate')) * 100) : null,
    });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      setError('Please correct the appointment details.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createStaffServiceAppointmentAction(parsed.data);
      if (!result.success) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      await invalidate();
      formElement.reset();
      setBranchId('');
      setServiceMode('branch_visit');
      setAppointmentDate('');
      setAppointmentTime('');
      setAddress(EMPTY_ADDRESS);
      setSaved(true);
    } catch (submitError) {
      console.error('Could not create service appointment.', submitError);
      setError('The appointment could not be created. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const errors = Object.entries(fieldErrors).flatMap(([field, messages]) =>
    (messages ?? []).map((message) => `${field}: ${message}`)
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {saved && <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm" role="status">Appointment created.</p>}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          <p>{error}</p>
          {errors.length > 0 && <ul className="mt-2 list-inside list-disc">{errors.map((message) => <li key={message}>{message}</li>)}</ul>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Select name="branchId" label="Service branch" helperText="This branch is used for service routing and technician assignment." value={selectedBranchId} onChange={(event) => setBranchId(event.currentTarget.value)} required>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </Select>
        <div className="space-y-2">
          <Select name="assignedTechnicianId" label="Technician" helperText="Choose an eligible technician assigned to this branch." required disabled={!techniciansQuery.data?.technicians.length}>
            <option value="">Select a technician</option>
            {techniciansQuery.data?.technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}
          </Select>
          {techniciansQuery.isPending && <span className="block text-xs text-muted-foreground">Loading technicians…</span>}
          {techniciansQuery.isError && (
            <span className="block text-xs text-destructive">
              {techniciansQuery.error instanceof ServiceAppointmentsQueryError ? techniciansQuery.error.message : 'Technicians could not be loaded.'}
              <button type="button" className="ml-2 underline" onClick={() => { void techniciansQuery.refetch(); }}>Try again</button>
            </span>
          )}
          {!techniciansQuery.isPending && !techniciansQuery.isError && !techniciansQuery.data?.technicians.length && <span className="block text-xs text-muted-foreground">No eligible technicians at this branch.</span>}
        </div>
        <Select
          label="Service mode"
          helperText="Home service requires a complete Philippine address."
          value={serviceMode}
          onChange={(event) => {
            const mode = event.currentTarget.value === 'home_service' ? 'home_service' : 'branch_visit';
            setServiceMode(mode);
            if (mode === 'branch_visit') setAddress(EMPTY_ADDRESS);
          }}
        >
            <option value="branch_visit">Branch visit</option>
            <option value="home_service">Home service</option>
        </Select>
        <Select name="serviceType" label="Service type" helperText="Choose the primary work category.">
            {SERVICE_APPOINTMENT_TYPES.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
        </Select>
        <Input name="customerName" label="Customer name" helperText="Enter the name the customer uses." required maxLength={100} error={fieldErrors.customerName?.[0]} />
        <AppointmentContactNumberInput name="contactNumber" label="Contact number" helperText="Enter up to 11 digits for scheduling and service updates." required error={fieldErrors.contactNumber?.[0]} />
        <Input name="bikeMake" label="Bike make" helperText="Enter the manufacturer or brand." required maxLength={80} error={fieldErrors.bikeMake?.[0]} />
        <Input name="bikeModel" label="Bike model" helperText="Enter the model name or number." required maxLength={100} error={fieldErrors.bikeModel?.[0]} />
        <Input name="bikeSerialNumber" label="Serial number (optional)" helperText="Optional; useful for identifying the bike." maxLength={100} error={fieldErrors.bikeSerialNumber?.[0]} />
        <AppointmentDateTimeFields
          date={appointmentDate}
          time={appointmentTime}
          onDateChange={setAppointmentDate}
          onTimeChange={setAppointmentTime}
          dateLabel="Scheduled date (Philippine time)"
          timeLabel="Scheduled time"
          dateHelperText="Choose the confirmed service date."
          timeHelperText="Choose a 30-minute service slot."
          dateError={fieldErrors.scheduledAt?.[0]}
        />
        {serviceMode === 'home_service' && (
          <>
            <div className="sm:col-span-2">
              <PhilippineAddressFields
                values={address}
                onChange={setAddress}
                disabled={false}
                required
                enableLocationAutofill={false}
              />
              {(['addressLine1', 'province', 'city', 'barangay', 'postalCode'] as const).map((name) => (
                <input key={name} type="hidden" name={name} value={address[name]} />
              ))}
            </div>
          </>
        )}
        <Input name="estimate" label="Estimate (PHP, optional)" helperText="Enter an initial amount in Philippine pesos, if known." type="number" min="0" step="0.01" error={fieldErrors.estimateMinor?.[0]} />
        <Textarea name="issueDescription" label="Service notes" helperText="Record the reported issue or agreed scope of work." required minLength={5} maxLength={2000} rows={3} containerClassName="sm:col-span-2" error={fieldErrors.issueDescription?.[0]} />
      </div>
      <Button type="submit" loading={submitting} disabled={!techniciansQuery.data?.technicians.length}>Create confirmed appointment</Button>
    </form>
  );
}
