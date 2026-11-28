"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function OrderDocumentPreview({ title, url, contentType, onClose }: {
  title: string;
  url: string;
  contentType: string | null;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      size="wide"
      footer={
        <Button asChild variant="outline">
          <a href={url} target="_blank" rel="noopener noreferrer">Open in new tab</a>
        </Button>
      }
    >
      {failed ? (
        <p role="alert" className="text-sm text-muted-foreground">
          The preview could not load. Reopen the document for a fresh link.
        </p>
      ) : contentType === "application/pdf" ? (
        <iframe title={title} src={url} referrerPolicy="no-referrer" className="h-[55dvh] w-full rounded-lg border" />
      ) : (
        // Serve the private image directly from its short-lived signed URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={title} referrerPolicy="no-referrer" onError={() => setFailed(true)}
          className="mx-auto max-h-[55dvh] max-w-full rounded-lg object-contain" />
      )}
    </Modal>
  );
}
