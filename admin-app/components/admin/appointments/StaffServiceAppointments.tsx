"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ServiceAppointmentsQueryError,
  useInvalidateServiceAppointmentsQuery,
  useStaffServiceAppointmentOptionsQuery,
  useStaffServiceAppointmentsQuery,
} from "@/data/appointments/client";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import { useRealtimeChanges } from "@/components/realtime/useRealtimeChanges";
import { StaffServiceAppointmentCard } from "@/components/admin/appointments/StaffServiceAppointmentCard";
import { StaffServiceAppointmentManagementTabs } from "@/components/admin/appointments/StaffServiceAppointmentManagementTabs";
import {
  StaffServiceAppointmentTabList,
  type StaffAppointmentsTab,
} from "@/components/admin/appointments/StaffServiceAppointmentTabList";
import {
  SERVICE_APPOINTMENT_STATUSES,
  type ServiceAppointmentFilters,
} from "@/lib/validations/service-appointments";
import type { RealtimeTable } from "@/types/realtime";

const EMPTY_FILTERS: ServiceAppointmentFilters = {
  status: "",
  branchId: "",
  date: "",
  search: "",
};

const APPOINTMENT_REALTIME_TABLES: RealtimeTable[] = [
  "service_appointments",
  "service_appointment_internal_notes",
];
const MANAGED_APPOINTMENT_REALTIME_TABLES: RealtimeTable[] = [
  ...APPOINTMENT_REALTIME_TABLES,
  "service_appointment_cancellation_requests",
  "service_appointment_closures",
];

export function StaffServiceAppointments({
  userId,
  canManage,
  canWork,
}: {
  userId: string;
  canManage: boolean;
  canWork: boolean;
}) {
  const [activeTab, setActiveTab] =
    useState<StaffAppointmentsTab>("appointments");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchValue, setSearchValue] = useState("");
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(
    null,
  );
  const optionsQuery = useStaffServiceAppointmentOptionsQuery(userId);
  const appointmentsQuery = useStaffServiceAppointmentsQuery(userId, filters);
  const invalidateAppointmentQueries = useInvalidateServiceAppointmentsQuery();
  const invalidateOnRealtimeChange = useCallback(() => {
    void invalidateAppointmentQueries();
  }, [invalidateAppointmentQueries]);
  const realtimeState = useRealtimeChanges(
    `staff-service-appointments-${userId}`,
    canManage ? MANAGED_APPOINTMENT_REALTIME_TABLES : APPOINTMENT_REALTIME_TABLES,
    invalidateOnRealtimeChange
  );
  const branches = optionsQuery.data?.branches ?? [];
  const selectedTab = canManage ? activeTab : "appointments";

  function updateFilter(field: keyof ServiceAppointmentFilters, value: string) {
    setOpenAppointmentId(null);
    setFilters((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    const search = searchValue.trim();
    if (search === filters.search) return;
    const timeout = window.setTimeout(() => {
      setOpenAppointmentId(null);
      setFilters((current) => ({ ...current, search }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [filters.search, searchValue]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Workshop operations
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Service appointments
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review customer requests, confirm schedules, and track service work.
          </p>
        </div>
        <RealtimeStatus state={realtimeState} />
      </header>

      <StaffServiceAppointmentTabList
        canManage={canManage}
        selectedTab={selectedTab}
        onSelect={setActiveTab}
      />

      <section
        id="appointments-appointments-panel"
        role="tabpanel"
        aria-labelledby="appointments-appointments-tab"
        tabIndex={0}
        hidden={selectedTab !== "appointments"}
      >
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
            <Input
              label="Search appointments"
              helperText="Search by appointment number, customer, contact, bike, or branch."
              type="search"
              placeholder="Appointment, customer, phone, or bike"
              value={searchValue}
              maxLength={100}
              leadingIcon={<Search className="h-4 w-4" />}
              onChange={(event) => setSearchValue(event.currentTarget.value)}
            />
            <Select
              label="Status"
              helperText="Show appointments in a specific status."
              value={filters.status}
              onChange={(event) => {
                const status =
                  SERVICE_APPOINTMENT_STATUSES.find(
                    (item) => item === event.currentTarget.value,
                  ) ?? "";
                updateFilter("status", status);
              }}
            >
              <option value="">All statuses</option>
              {SERVICE_APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
            <Select
              label="Branch"
              helperText="Limit results to a branch you can access."
              value={filters.branchId}
              onChange={(event) =>
                updateFilter("branchId", event.currentTarget.value)
              }
            >
              <option value="">All accessible branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
            <DatePicker
              label="Scheduled date"
              name="scheduledDateFilter"
              helperText="Filter by scheduled date in Philippine time."
              value={filters.date}
              onChange={(value) => updateFilter("date", value)}
            />
          </div>

          {optionsQuery.isError && (
            <div className="space-y-2" role="alert">
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Branch filters could not be loaded. Existing appointments remain
                available.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void optionsQuery.refetch();
                }}
              >
                Retry branch options
              </Button>
            </div>
          )}
          {!appointmentsQuery.data && appointmentsQuery.isPending && (
            <div
              className="space-y-3"
              role="status"
              aria-label="Loading appointments"
              aria-busy="true"
            >
              <div className="h-48 animate-pulse rounded-xl border bg-card" />
              <div className="h-48 animate-pulse rounded-xl border bg-card" />
            </div>
          )}
          {!appointmentsQuery.data && appointmentsQuery.isError && (
            <div className="space-y-3">
              <p
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                role="alert"
              >
                {appointmentsQuery.error instanceof
                ServiceAppointmentsQueryError
                  ? appointmentsQuery.error.message
                  : "Appointments could not be loaded."}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void appointmentsQuery.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          )}
          {appointmentsQuery.data && (
            <>
              {appointmentsQuery.isError && (
                <p
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                  role="alert"
                >
                  Appointment updates could not be refreshed. Showing the last
                  loaded data.
                </p>
              )}
              {appointmentsQuery.data.length ? (
                <div className="space-y-4">
                  {appointmentsQuery.data.map((appointment) => (
                    <StaffServiceAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      userId={userId}
                      canManage={canManage}
                      canWork={canWork}
                      cardOpen={openAppointmentId === appointment.id}
                      onCardOpenChange={(open) =>
                        setOpenAppointmentId(open ? appointment.id : null)
                      }
                    />
                  ))}
                  <p className="text-center text-xs text-muted-foreground">
                    Showing up to 100 appointments per filter.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border bg-card p-8 text-center">
                  <h2 className="font-semibold">No appointments found</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try changing the filters or check again later.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {canManage && (
        <StaffServiceAppointmentManagementTabs
          userId={userId}
          branches={branches}
          selectedTab={selectedTab}
          optionsQuery={optionsQuery}
        />
      )}
    </div>
  );
}
