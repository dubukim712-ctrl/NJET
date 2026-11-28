"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { getOrderDocumentPreviewAction } from "@/data/actions/order-documents";
import type { StaffOrder } from "@/data/commerce/admin-orders";

const OrderDocumentPreview = dynamic(() =>
  import("./OrderDocumentPreview").then(
    (module) => module.OrderDocumentPreview,
  ),
);

type OrderDocument = StaffOrder["documents"][number];

export function OrderPrivateDocuments({
  documents,
}: {
  documents: OrderDocument[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    url: string;
    contentType: string | null;
  } | null>(null);

  if (!documents.length) return null;

  async function openDocument(document: OrderDocument, title: string) {
    setPendingId(document.id);
    try {
      const result = await getOrderDocumentPreviewAction(document.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPreview({
        title,
        url: result.data,
        contentType: document.content_type,
      });
    } catch {
      toast.error("Could not open this private document.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="min-w-0 space-y-2 rounded-xl border border-border/60 bg-background/60 p-4">
      <h3 className="text-sm font-semibold">Private documents</h3>
      <ul className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        {documents.map((document) => {
          const title = document.kind === "identity" ? "ID" : "Payment proof";
          return (
            <li key={document.id}>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 w-full gap-1.5 whitespace-normal px-2 py-2 text-center sm:w-auto sm:px-3"
                loading={pendingId === document.id}
                disabled={pendingId !== null}
                onClick={() => void openDocument(document, title)}
              >
                <Eye
                  className="hidden sm:flex size-4 shrink-0"
                  aria-hidden="true"
                />
                {document.kind === "identity"
                  ? "View ID"
                  : "View payment proof"}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Verify required IDs and payment proof before confirming.
      </p>
      {preview && (
        <OrderDocumentPreview {...preview} onClose={() => setPreview(null)} />
      )}
    </section>
  );
}
