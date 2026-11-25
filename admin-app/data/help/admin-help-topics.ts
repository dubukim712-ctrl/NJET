import type { HelpTopic } from './customer-help-topics';

export const adminHelpTopics = [
  {
    id: 'online-orders',
    label: 'Sales & Online Orders',
    guides: [
      {
        title: 'Review and confirm an online order',
        keywords: 'verify identity id payment proof phone confirm stock cancel',
        steps: [
          'Open Orders (/admin/orders), find the online order, and click View details.',
          'Review the required ID images and payment proof. If the order needs manual phone verification, check the number with the customer before clicking Mark phone as manually verified.',
          'When the order is awaiting confirmation and the checks are complete, click Confirm and reserve stock. For an eligible cancellation, click Cancel order, then Yes, cancel order.',
        ],
      },
      {
        title: 'Complete a sale and generate customer documents',
        keywords: 'receipt certificate pdf complete payment home credit financing',
        steps: [
          'Open View details on a confirmed order. Use Complete sale and record payment to enter the payment collected, then click Complete sale.',
          'For Home Credit, use Complete Home Credit sale. Enter the account and financing details, then click Complete sale.',
          'On a completed order, use Generate receipt. Use Generate certificate where the order offers it. Customers can retrieve available documents from their order history.',
        ],
      },
    ],
  },
  {
    id: 'walk-in-and-chat',
    label: 'Walk-In Sales & Customer Chats',
    guides: [
      {
        title: 'Record a walk-in or Home Credit sale',
        keywords: 'counter sale cash tendered customer installment downpayment',
        steps: [
          'In Orders, click Create walk-in sale to open /admin/orders/new. Choose the branch, fill in the customer details, and add the products being sold.',
          'Under Payment method, choose Cash, Online payment, or Home Credit. Enter cash tendered, the online payment provider and reference, or the Home Credit account and financing details as prompted.',
          'Review the cart and totals, then click Complete sale. If the result is uncertain, check Orders before trying again.',
        ],
      },
      {
        title: 'Reply to a customer chat',
        keywords: 'support inbox reply message resolved reopen',
        steps: [
          'Open Customer chats (/admin/chats). Use the Open, Resolved, or All filter to find the conversation.',
          'Type a reply and click Send message. Use Resolve chat when the issue is handled, or Reopen chat if more help is needed.',
        ],
      },
    ],
  },
  {
    id: 'appointments',
    label: 'Service Appointments & Technician Tasks',
    guides: [
      {
        title: 'Schedule an appointment or review a cancellation',
        keywords: 'service request assign technician date slot confirmed booking',
        steps: [
          'Open Service appointments (/admin/appointments) and expand the appointment. Choose the scheduled date and time, assign a technician, and click Save changes.',
          'If the customer requested cancellation, read the reason and choose Approve cancellation or Reject request.',
          'To make a booking directly, choose Create Appointment, fill in the details, and click Create confirmed appointment.',
        ],
      },
      {
        title: 'Add a branch closure',
        keywords: 'branch schedule blocked time holiday closure',
        steps: [
          'In Service appointments, choose Branch Schedule and select the branch.',
          'Enter the closure start and end and click Add closure. Reschedule any overlapping confirmed appointments before blocking the time.',
        ],
      },
      {
        title: 'Work through an assigned technician task',
        keywords: 'my tasks repair branch visit home service no show',
        steps: [
          'Open My tasks (/admin/my-tasks) and find an appointment assigned to you.',
          'Click Start service when work begins. For a branch visit, click Mark ready for pickup when the work is done. For home service, click Finish repair.',
          'Use Mark as no-show when the customer misses the appointment and that action is available.',
        ],
      },
    ],
  },
  {
    id: 'warranty-returns',
    label: 'Warranty Reviews, Exchanges & Returns',
    guides: [
      {
        title: 'Record the original e-bike handover',
        keywords: 'completed order warranty handovers original purchase wheel count serial deadline',
        steps: [
          'In Orders (/admin/orders), open View details on the completed sale and expand Warranty handovers.',
          'Select the Purchased bike and verify its serial. Set Verified wheel count and the Actual handover date to the day the customer received the bike. Click Record handover.',
          'The standard reporting window runs from handover. It is 7 days for two-wheel units and 3 calendar months for three- or four-wheel units.',
        ],
      },
      {
        title: 'Review warranty coverage during service',
        keywords: 'inspection technician branch home service verify purchased bike decision covered repair paid repair',
        steps: [
          'Customers book a regular service appointment. Follow the usual inspection for a Branch visit or Home service. In Service appointments (/admin/appointments), staff with appointment management access can click Start warranty review when the appointment is In service, Ready for pickup, or Completed.',
          'Use Verify purchased bike to enter the Original serial number and click Save. Review the original purchase, handover, and request timing. The timing is based on when the appointment was requested. Consider the inspection findings and policy before deciding coverage.',
          'Click Record decision, select a Warranty decision, and explain the finding and any charges in Decision and charges. Click Save. The customer can read this note. Verify the purchased bike before selecting Replacement approved.',
        ],
      },
      {
        title: 'Receive the original bike and hand over a replacement',
        keywords: 'replacement approved warranty exchange receive original unit reserve replacement serial release reservation stock handover',
        steps: [
          'Staff need appointment and inventory management access for the appointment branch. After approving a replacement, use Warranty exchange to confirm the original serial and enter Returned condition. Click Receive original unit when the bike is physically returned. Keep it separate from sellable stock while it is at the branch.',
          'Choose an Available replacement serial for the same variant at the appointment branch and click Reserve replacement. If none is available, keep the return on record while waiting for eligible stock. Reserve only the bike you plan to hand over.',
          'Once the customer receives that bike, set Actual replacement handover date and click Complete handover, then confirm. Use Release reservation if you need to free up the reserved unit before handover.',
          'The customer can use Download exchange record from their appointment details. The original sale and documents retain their original serial. The exchange records both serials and leaves the original warranty dates in place. Confirm any replacement coverage separately.',
        ],
      },
      {
        title: 'Track a returned bike in Non-sellable stock',
        keywords: 'damaged defective condition quarantine stock reason disposition repair supplier write off',
        steps: [
          'With inventory management access, open Products & stock (/admin/products) and choose Non-sellable stock. The returned bike appears after Receive original unit, even while waiting for a replacement.',
          'Find the bike by checking the serial and branch. Use the service reference to find the appointment. Click Update return and choose a Return reason and Disposition, such as Held at branch, Sent for repair, Returned to supplier, or Written off.',
          'Use Staff note (optional) if needed and click Save return update. Each update records who made it and when. These updates leave the returned bike outside sellable stock.',
        ],
      },
    ],
  },
  {
    id: 'admin-operations',
    label: 'Admin Catalog, Stock, Reports & Settings',
    guides: [
      {
        title: 'Manage catalog categories, products, and variants',
        keywords: 'products stock catalogue create edit sku discounts reviews',
        steps: [
          'Open Products & stock (/admin/products), then Product Catalog. In Product catalog actions, choose Manage main categories, Manage subcategories, or Create product.',
          'Use Edit product for an existing item. Open Variants and choose Add variant to create a sellable option, then fill in the SKU, pricing, and other details.',
        ],
      },
      {
        title: 'Receive or transfer stock',
        keywords: 'inventory serial motor number purchase supplier branch transfer',
        steps: [
          'In Products & stock, open Stock and choose Receive Stock. Enter the branch, receipt details, and products. Include the serial and motor numbers for each new e-bike unit, then click Record receipt.',
          'For a transfer, choose the source and destination, specify the quantities or serials, and click Dispatch transfer. At the destination, find the shipment and click Receive.',
          'Use Inventory valuation (/admin/inventory) to review stock value.',
        ],
      },
      {
        title: 'Manage locations and export a sales report',
        keywords: 'branches delivery zones shipping fee export csv reports',
        steps: [
          'Open Branches (/admin/branches) and use Add branch or Save branch. In Delivery zones (/admin/delivery-zones), choose Add delivery zone, then Add zone or Save zone.',
          'Open Sales report (/admin/reports), choose your filters, then use Export CSV. Narrow the date range if the export is incomplete.',
        ],
      },
      {
        title: 'Manage user access and review audit logs',
        keywords: 'roles rbac permissions access users security admin audit',
        steps: [
          'In Roles (/admin/roles), choose New role, set the role details and permissions, then click Create role. For an existing role, use Save permissions when editing is allowed.',
          'Open Users (/admin/users) to assign a role or branch where your permissions allow it.',
          'In Audit Logs (/admin/audit-logs), use the filters and open an entry to see changes. Delete selected and Clear all logs require full access.',
        ],
      },
      {
        title: 'Change the checkout phone verification setting',
        keywords: 'sms otp system settings checkout business documents policies payment accounts',
        steps: [
          'With full access, open Settings (/admin/settings), choose Checkout, and find Phone verification.',
          'Set Require phone verification at checkout, then click Save checkout setting. If it is off, staff verify the number before confirming online orders.',
        ],
      },
    ],
  },
] as const satisfies readonly HelpTopic[];
