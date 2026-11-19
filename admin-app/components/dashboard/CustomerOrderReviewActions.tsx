'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getCustomerOrderItemReviewAction,
  getCustomerOrderItemReviewsAction,
} from '@/data/actions/order-product-reviews';
import { useAuth } from '@/components/auth/AuthProvider';
import { ProductReviewForm } from '@/components/shop/ProductReviewForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

type ReviewableOrderItem = {
  id: string;
  name: string;
  orderItemId: string;
};

export function CustomerOrderReviewActions({
  orderId,
  orderNumber,
  items,
}: {
  orderId: string;
  orderNumber: string;
  items: ReviewableOrderItem[];
}) {
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<ReviewableOrderItem | null>(null);
  const canReview = user?.scope === 'customer'
    && hasPermission(user, PERMISSIONS.storefrontAccess);
  const orderItemIds = [...new Set(items.map((item) => item.orderItemId))].sort();
  const reviewsQuery = useQuery({
    queryKey: ['customer-order-item-reviews', user?.id ?? null, orderId, orderItemIds],
    queryFn: async () => {
      const result = await getCustomerOrderItemReviewsAction({ orderId, orderItemIds });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(canReview && orderItemIds.length),
    retry: false,
    staleTime: 60_000,
  });
  const reviewQuery = useQuery({
    queryKey: ['my-order-item-review', user?.id ?? null, orderId, selectedItem?.orderItemId ?? null],
    queryFn: async () => {
      if (!selectedItem) throw new Error('Choose an order item to review.');
      const result = await getCustomerOrderItemReviewAction({
        orderId,
        orderItemId: selectedItem.orderItemId,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(selectedItem && canReview),
    retry: false,
  });
  const reviewedOrderItemIds = new Set(
    reviewsQuery.data?.reviews
      .filter((review) => review.status === 'pending' || review.status === 'published')
      .map((review) => review.orderItemId) ?? []
  );
  const availableItems = items.filter(
    (item) => !reviewedOrderItemIds.has(item.orderItemId)
  );

  return (
    <>
      {canReview && reviewsQuery.isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          Checking existing reviews…
        </p>
      )}
      {canReview && reviewsQuery.isError && (
        <p className="text-sm text-destructive" role="alert">
          {reviewsQuery.error.message}
        </p>
      )}
      {availableItems.map((item) => (
        <Button
          key={item.orderItemId}
          type="button"
          size="sm"
          onClick={() => setSelectedItem(item)}
        >
          {items.length === 1 ? 'Write a review' : `Review ${item.name}`}
        </Button>
      ))}
      <Modal
        open={Boolean(selectedItem)}
        title={selectedItem ? `Review ${selectedItem.name}` : 'Write a review'}
        onClose={() => setSelectedItem(null)}
      >
        {!canReview ? (
          <p className="text-sm text-muted-foreground">
            Sign in with a customer account to submit a review.
          </p>
        ) : reviewQuery.isPending ? (
          <p className="text-sm text-muted-foreground" role="status">
            Checking your purchase eligibility…
          </p>
        ) : reviewQuery.isError && !reviewQuery.data ? (
          <div className="space-y-3" role="alert">
            <p className="text-sm text-destructive">
              {reviewQuery.error.message || 'Your review eligibility could not be checked.'}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => { void reviewQuery.refetch(); }}
            >
              Try again
            </Button>
          </div>
        ) : !reviewQuery.data?.authenticated ? (
          <p className="text-sm text-muted-foreground">
            Sign in with a customer account to submit a review.
          </p>
        ) : !reviewQuery.data.eligible ? (
          <p className="text-sm text-muted-foreground">
            Reviews are available after a completed online purchase.
          </p>
        ) : selectedItem && user ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Order {orderNumber}
            </p>
            {reviewQuery.data.review && (
              <p className="mb-4 rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground" role="status">
                {reviewQuery.data.review.status === 'pending'
                  ? 'Your review is awaiting approval.'
                  : reviewQuery.data.review.status === 'published'
                    ? 'Your review is public. Changes will need approval.'
                    : 'Your previous review was not approved. Update it to resubmit.'}
              </p>
            )}
            <ProductReviewForm
              key={`${orderId}-${selectedItem.orderItemId}-${reviewQuery.data.review?.id ?? 'new'}`}
              orderId={orderId}
              orderItemId={selectedItem.orderItemId}
              productId={selectedItem.id}
              userId={user.id}
              review={reviewQuery.data.review}
            />
          </>
        ) : null}
      </Modal>
    </>
  );
}
