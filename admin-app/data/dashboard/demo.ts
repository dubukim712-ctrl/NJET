export const STAFF_METRICS = {
  admin: [
    { label: 'Orders today', value: '24', note: '+12% this week' },
    { label: 'Open service jobs', value: '08', note: '3 due today' },
    { label: 'Inventory alerts', value: '04', note: 'Needs attention' },
    { label: 'Team members', value: '18', note: '2 on schedule' },
  ],
  sales: [
    { label: 'Orders today', value: '24', note: '+12% this week' },
    { label: 'Awaiting payment', value: '06', note: 'Across 4 customers' },
    { label: 'Ready to ship', value: '09', note: '3 added this morning' },
  ],
  technician: [
    { label: 'Assigned today', value: '05', note: '2 priority jobs' },
    { label: 'In progress', value: '03', note: 'Next due at 2:30 PM' },
    { label: 'Parts to collect', value: '04', note: 'From the stock room' },
  ],
} as const;

export const SALES_ORDERS = [
  { id: 'SO-2048', customer: 'Northstar Supply', total: '$1,280', status: 'Ready to ship' },
  { id: 'SO-2047', customer: 'Marlow Workshop', total: '$860', status: 'Payment due' },
  { id: 'SO-2046', customer: 'Field & Form', total: '$2,410', status: 'Processing' },
];

export const TECHNICIAN_JOBS = [
  { id: 'SV-0312', title: 'Replace drive belt', customer: 'Marlow Workshop', time: '10:30 AM', status: 'In progress' },
  { id: 'SV-0315', title: 'Quarterly inspection', customer: 'Eastline Studio', time: '1:00 PM', status: 'Scheduled' },
  { id: 'SV-0318', title: 'Calibrate cutting head', customer: 'Northstar Supply', time: '3:30 PM', status: 'Parts needed' },
];

export const INVENTORY_ITEMS = [
  { name: 'Drive belt, 18 mm', stock: '2 left', level: 'Low stock' },
  { name: 'Precision blade set', stock: '4 left', level: 'Reorder soon' },
  { name: 'Filter cartridge', stock: '18 left', level: 'In stock' },
];

export const CALENDAR_ITEMS = [
  { time: '10:30', label: 'Service visit · Marlow Workshop' },
  { time: '1:00', label: 'Quarterly inspection · Eastline Studio' },
  { time: '3:30', label: 'Parts pickup · Stock room' },
];

export const RECENT_ACTIVITY = [
  { title: 'Order SO-2048 packed', detail: 'Northstar Supply · 12 min ago' },
  { title: 'Service visit completed', detail: 'Marlow Workshop · 48 min ago' },
  { title: 'New customer account', detail: 'Field & Form · 1 hour ago' },
];

export const WEEKLY_ACTIVITY = [
  { day: 'M', height: '45%' },
  { day: 'T', height: '68%' },
  { day: 'W', height: '54%' },
  { day: 'T', height: '82%' },
  { day: 'F', height: '64%' },
  { day: 'S', height: '36%' },
  { day: 'S', height: '24%' },
];

export const STORE_PRODUCTS = [
  { id: 'field-notebook', name: 'Field Notebook', category: 'TOOLS & ACCESSORIES', price: '$18.00', priceCents: 1800, color: '#d8b27b' },
  { id: 'workshop-apron', name: 'Workshop Apron', category: 'WORKWEAR', price: '$64.00', priceCents: 6400, color: '#55745d' },
  { id: 'precision-tool-set', name: 'Precision Tool Set', category: 'EQUIPMENT', price: '$128.00', priceCents: 12800, color: '#7b8b85' },
];

export const STORE_ANNOUNCEMENTS = [
  { date: 'NOV 08', title: 'New workshop essentials are here', body: 'A considered collection of tools made for the everyday.' },
  { date: 'NOV 02', title: 'A little more time to browse', body: 'Complimentary delivery on orders over $100 this month.' },
];

export const CUSTOMER_ORDER = {
  number: 'ORD-10428',
  item: 'Workshop Apron',
  status: 'On its way',
  arrival: 'Expected Thursday, Nov 12',
};
