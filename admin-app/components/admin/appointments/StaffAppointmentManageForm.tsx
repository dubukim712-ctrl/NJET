"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getScheduleBlockingReason } from "@/components/admin/appointments/schedule-save-availability";
import { formatStaffAppointmentDate } from '@/lib/staff-appointment-editing';
import { AppointmentDateTimeFields } from "@/components/appointments/AppointmentDateTimeFields";
import { StaffCancelAppointment } from "@/components/admin/appointments/StaffCancelAppointment";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ServiceAppointmentsQueryError,
  useInvalidateServiceAppointmentsQuery,
  useServiceTechnicianOptionsQuery,
} from "@/data/appointments/client";
import { useStaffServiceAppointmentSlotsQuery } from "@/data/appointments/availability-client";
import { updateStaffServiceAppointmentAction } from "@/data/actions/service-appointments";
import { staffServiceAppointmentUpdateSchema } from "@/lib/validations/service-appointments";
import type { StaffServiceAppointment } from "@/data/appointments/queries";
import type { ServiceAppointmentStatus } from "@/types/commerce-tables";

function localDateTimeParts(value: string | null) {
  if (!value) return { date: "", time: "" };
  const [date = "", time = ""] = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(value))
    .replace(" ", "T")
    .split("T");
  return { date, time };
}

export function StaffAppointmentManageForm({
  appointment,
  userId,
  statusOptions,
}: {
  appointment: StaffServiceAppointment;
  userId: string;
  statusOptions: ServiceAppointmentStatus[];
}) {
  const initialDateTime = localDateTimeParts(
    appointment.scheduled_at ?? appointment.preferred_start_at,
  );
  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  const [status, setStatus] = useState<ServiceAppointmentStatus>(appointment.status === "requested" ? "confirmed" : appointment.status);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState(
    appointment.assigned_technician_id ?? "",
  );
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateServiceAppointmentsQuery();
  const technicianQuery = useServiceTechnicianOptionsQuery(
    userId,
    appointment.branch_id,
  );
  const needsInitialBooking = !appointment.scheduled_at;
  const showSlotPicker = (needsInitialBooking || rescheduling) && status !== 'no_show' && status !== 'completed';
  const scheduledDate = showSlotPicker ? date : initialDateTime.date;
  const scheduledTime = showSlotPicker ? time : initialDateTime.time;
  const slotsQuery = useStaffServiceAppointmentSlotsQuery(userId, appointment.branch_id, showSlotPicker ? date : '');
  const keepCurrentTime = Boolean(
    appointment.scheduled_at && scheduledTime &&
    scheduledDate === initialDateTime.date && scheduledTime === initialDateTime.time,
  );
  const checkingSlots = showSlotPicker && (slotsQuery.isPending || slotsQuery.isFetching);
  const availableTimes = slotsQuery.data?.times ?? [];
  const timeOptions = [...new Set([...availableTimes, ...(keepCurrentTime ? [scheduledTime] : [])])].sort();
  const timeHelperText = keepCurrentTime
    ? 'Current booking. Choose another available time to change it.'
    : !date
      ? 'Choose a date to see available times.'
      : checkingSlots
        ? 'Loading service times...'
        : slotsQuery.isError
          ? 'Service times could not be loaded.'
          : !slotsQuery.data?.hoursConfigured
            ? 'Service hours are not configured for this branch.'
            : !slotsQuery.data.branchOpen
              ? 'The branch is closed on the selected day.'
              : availableTimes.length
                ? 'Choose an available time in Philippine time.'
                : 'No service slots are available on this date.';
  const blockingReason = getScheduleBlockingReason({
    date: scheduledDate, time: scheduledTime, scheduleRequired: true, keepCurrentTime,
    checkingSlots, slotsFailed: slotsQuery.isError, availableTimes, emptySlotsReason: timeHelperText,
  });

  function toggleRescheduling() {
    setRescheduling(!rescheduling);
    setDate(initialDateTime.date);
    setTime(initialDateTime.time);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || blockingReason) return;
    setError("");

    const form = new FormData(event.currentTarget);
    const estimate = String(form.get("estimate") ?? "");
    const total = String(form.get("finalTotal") ?? "");
    const parsed = staffServiceAppointmentUpdateSchema.safeParse({
      id: appointment.id,
      status,
      scheduledAt: keepCurrentTime
        ? appointment.scheduled_at
        : scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}:00+08:00` : null,
      assignedTechnicianId:
        String(form.get("assignedTechnicianId") ?? "") || null,
      estimateMinor: estimate ? Math.round(Number(estimate) * 100) : null,
      finalTotalMinor: status === "completed"
        ? total ? Math.round(Number(total) * 100) : null
        : appointment.final_total_minor,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          "Please correct the appointment update.",
      );
      return;
    }

    setSaving(true);
    try {
      const result = await updateStaffServiceAppointmentAction(parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await invalidate();
      toast.success("Appointment changes saved.");
    } catch (updateError) {
      console.error("Could not update service appointment.", updateError);
      setError("Appointment changes could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 border-t p-4 sm:grid-cols-2"
    >
      <div className="space-y-2 sm:col-span-2">
        <h3 className="font-semibold">{appointment.status === 'requested' ? 'Confirm booking' : 'Update appointment'}</h3>
        {appointment.scheduled_at && (
          <p className="text-sm text-muted-foreground">Current booking: {formatStaffAppointmentDate(appointment.scheduled_at)} (Philippine time)</p>
        )}
        {appointment.status === 'confirmed' && status === 'confirmed' && (
          <Button type="button" variant="outline" className="min-h-11" onClick={toggleRescheduling}>
            {rescheduling ? 'Keep current booking' : 'Reschedule'}
          </Button>
        )}
      </div>
      {appointment.status !== 'requested' && (
        <Select label="Status" value={status} onValueChange={(value) => {
          const next = statusOptions.find((option) => option === value);
          if (!next) return;
          setStatus(next);
          if (next !== 'confirmed' && rescheduling) toggleRescheduling();
        }}>
          {statusOptions.map((option) => (
            <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1).replaceAll('_', ' ')}</option>
          ))}
        </Select>
      )}
      {showSlotPicker && (
        <AppointmentDateTimeFields
          date={date}
          time={time}
          onDateChange={(value) => {
            setDate(value);
            setTime(value === initialDateTime.date && appointment.scheduled_at ? initialDateTime.time : '');
          }}
          onTimeChange={setTime}
          dateLabel="Scheduled date (Philippine time)"
          timeLabel="Scheduled time"
          dateHelperText={needsInitialBooking ? "Start with the customer's preferred date." : 'Choose a date for the new slot.'}
          timeHelperText={timeHelperText}
          timeOptions={timeOptions}
          timeDisabled={!date || checkingSlots || slotsQuery.isError || !timeOptions.length}
        />
      )}
      <Select
        name="assignedTechnicianId"
        label="Technician"
        helperText="Choose an eligible technician at this branch."
        required
        value={assignedTechnicianId}
        onValueChange={(value) => setAssignedTechnicianId(value)}
      >
        <option value="">Choose a technician</option>
        {appointment.assigned_technician_id &&
          !technicianQuery.data?.technicians.some(
            (tech) => tech.id === appointment.assigned_technician_id,
          ) && (
            <option value={appointment.assigned_technician_id}>
              {appointment.assigned_technician_name ?? "Current technician"}
            </option>
          )}
        {technicianQuery.data?.technicians.map((technician) => (
          <option key={technician.id} value={technician.id}>
            {technician.name}
          </option>
        ))}
      </Select>
      {technicianQuery.isError && (
        <p className="text-sm text-destructive sm:col-span-2" role="alert">
          {technicianQuery.error instanceof ServiceAppointmentsQueryError
            ? technicianQuery.error.message
            : "Technician options could not be loaded."}{" "}
          <Button
            type="button"
            variant="link"
            className="min-h-11"
            onClick={() => {
              void technicianQuery.refetch();
            }}
          >
            Try again
          </Button>
        </p>
      )}
      <Input
        name="estimate"
        label="Estimate (PHP)"
        helperText="The expected service amount in Philippine pesos."
        type="number"
        min="0"
        step="0.01"
        defaultValue={
          appointment.estimate_minor === null
            ? ""
            : (appointment.estimate_minor / 100).toFixed(2)
        }
      />
      {status === 'completed' && (
        <Input
          name="finalTotal"
          label="Final total (PHP)"
          helperText="Enter the final amount when service is complete."
          type="number"
          min="0"
          step="0.01"
          defaultValue={
            appointment.final_total_minor === null
              ? ""
              : (appointment.final_total_minor / 100).toFixed(2)
          }
        />
      )}
      {error && (
        <p className="text-sm text-destructive sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <div className="space-y-2 sm:col-span-2">
        {blockingReason && (
          <p className="text-sm text-muted-foreground" role="status">{blockingReason}</p>
        )}
        {showSlotPicker && date && slotsQuery.isError && !checkingSlots && (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => void slotsQuery.refetch()}>
            Retry availability check
          </Button>
        )}
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          {!appointment.cancellation_request && ["requested", "confirmed"].includes(appointment.status) && (
            <StaffCancelAppointment appointmentId={appointment.id} reference={appointment.appointment_number} />
          )}
          <Button type="submit" className="min-h-11 w-full sm:w-auto" loading={saving} disabled={Boolean(blockingReason)}>
            {appointment.status === "requested" ? "Confirm appointment" : rescheduling ? "Save new schedule" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
