export const releasesBucket = 'njet-storefront-branding';
export const releasesPath = '/admin/customer-releases';

export type ReleaseOrderOption = {
  key: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  productId: string | null;
  modelName: string;
  branchId: string | null;
  branchName: string;
};
