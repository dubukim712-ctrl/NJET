"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  generateOrderCertificateAction,
  saveOrderInvoiceAction,
} from "@/data/actions/order-documents";
import { generateOrderReceiptAction } from "@/data/actions/order-receipts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Printer } from "lucide-react";

export function CompletedOrderDocuments({
  orderId,
  invoiceNo,
  isEbikeOrder,
  certificate,
  receipt,
  canManage,
  onDataChanged,
}: {
  orderId: string;
  invoiceNo: string | null;
  isEbikeOrder: boolean;
  certificate: { url: string | null; certificateNumber: string } | null;
  receipt: { url: string | null } | null;
  canManage: boolean;
  onDataChanged: () => void;
}) {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState(invoiceNo ?? "");
  const [savedInvoiceNo, setSavedInvoiceNo] = useState(invoiceNo ?? "");
  const [certificateNumber, setCertificateNumber] = useState(
    certificate?.certificateNumber ?? "",
  );
  const [busy, setBusy] = useState<
    "invoice" | "certificate" | "receipt" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const saveInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("invoice");
    setError(null);
    try {
      const result = await saveOrderInvoiceAction({
        orderId,
        invoiceNo: invoiceNumber,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setSavedInvoiceNo(invoiceNumber.trim());
      toast.success("Invoice number saved.");
      onDataChanged();
      router.refresh();
    } catch (actionError) {
      console.error("Could not save order invoice.", actionError);
      setError("Could not save the invoice number. Please try again.");
      toast.error("Could not save the invoice number. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const generateCertificate = async () => {
    if (!certificateNumber.trim()) {
      setError("Enter a certificate number.");
      return;
    }
    setBusy("certificate");
    setError(null);
    try {
      const result = await generateOrderCertificateAction({
        orderId,
        certificateNumber,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Ownership certificate generated.");
      if (result.data.warning) toast.warning(result.data.warning);
      onDataChanged();
      router.refresh();
    } catch (actionError) {
      console.error("Could not generate ownership certificate.", actionError);
      setError("Could not generate the certificate. Please try again.");
      toast.error("Could not generate the certificate. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const generateReceipt = async () => {
    setBusy("receipt");
    setError(null);
    try {
      const result = await generateOrderReceiptAction({ orderId });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Sales receipt generated.");
      if (result.data.warning) toast.warning(result.data.warning);
      onDataChanged();
      router.refresh();
    } catch (actionError) {
      console.error("Could not generate the sales receipt.", actionError);
      setError("Could not generate the sales receipt. Please try again.");
      toast.error("Could not generate the sales receipt. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  if (!canManage && !invoiceNo && !(isEbikeOrder && certificate) && !receipt)
    return null;

  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold">Documents</h3>
      <div className="grid grid-cols-1 gap-4 items-start sm:grid-cols-2">
        {canManage ? (
          <form
            onSubmit={saveInvoice}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <label className="w-full space-y-1 text-sm sm:max-w-xs">
              <span>Invoice number</span>
              <Input
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                maxLength={80}
                required
                disabled={busy !== null}
                className="min-h-10 w-full rounded-md border bg-background px-3"
              />
            </label>
            <Button
              type="submit"
              size="default"
              loading={busy === "invoice"}
              disabled={
                busy !== null ||
                !invoiceNumber.trim() ||
                invoiceNumber.trim() === savedInvoiceNo
              }
            >
              Save invoice number
            </Button>
          </form>
        ) : invoiceNo ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Invoice number:</span>{" "}
            {invoiceNo}
          </p>
        ) : null}

        {isEbikeOrder && (
          <div className="space-y-2">
            {(canManage || certificate?.url) && (
              <div className="space-y-2">
                {canManage && (
                  <label className="block w-full space-y-1 text-sm">
                    <span>Certificate number</span>
                    <Input
                      value={certificateNumber}
                      onChange={(event) =>
                        setCertificateNumber(event.target.value)
                      }
                      maxLength={80}
                      required
                      disabled={busy !== null}
                      className="min-h-10 w-full rounded-md border bg-background px-3"
                    />
                  </label>
                )}
                <div className="flex w-full items-center gap-2">
                  {canManage && (
                    <Button
                      type="button"
                      size="default"
                      variant={certificate ? "secondary" : "default"}
                      loading={busy === "certificate"}
                      disabled={busy !== null || !certificateNumber.trim()}
                      onClick={generateCertificate}
                      className="min-w-0 flex-1 whitespace-nowrap sm:flex-initial"
                    >
                      {certificate
                        ? "Regenerate certificate"
                        : "Generate certificate"}
                    </Button>
                  )}
                  {certificate?.url && (
                    <a
                      href={certificate.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Print certificate"
                      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent"
                    >
                      <Printer className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden md:inline">Print</span>
                    </a>
                  )}
                </div>
              </div>
            )}
            {certificate && !certificate.url && (
              <span className="text-sm text-destructive">
                Certificate link unavailable; refresh this page.
              </span>
            )}
            {!certificate && canManage && (
              <p className="text-xs text-muted-foreground">
                Sample certificate; not an official document.
              </p>
            )}
          </div>
        )}
      </div>
      <h1>Receipt</h1>
      <div className="flex flex-row sm:flex-wrap items-center gap-2">
        {canManage && (
          <Button
            type="button"
            size="default"
            variant={receipt ? "secondary" : "default"}
            loading={busy === "receipt"}
            disabled={busy !== null}
            onClick={generateReceipt}
            className="w-full sm:w-auto"
          >
            {receipt ? "Regenerate receipt" : "Generate receipt"}
          </Button>
        )}
        {receipt?.url ? (
          <a
            href={receipt.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Print receipt"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Print</span>
          </a>
        ) : receipt ? (
          <span className="text-sm text-destructive">
            Receipt link unavailable; refresh this page.
          </span>
        ) : null}
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
