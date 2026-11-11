'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { AppointmentContactNumberInput } from '@/components/appointments/AppointmentContactNumberInput';
import { CustomerAppointmentAvailabilityPanel } from '@/components/dashboard/CustomerAppointmentAvailabilityPanel';
import { CustomerAppointmentDateTimeFields } from '@/components/dashboard/CustomerAppointmentDateTimeFields';
import {
  PhilippineAddressFields,
  type PhilippineAddressValues,
} from '@/components/admin/commerce/PhilippineAddressFields';
import {
  ServiceAppointmentsQueryError,
  useCustomerServiceAppointmentBranchesQuery,
  useInvalidateServiceAppointmentsQuery,
} from '@/data/appointments/client';
import { useCustomerServiceAppointmentSlotsQuery } from '@/data/appointments/availability-client';
import { requestServiceAppointmentAction } from '@/data/actions/service-appointments';
import {
  customerServiceAppointmentRequestSchema,
  SERVICE_APPOINTMENT_TYPES,
} from '@/lib/validations/service-appointments';

const EMPTY_ADDRESS: PhilippineAddressValues = {
  addressLine1: '',
  province: '',
  city: '',
  barangay: '',
  postalCode: '',
};

function fieldError(errors: Record<string, string[] | undefined>, name: string) {
  return errors[name]?.[0];
}

export function CustomerServiceAppointmentForm({ userId }: { userId: string }) {
  const router = useRouter();
  const branchesQuery = useCustomerServiceAppointmentBranchesQuery(userId);
  const invalidate = useInvalidateServiceAppointmentsQuery();
  const [serviceMode, setServiceMode] = useState<'branch_visit' | 'home_service'>('branch_visit');
  const [branchId, setBranchId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const slotsQuery = useCustomerServiceAppointmentSlotsQuery(
    userId,
    branchId,
    appointmentDate
  );
  const selectedAppointmentTime = slotsQuery.data?.times.includes(appointmentTime)
    ? appointmentTime
    : '';
  const validationMessages = Object.entries(fieldErrors).flatMap(([field, messages]) =>
    (messages ?? []).map((message) => `${field}: ${message}`)
  );
  const slotStart = appointmentDate && selectedAppointmentTime
    ? `${appointmentDate}T${selectedAppointmentTime}:00+08:00`
    : '';
  const selectedBranchName = branchesQuery.data?.find(
    (branch) => branch.id === branchId
  )?.name ?? '';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim();
    const parsed = customerServiceAppointmentRequestSchema.safeParse({
      branchId: value('branchId'),
      serviceMode,
      serviceType: value('serviceType'),
      bikeMake: value('bikeMake'),
      bikeModel: value('bikeModel'),
      bikeSerialNumber: value('bikeSerialNumber'),
      issueDescription: value('issueDescription'),
      addressLine1: serviceMode === 'home_service' ? value('addressLine1') : '',
      barangay: serviceMode === 'home_service' ? value('barangay') : '',
      city: serviceMode === 'home_service' ? value('city') : '',
      province: serviceMode === 'home_service' ? value('province') : '',
      postalCode: serviceMode === 'home_service' ? value('postalCode') : '',
      contactNumber: value('contactNumber'),
      preferredStartAt: appointmentDate && selectedAppointmentTime
        ? `${appointmentDate}T${selectedAppointmentTime}:00+08:00`
        : '',
    });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      setError('Please correct the highlighted appointment details.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestServiceAppointmentAction(parsed.data);
      if (!result.success) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      await invalidate();
      router.push('/dashboard/appointments');
    } catch (submitError) {
      console.error('Could not submit service appointment request.', submitError);
      setError('Your request could not be sent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (branchesQuery.isPending) {
    return <div className="h-40 animate-pulse rounded-xl border bg-card" role="status" aria-label="Loading service branches" />;
  }
  if (!branchesQuery.data) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          {branchesQuery.error instanceof ServiceAppointmentsQueryError ? branchesQuery.error.message : 'Service branches could not be loaded.'}
        </p>
        <Button type="button" variant="outline" onClick={() => { void branchesQuery.refetch(); }}>Try again</Button>
      </div>
    );
  }
  if (!branchesQuery.data.length) {
    return <p className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">No service branches are available right now.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          <p>{error}</p>
          {validationMessages.length > 0 && <ul className="mt-2 list-inside list-disc">{validationMessages.map((message) => <li key={message}>{message}</li>)}</ul>}
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                name="branchId"
                label="Service branch"
                helperText="Choose the branch that will handle your request."
                required
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.currentTarget.value);
                  setAppointmentTime('');
                }}
              >
                <option value="">Select a branch</option>
                {branchesQuery.data.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </Select>
              <Select
                name="serviceType"
                label="Service type"
                helperText="Choose the main reason for the visit."
              >
                {SERVICE_APPOINTMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type[0].toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </Select>
              <Select
                label="Service mode"
                helperText="Choose a branch visit or service at your address."
                value={serviceMode}
                onChange={(event) => {
                  const mode = event.currentTarget.value === 'home_service'
                    ? 'home_service'
                    : 'branch_visit';
                  setServiceMode(mode);
                  if (mode === 'branch_visit') setAddress(EMPTY_ADDRESS);
                }}
              >
                <option value="branch_visit">Branch visit</option>
                <option value="home_service">Home service</option>
              </Select>
              <CustomerAppointmentDateTimeFields
                branchId={branchId}
                date={appointmentDate}
                time={selectedAppointmentTime}
                slots={slotsQuery.data}
                loading={slotsQuery.isPending}
                error={slotsQuery.error}
                onDateChange={(value) => {
                  setAppointmentDate(value);
                  setAppointmentTime('');
                }}
                onTimeChange={setAppointmentTime}
                onRetry={() => { void slotsQuery.refetch(); }}
                dateError={fieldError(fieldErrors, 'preferredStartAt')}
              />
              <AppointmentContactNumberInput
                name="contactNumber"
                label="Contact number"
                helperText="Enter up to 11 digits; staff will use this number to confirm your request."
                autoComplete="tel"
                required
                error={fieldError(fieldErrors, 'contactNumber')}
              />
              <Input
                name="bikeMake"
                label="Bike make"
                helperText="Enter the manufacturer or brand."
                required
                maxLength={80}
                error={fieldError(fieldErrors, 'bikeMake')}
              />
              <Input
                name="bikeModel"
                label="Bike model"
                helperText="Enter the model name or number."
                required
                maxLength={100}
                error={fieldError(fieldErrors, 'bikeModel')}
              />
              <Input
                name="bikeSerialNumber"
                label="Serial number (optional)"
                helperText="Optional; it helps staff identify your bike."
                maxLength={100}
                error={fieldError(fieldErrors, 'bikeSerialNumber')}
              />
            </div>
            {serviceMode === 'home_service' && (
              <div className="space-y-3">
                <PhilippineAddressFields
                  values={address}
                  onChange={setAddress}
                  disabled={false}
                  required
                />
                {(['addressLine1', 'province', 'city', 'barangay', 'postalCode'] as const).map((name) => (
                  <input key={name} type="hidden" name={name} value={address[name]} />
                ))}
              </div>
            )}
            <Textarea
              name="issueDescription"
              label="What needs attention?"
              helperText="Describe the symptoms, damage, or service you need."
              required
              minLength={5}
              maxLength={2000}
              rows={4}
              error={fieldError(fieldErrors, 'issueDescription')}
            />
          </section>
          <p className="text-sm leading-6 text-muted-foreground">
            This is a request, not a confirmed booking. Staff will confirm the schedule and any home-service coverage or travel charge.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={submitting}>Send appointment request</Button>
            <Button asChild type="button" variant="outline"><Link href="/dashboard/appointments">Cancel</Link></Button>
          </div>
        </div>
        <CustomerAppointmentAvailabilityPanel
          userId={userId}
          branchId={branchId}
          branchName={selectedBranchName}
          slotStart={slotStart}
        />
      </div>
    </form>
  );
}
