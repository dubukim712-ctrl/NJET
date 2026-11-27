export type HelpGuide = {
  title: string;
  keywords: string;
  steps: readonly string[];
};

export type HelpTopic = {
  id: string;
  label: string;
  guides: readonly HelpGuide[];
};

export const customerHelpTopics = [
  {
    id: 'cart',
    label: 'Browsing, Branches & Cart Limits',
    guides: [
      {
        title: 'How do I add a product to my cart?',
        keywords: 'shop search filters variant color model stock',
        steps: [
          'Open Shop and select a product. Choose a Store branch, then choose an available Variant.',
          'Click Add to cart. Open the shopping cart to review your items or use the Increase quantity and Decrease quantity controls to change quantities.',
          'Maximum available quantity in cart means the branch cannot supply another unit. If you choose a different branch for the same variant, Move to this branch and add one moves the whole cart line when the new branch can supply it.',
        ],
      },
    ],
  },
  {
    id: 'checkout',
    label: 'Checkout, Delivery & Home Credit',
    guides: [
      {
        title: 'How do I choose pickup or delivery?',
        keywords: 'shipping address fee branch fulfillment cash',
        steps: [
          'Open your cart and click Continue to checkout. Sign in if prompted.',
          'Choose Pick up at store and select a Pickup branch, or choose Delivery and select a Delivery zone. For delivery, fill in your address and check the delivery fee in the order summary.',
          'For pickup orders with an e-bike reservation fee, Online payment collects the reservation amount and the balance is due at the store. Cash is unavailable for those orders. When no pickup reservation applies, Online payment collects the full total.',
          'Review the checkout policies, give the required consent, and click Place order when the required details are complete.',
        ],
      },
      {
        title: 'How does Home Credit work?',
        keywords: 'installment financing downpayment payment account pickup',
        steps: [
          'Choose Pick up at store and select Home Credit (store pickup) under Payment method.',
          'Complete the installment application at the store. If your order shows a Home Credit downpayment due online, choose a payment platform and Payment account at checkout.',
          'After placing the order, follow the payment instructions and submit proof within one hour if a downpayment is due.',
        ],
      },
    ],
  },
  {
    id: 'verification',
    label: 'SMS Verification & Valid IDs',
    guides: [
      {
        title: 'How do I verify my phone number?',
        keywords: 'sms otp text message mobile resend cooldown',
        steps: [
          'Enter your Philippine mobile number under Contact number and click Send verification code if SMS verification is required.',
          'Enter the 6-digit verification code and click Verify number. The code expires after five minutes. Wait at least 60 seconds before selecting Send another code. You can request up to three codes in 15 minutes.',
          'When SMS verification is turned off, staff verify your number before they confirm your order.',
        ],
      },
      {
        title: 'When do I need to upload a valid ID?',
        keywords: 'identification documents e-bike file photo',
        steps: [
          'For an e-bike order, open Valid ID document(s) at checkout. Add at least one and up to five clear ID images.',
          'Use JPG, PNG, or WebP files. Staff will review the documents before confirming the order.',
        ],
      },
    ],
  },
  {
    id: 'orders',
    label: 'Payments & Receipts',
    guides: [
      {
        title: 'How do I submit payment proof?',
        keywords: 'online payment qr reference replace proof one hour gcash',
        steps: [
          'After you place an order that requires online payment, follow the instructions on the payment page. You can return to it through Complete payment in Orders.',
          'Pay the exact amount shown. Upload a JPG, PNG, or WebP image up to 5 MB and add a Payment reference (optional) if you have one.',
          'Click Submit payment proof within one hour of placing the order. The payment page displays the time remaining.',
        ],
      },
      {
        title: 'Where are my orders and receipts?',
        keywords: 'order history tracking status invoice print older orders',
        steps: [
          'Open Orders and choose Load older orders if the order is further back in your history.',
          'Awaiting payment means proof is still due. Awaiting confirmation means staff still need to confirm your order. Other badges include Confirmed, Completed, Cancelled, and Expired.',
          'On a completed order, choose View / Print Receipt.',
        ],
      },
    ],
  },
  {
    id: 'appointments',
    label: 'Service Appointments & Cancellations',
    guides: [
      {
        title: 'How do I book a service appointment?',
        keywords: 'repair maintenance technician slots service hours closures',
        steps: [
          'Open Appointments and choose Book service. Select a Service branch and Service type, then choose Branch visit or Home service.',
          'Choose a date and time. The available slots reflect branch hours and closures. For Home service, enter the requested address.',
          'Enter your Contact number, Product / E-bike name, and Serial number if you have it. If you see Use a purchased or previously serviced bike, select your bike to fill in its details.',
          'Describe the issue and click Send appointment request. Staff will confirm the schedule and any home-service availability or travel charge.',
        ],
      },
      {
        title: 'What if my bike might qualify for warranty service?',
        keywords: 'warranty assessment inspection coverage repair replacement handover deadline 7 days 3 months',
        steps: [
          'Use Book service and choose the service type that matches your issue. Describe what happened and have your receipt or warranty card and bike serial ready for the branch visit or home service.',
          'The standard window for reporting an issue starts when you received the bike. It is 7 days for a two-wheel e-bike and 3 calendar months for a three- or four-wheel e-bike. Staff can still review your case after that window.',
          'Staff assess the bike during service and explain whether they can offer a covered repair, replacement, or paid repair. Open your appointment details to see the Warranty assessment when staff have recorded it.',
        ],
      },
      {
        title: 'Where do I get my warranty exchange record?',
        keywords: 'replacement approved reserved stock handover returned bike original serial printable receipt',
        steps: [
          'Replacement approved means staff agreed to a replacement. Staff will arrange the exchange once an eligible unit is available.',
          'After you receive the replacement and staff record the handover, open Appointments, select the appointment, and choose Download exchange record. It lists both serial numbers and references your original order.',
          'Keep the exchange record with your original sales receipt. Ask staff which warranty terms apply to the replacement.',
        ],
      },
      {
        title: 'How do I request a cancellation?',
        keywords: 'cancel booking appointment subject reason',
        steps: [
          'In Appointments, find the eligible appointment and look for Request cancellation.',
          'Enter a subject and reason, then click Send cancellation request. The appointment stays active until staff approve the request.',
        ],
      },
    ],
  },
  {
    id: 'chat',
    label: 'Support Chat & Guest Recovery',
    guides: [
      {
        title: 'How do I start or recover a support chat?',
        keywords: 'live help contact message email verification guest browser',
        steps: [
          'Click Chat with us to open /chat. If you are signed in, use your account conversation.',
          'As a guest, enter your name, choose Email or Phone, and click Start chat.',
          'For Email, enter the six-digit Recovery code and choose Verify and continue. Use the same email to recover the conversation on another device. The code expires after ten minutes.',
          'For Phone, return to Chat with us in the same browser. Phone guest chats stay in the browser where they were started.',
        ],
      },
    ],
  },
] as const satisfies readonly HelpTopic[];
