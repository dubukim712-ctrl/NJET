"use client";

import { Download } from "lucide-react";
import type { StaffOrder } from "@/data/commerce/admin-orders";

export function OrderPrivateDocuments({
  documents,
}: {
  documents: StaffOrder["documents"];
}) {
  if (!documents.length) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Private documents</h3>
      <ul className="flex flex-wrap gap-2">
        {documents.map((document) => (
          <li key={document.id}>
            {document.url ? (
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center min-h-10 gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent"
              >
                <Download className="h-4 w-4" />
                Download {document.kind === "identity" ? "ID" : "payment proof"}
              </a>
            ) : (
              <span className="text-sm text-destructive">
                Private file link unavailable; refresh this page.
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Verify required IDs and payment proof before confirming.
      </p>
    </section>
  );
}
