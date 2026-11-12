import type { KeyboardEvent } from 'react';

export type StaffAppointmentsTab = 'appointments' | 'create' | 'schedule';

const TABS: { id: StaffAppointmentsTab; label: string }[] = [
  { id: 'appointments', label: 'Appointments' },
  { id: 'create', label: 'Create Appointment' },
  { id: 'schedule', label: 'Branch Schedule' },
];

export function StaffServiceAppointmentTabList({
  canManage,
  selectedTab,
  onSelect,
}: {
  canManage: boolean;
  selectedTab: StaffAppointmentsTab;
  onSelect: (tab: StaffAppointmentsTab) => void;
}) {
  const visibleTabs = canManage ? TABS : TABS.slice(0, 1);

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    current: StaffAppointmentsTab
  ) {
    const index = visibleTabs.findIndex((tab) => tab.id === current);
    const nextIndex =
      event.key === 'ArrowRight'
        ? (index + 1) % visibleTabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + visibleTabs.length) % visibleTabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? visibleTabs.length - 1
              : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = visibleTabs[nextIndex].id;
    onSelect(nextTab);
    document.getElementById(`appointments-${nextTab}-tab`)?.focus();
  }

  return (
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
          onClick={() => onSelect(tab.id)}
          onKeyDown={(event) => handleKeyDown(event, tab.id)}
          className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            selectedTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
