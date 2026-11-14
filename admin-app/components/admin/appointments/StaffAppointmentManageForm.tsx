"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppointmentDateTimeFields } from "@/components/appointments/AppointmentDateTimeFields";
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
  const [status, setStatus] = useState(appointment.status);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState(
    appointment.assigned_technician_id ?? "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateServiceAppointmentsQuery();
  const technicianQuery = useServiceTechnicianOptionsQuery(
    userId,
    appointment.branch_id,
  );
  const slotsQuery = useStaffServiceAppointmentSlotsQuery(
    userId,
    appointment.branch_id,
    date,
  );
  const scheduleRequired = status !== "requested" && status !== "cancelled";
  const availableTimes = slotsQuery.data?.times ?? [];
  const keepCurrentTime = Boolean(
    time && date === initialDateTime.date && time === initialDateTime.time,
  );
  const timeOptions = [
    ...new Set([...availableTimes, ...(keepCurrentTime ? [time] : [])]),
  ].sort();
  const timeHelperText = !date
    ? "Choose a date to see times within branch hours and closures."
    : slotsQuery.isPending
      ? "Loading this branch’s service times..."
      : slotsQuery.isError
        ? "Service times could not be loaded."
        : !slotsQuery.data?.hoursConfigured
          ? "Service hours are not configured for this branch."
          : !slotsQuery.data.branchOpen
            ? "This branch is closed on the selected weekday."
            : availableTimes.length
              ? "Times follow branch service hours; closure periods are excluded."
              : "No service slots are available on this date.";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (
      Boolean(date) !== Boolean(time) ||
      (scheduleRequired && (!date || !time))
    ) {
      setError("Choose both a scheduled date and time.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const estimate = String(form.get("estimate") ?? "");
    const total = String(form.get("finalTotal") ?? "");
    const parsed = staffServiceAppointmentUpdateSchema.safeParse({
      id: appointment.id,
      status,
      scheduledAt: date && time ? `${date}T${time}:00+08:00` : null,
      assignedTechnicianId:
        String(form.get("assignedTechnicianId") ?? "") || null,
      estimateMinor: estimate ? Math.round(Number(estimate) * 100) : null,
      finalTotalMinor: total ? Math.round(Number(total) * 100) : null,
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
      <Select
        name="status"
        label="Status"
        helperText="Choose an allowed next step for this appointment."
        value={status}
        onChange={(event) => {
          const next = statusOptions.find(
            (option) => option === event.currentTarget.value,
          );
          if (next) setStatus(next);
        }}
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </Select>
      <AppointmentDateTimeFields
        date={date}
        time={time}
        onDateChange={(value) => {
          setDate(value);
          setTime("");
        }}
        onTimeChange={setTime}
        dateLabel="Scheduled date (Philippine time)"
        timeLabel="Scheduled time"
        dateHelperText={
          appointment.status === "requested" && !appointment.scheduled_at
            ? "Prefilled from the customer’s preferred date; adjust if needed."
            : "Update the confirmed service date."
        }
        timeHelperText={timeHelperText}
        timeOptions={timeOptions}
        timeDisabled={
          !date ||
          slotsQuery.isPending ||
          slotsQuery.isError ||
          !availableTimes.length
        }
        required={scheduleRequired}
      />
      {date && slotsQuery.isError && (
        <p className="text-sm text-destructive sm:col-span-2" role="alert">
          {slotsQuery.error instanceof ServiceAppointmentsQueryError
            ? slotsQuery.error.message
            : "Service times could not be loaded."}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void slotsQuery.refetch();
            }}
          >
            Try again
          </button>
        </p>
      )}
      <Select
        name="assignedTechnicianId"
        label="Technician"
        helperText="Assign an eligible technician at this branch, or unassign them."
        value={assignedTechnicianId}
        onChange={(event) => setAssignedTechnicianId(event.currentTarget.value)}
      >
        <option value="">Unassigned</option>
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
          <button
            type="button"
            className="underline"
            onClick={() => {
              void technicianQuery.refetch();
            }}
          >
            Try again
          </button>
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
      {error && (
        <p className="text-sm text-destructive sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="sm:col-span-2"
        loading={saving}
        disabled={status === "cancelled"}
      >
        Save changes
      </Button>
    </form>
  );
}
