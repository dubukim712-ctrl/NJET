'use client';

import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0');
  const minute = String((index % 2) * 30).padStart(2, '0');
  return `${hour}:${minute}`;
});

function todayInManila() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function AppointmentDateTimeFields({
  date,
  time,
  onDateChange,
  onTimeChange,
  dateLabel,
  timeLabel,
  dateHelperText,
  timeHelperText,
  timeOptions = TIME_OPTIONS,
  timeDisabled = false,
  minDate = todayInManila(),
  dateError,
  timeError,
  required = true,
}: {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateLabel: string;
  timeLabel: string;
  dateHelperText: string;
  timeHelperText: string;
  timeOptions?: string[];
  timeDisabled?: boolean;
  minDate?: string;
  dateError?: string;
  timeError?: string;
  required?: boolean;
}) {
  return (
    <>
      <DatePicker
        label={dateLabel}
        name="appointmentDate"
        value={date}
        onChange={onDateChange}
        min={minDate}
        required={required}
        helperText={dateHelperText}
        error={dateError}
      />
      <Select
        label={timeLabel}
        name="appointmentTime"
        value={time}
        onChange={(event) => onTimeChange(event.currentTarget.value)}
        required={required}
        disabled={timeDisabled}
        helperText={timeHelperText}
        error={timeError}
      >
        <option value="">Select a time</option>
        {timeOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </Select>
    </>
  );
}
