"use client";

import { useQueryClient } from '@tanstack/react-query';
import { checkoutOptionsQueryKey } from '@/data/commerce/checkout-options-client';
import { customerProfileQueryKey } from '@/data/commerce/customer-query-keys';
import { useEffect, useState } from "react";
import { CheckCircle2, Phone } from "lucide-react";
import {
  requestPhoneVerificationAction,
  verifyPhoneVerificationAction,
} from "@/data/actions/phone-verification";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PhilippineMobileInput } from "@/components/ui/PhilippineMobileInput";
import { formatSavedPhilippineMobileNumber } from "@/lib/phone-number";
import { PHILIPPINE_MOBILE_ERROR, philippineMobileSchema } from "@/lib/validations/philippine-mobile";

export function CheckoutPhoneVerification({
  fieldError,
  initialPhoneNumber,
  initialVerifiedPhoneNumber,
  verificationRequired,
  onVerificationChange,
}: {
  fieldError?: string;
  initialPhoneNumber: string | null;
  initialVerifiedPhoneNumber: string | null;
  verificationRequired: boolean;
  onVerificationChange: (verified: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [phoneEdit, setPhoneNumber] = useState<string>();
  const [locallyVerifiedNumber, setVerifiedPhoneNumber] = useState<string>();
  const phoneNumber = phoneEdit ?? formatSavedPhilippineMobileNumber(initialPhoneNumber);
  const verifiedPhoneNumber = locallyVerifiedNumber ?? formatSavedPhilippineMobileNumber(initialVerifiedPhoneNumber);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengePhoneNumber, setChallengePhoneNumber] = useState<
    string | null
  >(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isVerified = Boolean(
    verificationRequired &&
    phoneNumber &&
    phoneNumber === verifiedPhoneNumber,
  );
  useEffect(() => {
    onVerificationChange(!verificationRequired || isVerified);
  }, [isVerified, onVerificationChange, verificationRequired]);

  const challengeMatchesPhone = Boolean(
    challengeId && challengePhoneNumber === phoneNumber,
  );

  const changePhoneNumber = (nextPhoneNumber: string) => {
    if (nextPhoneNumber !== phoneNumber) {
      setChallengeId(null);
      setChallengePhoneNumber(null);
      setCode("");
      setMessage(null);
      setError(null);
    }
    onVerificationChange(!verificationRequired || nextPhoneNumber === verifiedPhoneNumber);
    setPhoneNumber(nextPhoneNumber);
  };

  const requestCode = async () => {
    if (!philippineMobileSchema.safeParse(phoneNumber).success) {
      setError(PHILIPPINE_MOBILE_ERROR);
      return;
    }
    setPhoneNumber(phoneNumber);
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestPhoneVerificationAction({
        phoneNumber,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setChallengeId(result.data.challengeId);
      setChallengePhoneNumber(phoneNumber);
      setCode("");
      setMessage("A verification code was sent to this number.");
    } catch (requestError) {
      console.error(
        "Could not request a checkout phone verification code.",
        requestError,
      );
      setError("A verification code could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!challengeId || !challengeMatchesPhone) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await verifyPhoneVerificationAction({ challengeId, code });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setVerifiedPhoneNumber(result.data.phoneNumber);
      setPhoneNumber(result.data.phoneNumber);
      onVerificationChange(true);
      setChallengeId(null);
      setChallengePhoneNumber(null);
      setCode("");
      setMessage("Your phone number is verified.");
      void queryClient.invalidateQueries({ queryKey: checkoutOptionsQueryKey });
      void queryClient.invalidateQueries({ queryKey: customerProfileQueryKey });
    } catch (verificationError) {
      console.error(
        "Could not verify the checkout phone number.",
        verificationError,
      );
      setError(
        "Phone verification is temporarily unavailable. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <PhilippineMobileInput
        name="contactNumber"
        label="Contact number"
        value={phoneNumber}
        onValueChange={changePhoneNumber}
        disabled={busy}
        required
        leadingIcon={<Phone className="h-4 w-4" />}
        helperText={
          verificationRequired
            ? "Use a Philippine mobile number. It will be saved to your account after verification."
            : "Staff will manually verify this number before confirming your order."
        }
        error={fieldError || error}
      />
      <div className="min-h-11">
        {verificationRequired && isVerified && (
          <p
            className="flex min-h-11 items-center gap-2 rounded-md bg-accent p-2 text-sm font-medium text-accent-foreground"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            This phone number is verified.
          </p>
        )}
        {verificationRequired && !isVerified && (
          <div className="space-y-3">
            {!challengeMatchesPhone ? (
              <Button
                type="button"
                variant="outline"
                loading={busy}
                className="min-h-11"
                disabled={!phoneNumber.trim()}
                onClick={requestCode}
              >
                Send verification code
              </Button>
            ) : (
              <>
                <Input
                  label="6-digit verification code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  disabled={busy}
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    loading={busy}
                    disabled={code.length !== 6}
                    onClick={verifyCode}
                  >
                    Verify number
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={requestCode}
                  >
                    Send another code
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {message && (
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  );
}
