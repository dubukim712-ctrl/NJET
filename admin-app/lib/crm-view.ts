import type { CrmDueFilter, CrmStatus } from '@/types/crm';

const philippineDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function getCrmToday(now = new Date()) {
  const parts = philippineDate.formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)?.value;
  return [part('year'), part('month'), part('day')].join('-');
}

export function getCrmDueState(dueOn: string, status: CrmStatus, today: string) {
  if (status === 'completed') return 'Completed';
  if (dueOn < today) return 'Overdue';
  if (dueOn === today) return 'Due today';
  return 'Upcoming';
}

export type CrmSearchParams = Record<string, string | string[] | undefined>;
export const CRM_PAGE_SIZE = 50;

export function firstCrmParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function getCrmPage(value?: string | string[]) {
  const page = Number(firstCrmParam(value));
  return Number.isInteger(page) && page > 0 && page <= 100_000 ? page : 1;
}

export function getCrmQueueFilters(params: CrmSearchParams) {
  const status: CrmStatus = firstCrmParam(params.status) === 'completed' ? 'completed' : 'open';
  const requestedDue = firstCrmParam(params.due);
  const due: CrmDueFilter = status === 'open' && (requestedDue === 'overdue' || requestedDue === 'today' || requestedDue === 'upcoming')
    ? requestedDue : 'any';
  return {
    status, due, mine: firstCrmParam(params.assignee) === 'mine',
    search: firstCrmParam(params.q)?.trim().slice(0, 100) ?? '',
    page: getCrmPage(params.page),
  };
}

export type CrmQueueFilters = ReturnType<typeof getCrmQueueFilters>;

export function buildCrmCustomersHref(search: string, page = 1) {
  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search.trim());
  if (page > 1) params.set('page', String(page));
  return '/admin/crm' + (params.size ? '?' + params : '');
}

export function buildCrmFollowUpsHref(filters: Omit<CrmQueueFilters, 'page'>, page = 1) {
  const params = new URLSearchParams();
  if (filters.status === 'completed') params.set('status', filters.status);
  if (filters.mine) params.set('assignee', 'mine');
  if (filters.status === 'open' && filters.due !== 'any') params.set('due', filters.due);
  if (filters.search.trim()) params.set('q', filters.search.trim());
  if (page > 1) params.set('page', String(page));
  return '/admin/crm/follow-ups' + (params.size ? '?' + params : '');
}
