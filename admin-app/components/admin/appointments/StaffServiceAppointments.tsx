"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ServiceAppointmentsQueryError,
  useStaffServiceAppointmentOptionsQuery,
  useStaffServiceAppointmentsQuery,
} from "@/data/appointments/client";
import { StaffServiceAppointmentCard } from "@/components/admin/appointments/StaffServiceAppointmentCard";
import { AppointmentClosureCalendar } from "@/components/admin/appointments/AppointmentClosureCalendar";
import { StaffServiceAppointmentForm } from "@/components/admin/appointments/StaffServiceAppointmentForm";
import {
  SERVICE_APPOINTMENT_STATUSES,
  type ServiceAppointmentFilters,
} from "@/lib/validations/service-appointments";

const EMPTY_FILTERS: ServiceAppointmentFilters = {
  status: "",
  branchId: "",
  date: "",
  search: "",
};

type StaffAppointmentsTab = "appointments" | "create" | "schedule";
const STAFF_APPOINTMENTS_TABS: {
  id: StaffAppointmentsTab;
  label: string;
}[] = [
  { id: "appointments", label: "Appointments" },
  { id: "create", label: "Create Appointment" },
  { id: "schedule", label: "Branch Schedule" },
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
  const branches = optionsQuery.data?.branches ?? [];
  const visibleTabs = canManage
    ? STAFF_APPOINTMENTS_TABS
    : STAFF_APPOINTMENTS_TABS.slice(0, 1);
  const selectedTab = canManage ? activeTab : "appointments";

  function updateFilter(field: keyof ServiceAppointmentFilters, value: string) {
    setOpenAppointmentId(null);
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    current: StaffAppointmentsTab,
  ) {
    const index = visibleTabs.findIndex((tab) => tab.id === current);
    const nextIndex =
      event.key === "ArrowRight"
        ? (index + 1) % visibleTabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + visibleTabs.length) % visibleTabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? visibleTabs.length - 1
              : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = visibleTabs[nextIndex].id;
    setActiveTab(nextTab);
    document.getElementById(`appointments-${nextTab}-tab`)?.focus();
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
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Workshop operations
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Service appointments
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review customer requests, confirm schedules, and track service work.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Service appointment workspace"
        className="flex gap-2 overflow-x-auto border-b"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            id={`appointments-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={selectedTab === tab.id}
            aria-controls={`appointments-${tab.id}-panel`}
            tabIndex={selectedTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selectedTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
        <section
          id="appointments-create-panel"
          role="tabpanel"
          aria-labelledby="appointments-create-tab"
          tabIndex={0}
          hidden={selectedTab !== "create"}
          className="rounded-xl border bg-card p-5 sm:p-6"
        >
          <header className="mb-5">
            <h2 className="text-xl font-semibold">Create Appointment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule and assign a confirmed service appointment.
            </p>
          </header>
          {optionsQuery.isPending ? (
            <div
              className="h-20 animate-pulse rounded-lg bg-muted"
              role="status"
              aria-label="Loading appointment setup"
            />
          ) : optionsQuery.data?.branches.length ? (
            <StaffServiceAppointmentForm
              userId={userId}
              branches={optionsQuery.data.branches}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {optionsQuery.error instanceof ServiceAppointmentsQueryError
                  ? optionsQuery.error.message
                  : "No service branches are available to your account."}
              </p>
              {optionsQuery.isError && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void optionsQuery.refetch();
                  }}
                >
                  Retry branch options
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {canManage && (
        <section
          id="appointments-schedule-panel"
          role="tabpanel"
          aria-labelledby="appointments-schedule-tab"
          tabIndex={0}
          hidden={selectedTab !== "schedule"}
        >
          {optionsQuery.isPending ? (
            <div
              className="h-32 animate-pulse rounded-xl border bg-card"
              role="status"
              aria-label="Loading branch schedule"
            />
          ) : optionsQuery.data ? (
            <AppointmentClosureCalendar userId={userId} branches={branches} />
          ) : optionsQuery.isError ? (
            <div className="space-y-3 rounded-xl border bg-card p-5">
              <p className="text-sm text-destructive" role="alert">
                {optionsQuery.error instanceof ServiceAppointmentsQueryError
                  ? optionsQuery.error.message
                  : "Branch schedule could not be loaded."}
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
          ) : null}
        </section>
      )}
    </div>
  );
}
