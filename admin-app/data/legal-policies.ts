import {
  PRIVACY_VERSION,
  RETURN_POLICY_VERSION,
  TERMS_VERSION,
} from '@/lib/commerce';
export type LegalPolicySlug = 'terms' | 'return-policy' | 'privacy';
export const LEGAL_POLICY_SLUGS: LegalPolicySlug[] = [
  'terms',
  'return-policy',
  'privacy',
];
export type LegalSection = {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  bullets?: string[];
};
export type LegalPolicy = {
  slug: LegalPolicySlug;
  title: string;
  version: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};
export const TERMS_POLICY: LegalPolicy = {
    slug: 'terms',
    title: 'Terms & Conditions',
    version: TERMS_VERSION,
    lastUpdated: 'November 15, 2026',
    intro: 'These terms apply when you browse this storefront, create an account, or place an order with Noel & Jane E-bike Trading (NJET).',
    sections: [
      {
        id: 'scope',
        title: 'Who we are and what these terms cover',
        summary: 'The rules for using the NJET storefront and ordering online.',
        paragraphs: [
          'NJET sells e-bikes, parts, and accessories through this storefront and its branches. These terms apply together with the Return & Refund Policy, the Privacy Policy, and any written terms given with your specific purchase.',
          'If a product-specific written agreement gives more detail, it applies to that product as long as it is consistent with applicable Philippine law.',
        ],
      },
      {
        id: 'accounts',
        title: 'Accounts and accurate information',
        summary: 'Keep your account, contact, delivery, and order information accurate.',
        paragraphs: [
          'You are responsible for activity under your account and for keeping your sign-in details private. Contact us if you believe someone has used your account without permission.',
          'Provide accurate customer, contact, and address details so we can review and fulfill your order. E-bike orders require a valid ID document during checkout for order verification.',
        ],
      },
      {
        id: 'products',
        title: 'Products, prices, and availability',
        summary: 'Product variants, PHP pricing, and branch stock can change.',
        paragraphs: [
          'Product descriptions and images are provided to help you compare items. Colors, specifications, included accessories, and other details can vary by model or variant; contact the store if a detail is important to your purchase.',
          'Prices are shown in Philippine pesos. Inventory is branch-specific and is not reserved until NJET staff confirms your order. We will contact you if an item, price, or listing needs correction before confirmation.',
        ],
      },
      {
        id: 'orders',
        title: 'Orders and confirmation',
        summary: 'An online submission is a request until store staff confirms it.',
        paragraphs: [
          'Submitting an order does not by itself confirm acceptance or reserve stock. NJET staff review availability and order details, then provide confirmation and the next steps.',
          'Check your order details and contact us promptly if something is incorrect. We may contact you to clarify details before confirming an order.',
        ],
      },
      {
        id: 'payment',
        title: 'Payment',
        summary: 'Use the payment options shown for your order and follow verification instructions.',
        paragraphs: [
          'Available payment methods and any amount due are shown during checkout. Online payments use the selected payment account and may require proof of payment after the order is submitted. An order is not treated as paid until the payment is verified.',
          'Home Credit applications are completed in-store and remain subject to the provider’s review and approval. Do not send passwords, PINs, or one-time codes to anyone claiming to represent NJET.',
        ],
      },
      {
        id: 'fulfillment',
        title: 'Pickup and delivery',
        summary: 'Orders use the selected branch or delivery zone and address.',
        paragraphs: [
          'Choose an available pickup branch or delivery option at checkout. Delivery fees and service areas depend on the selected zone and are shown before you submit the order.',
          'Keep your phone available for order coordination. Timing may change because of stock checks, weather, traffic, or courier availability; staff will share updates when they are available.',
        ],
      },
      {
        id: 'handover',
        title: 'E-bike handover and safe use',
        summary: 'Inspect and test the unit with store staff before accepting it.',
        paragraphs: [
          'The supporting handover form asks customers to inspect the unit, accessories, and operating condition and to receive a demonstration. Raise visible damage or a concern with staff before completing handover, and keep your receipt and warranty documents.',
          'Use and maintain the product according to its manufacturer instructions and applicable road and safety rules. Stop using a unit that appears unsafe and contact the store for guidance.',
        ],
      },
      {
        id: 'warranty',
        title: 'Warranty and service',
        summary: 'The written warranty issued for your unit states its specific coverage.',
        paragraphs: [
          'Warranty coverage, duration, covered components, and customer responsibilities depend on the written warranty card or purchase agreement issued for the exact product. Keep that document with your receipt and check it at purchase.',
          'Service is handled by appointment or the technician’s schedule. The written warranty explains when labor, parts, materials, or transportation are chargeable. Any home-service or transportation fee will be explained before service is arranged.',
        ],
      },
      {
        id: 'returns',
        title: 'Cancellations, returns, and consumer rights',
        summary: 'See the Return & Refund Policy; statutory consumer rights still apply.',
        paragraphs: [
          'Contact NJET as soon as possible if you need to change or cancel an order, or if an item is incorrect, damaged, or defective. Eligibility and available remedies depend on order status, the facts of the case, your written purchase terms, and applicable law.',
          'Nothing in these terms removes rights or remedies that cannot legally be excluded under Philippine consumer-protection laws.',
        ],
      },
      {
        id: 'privacy',
        title: 'Privacy',
        summary: 'How NJET handles account, order, and supporting-document information.',
        paragraphs: [
          'The Privacy Policy explains what information we collect, why we use it, when it may be shared, and how you can make a privacy request.',
        ],
      },
      {
        id: 'site-use',
        title: 'Site use, changes, and governing law',
        summary: 'Use the storefront lawfully and check this page for updates.',
        paragraphs: [
          'Do not misuse the storefront, interfere with its operation, submit false order details, or attempt to access another person’s account or information.',
          'NJET may update these terms when its services or requirements change. The version and date shown on this page identify the current text. Philippine law applies, subject to mandatory consumer rights and other applicable law.',
        ],
      },
    ],
};
export const RETURN_POLICY: LegalPolicy = {
    slug: 'return-policy',
    title: 'Return & Refund Policy',
    version: RETURN_POLICY_VERSION,
    lastUpdated: 'November 25, 2026',
    intro: 'This policy explains how to report order problems and request an assessment, service, return, or refund from Noel & Jane E-bike Trading (NJET).',
    sections: [
      {
        id: 'handover-check',
        title: 'Inspect the item at handover',
        summary: 'Check the unit and accessories and ask for a demonstration before acceptance.',
        paragraphs: [
          'NJET’s handover form asks the customer and store staff to inspect and test the unit, including its body, tires, parts, charger, lights, brakes, keys, and operating condition. Ask the technician to demonstrate the unit and note visible damage or missing items before signing for receipt.',
          'If an item appears unsafe or does not match the order, pause use and tell the staff handling the handover.',
        ],
      },
      {
        id: 'report',
        title: 'Report a problem promptly',
        summary: 'Contact the store as soon as you notice a missing, damaged, or faulty item.',
        paragraphs: [
          'Contact NJET using the current details in the site footer or your sales documents. Include your order or receipt number, purchase date, the item and variant, a description of the issue, and clear photos or video when helpful.',
          'The supporting handover form asks customers to observe the unit during the first three days. Report suspected factory defects promptly so the technician can inspect them; this request does not limit rights provided by applicable law or your written warranty.',
        ],
      },
      {
        id: 'assessment',
        title: 'Inspection and service',
        summary: 'A technician reviews the issue and explains the available next steps.',
        paragraphs: [
          'Issues are assessed based on the unit, the reported fault, purchase records, and the written warranty for that product. Service is generally scheduled by appointment. You may be asked to bring the unit to a branch.',
          'If home service is available, any technician or transportation fee will be explained before you agree to the appointment. Parts, materials, and labor responsibilities are governed by the written warranty and applicable law.',
        ],
      },
      {
        id: 'warranty',
        title: 'Warranty coverage',
        summary: 'Use the warranty card issued for your exact e-bike or accessory.',
        paragraphs: [
          'The standard e-bike service assessment window starts at handover. Report the issue when booking service within 7 days for a two-wheel e-bike or 3 calendar months for a three- or four-wheel e-bike, even if the appointment is later. Staff inspect the unit before deciding on repair or replacement. You can still request review after the deadline. Keep your receipt and the written warranty issued for your unit.',
          'Accident, misuse, neglect, modification, unauthorized repair, or maintenance outside the manufacturer’s instructions may affect warranty coverage to the extent allowed by the written warranty and applicable law. The warranty document also explains coverage for chargers, batteries, and accessories.',
        ],
      },
      {
        id: 'cancellations',
        title: 'Order changes and cancellations',
        summary: 'Contact the store immediately; options depend on the order’s status.',
        paragraphs: [
          'If you need to change or cancel an order, contact NJET as soon as possible and before pickup or dispatch where possible. Staff will explain whether the order can still be changed and any disclosed costs that may apply.',
          'Any cancellation term or charge is subject to the purchase agreement and applicable law. No charge under this policy waives a consumer right that cannot legally be excluded.',
        ],
      },
      {
        id: 'returns-refunds',
        title: 'Returns, replacements, and refunds',
        summary: 'The remedy depends on the issue and applicable consumer-protection rules.',
        paragraphs: [
          'A change-of-mind request is not automatically approved. For an incorrect, incomplete, damaged, or defective item, NJET will review the circumstances and explain the remedy available under the written purchase terms and applicable Philippine law. Depending on the case, this may include repair, replacement, or refund where required or agreed.',
          'If a refund is approved, NJET will confirm the amount, payment method, and expected processing steps with you. Payment-provider or bank processing times may also apply.',
        ],
      },
      {
        id: 'request',
        title: 'How to request help',
        summary: 'Have your proof of purchase and warranty documents ready.',
        paragraphs: [
          'Contact the store using the phone number, email, or address currently displayed in the site footer or on your sales documents. Share your order or receipt number and do not send passwords, PINs, or one-time codes.',
          'If you disagree with an assessment, ask the store to explain the finding and the applicable warranty or purchase term in writing.',
        ],
      },
    ],
};
export const PRIVACY_POLICY: LegalPolicy = {
    slug: 'privacy',
    title: 'Privacy Policy',
    version: PRIVACY_VERSION,
    lastUpdated: 'November 15, 2026',
    intro: 'Noel & Jane E-bike Trading (NJET) respects your privacy. This policy describes how we handle personal information when you use our storefront, place an order, or contact the store.',
    sections: [
      {
        id: 'information',
        title: 'Information we collect',
        summary: 'Account, contact, order, payment-verification, and technical information.',
        paragraphs: ['Depending on how you use the site, we may collect:'],
        bullets: [
          'Account details such as your name, email address, and sign-in information.',
          'Contact and fulfillment details such as your phone number, delivery address, selected branch, and delivery zone.',
          'Order details such as items, variants, payment status, invoices, e-bike serial records, and service or warranty requests.',
          'Documents you submit, including an ID image for an e-bike order and payment proof when requested.',
          'Basic technical information needed to operate and protect the site, such as browser, device, and diagnostic data.',
        ],
      },
      {
        id: 'use',
        title: 'Why we use your information',
        summary: 'To operate accounts, verify orders, fulfill purchases, and provide support.',
        paragraphs: ['We use information as needed to:'],
        bullets: [
          'Create and secure your account and respond to your requests.',
          'Review orders, confirm stock, verify payments, arrange pickup or delivery, and issue purchase documents.',
          'Verify e-bike orders, support warranty or repair requests, and maintain sales and service records.',
          'Protect the storefront, investigate suspected misuse, and meet legal or regulatory requirements.',
        ],
      },
      {
        id: 'sharing',
        title: 'When information may be shared',
        summary: 'Only with people and providers needed to run the sale or meet the law.',
        paragraphs: [
          'NJET may share relevant information with authorized staff and service providers that support site hosting, secure storage, payment verification, customer support, or delivery. We share only what is reasonably needed for that task.',
          'If you choose Home Credit, financing applications are handled in-store and information needed for that application may be provided to the financing provider. We may also disclose information when required by law or to protect customers, the business, or the public.',
          'NJET does not sell personal information as a business practice.',
        ],
      },
      {
        id: 'documents',
        title: 'Identity and payment documents',
        summary: 'Private order documents are used for verification and order support.',
        paragraphs: [
          'ID images and payment documents submitted through the site are stored as private order records and made available to authorized staff for order verification. Do not upload documents that are not requested or send account passwords, PINs, or one-time codes.',
          'Home Credit applications are completed in-store; the storefront is not an online Home Credit application form.',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies and site operation',
        summary: 'Essential browser storage supports sign-in and shopping features.',
        paragraphs: [
          'The storefront uses necessary browser storage and similar technologies to keep sessions secure, remember cart activity, and make the site work. Blocking these technologies may prevent some account or checkout features from working.',
        ],
      },
      {
        id: 'retention',
        title: 'Storage and retention',
        summary: 'Records are kept while needed for orders, warranties, and legal duties.',
        paragraphs: [
          'We keep information for as long as needed to operate your account, complete orders, provide service or warranty support, resolve disputes, and meet applicable recordkeeping obligations. When it is no longer needed, we take reasonable steps to delete or de-identify it, subject to backups and legal requirements.',
        ],
      },
      {
        id: 'rights',
        title: 'Your privacy rights',
        summary: 'You may request access or correction and raise a privacy concern.',
        paragraphs: [
          'Subject to applicable law and identity verification, you may ask to access or correct your personal information, object to or restrict certain processing, request deletion or data portability where available, or withdraw consent where processing relies on consent.',
          'To make a request, contact NJET using the current details shown in the site footer or your sales documents. You may also raise a concern with the National Privacy Commission of the Philippines.',
        ],
      },
      {
        id: 'security',
        title: 'Security and policy updates',
        summary: 'We use safeguards and update this notice when our practices change.',
        paragraphs: [
          'NJET and its service providers use reasonable safeguards to protect information. No online service can guarantee absolute security, so contact us promptly if you believe your account or information has been exposed.',
          'We may update this policy to reflect changes in our services or legal requirements. The version and last-updated date at the top identify the current notice. Philippine data privacy law, including Republic Act No. 10173, applies.',
        ],
      },
    ],
};

export const DEFAULT_LEGAL_POLICIES: Record<LegalPolicySlug, LegalPolicy> = {
  terms: TERMS_POLICY,
  'return-policy': RETURN_POLICY,
  privacy: PRIVACY_POLICY,
};
