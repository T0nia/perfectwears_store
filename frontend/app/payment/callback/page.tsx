"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type VerificationResponse = {
  message?: string;
  payment_status?: string;
  error?: string;
};

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    return "http://127.0.0.1:8000/api";
  }

  return "https://perfectwears-backend.onrender.com/api";
}

const PENDING_ORDER_KEY = "perfectwears_pending_order_id";

function PaymentVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("Verifying your payment...");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      const reference =
        searchParams.get("reference") ||
        searchParams.get("trxref");

      const orderId = localStorage.getItem(PENDING_ORDER_KEY);

      if (!reference || !orderId) {
        setHasError(true);
        setMessage(
          "We could not find your payment details. If you were charged, please contact Perfectwears and provide your payment reference.",
        );
        return;
      }

      try {
        const response = await fetch(
          `${getApiUrl()}/orders/verify-payment/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              order_id: orderId,
              reference,
            }),
          },
        );

        const data: VerificationResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Payment verification failed.");
        }

        if (data.payment_status !== "PAID") {
          throw new Error(
            "Your payment has not been confirmed. Please do not pay again. If you were charged, contact Perfectwears.",
          );
        }

        if (cancelled) {
          return;
        }

        localStorage.removeItem(PENDING_ORDER_KEY);
        router.replace(`/payment/success?order=${encodeURIComponent(orderId)}`);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(err);
        setHasError(true);
        setMessage(
          err instanceof Error
            ? err.message
            : "We could not verify your payment. Please contact Perfectwears if you were charged.",
        );
      }
    }

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1edff] px-5 text-black">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white ${
            hasError ? "bg-red-500" : "bg-[#7c5cff]"
          }`}
        >
          {hasError ? "!" : "🔒"}
        </div>

        <h1 className="mt-6 text-2xl font-black">
          {hasError ? "Payment not confirmed" : "Verifying your payment"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-black/55">
          {hasError
            ? message
            : "Please wait while we securely confirm your payment with Paystack."}
        </p>

        {!hasError && (
          <div className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-[#7c5cff]/20 border-t-[#7c5cff]" />
        )}

        {hasError && (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-7 h-12 w-full rounded-xl bg-[#7c5cff] text-xs font-black uppercase tracking-wider text-white hover:bg-[#6848e8]"
          >
            Return to store
          </button>
        )}
      </div>
    </main>
  );
}

function CallbackLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1edff] px-5 text-black">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black">Verifying your payment</h1>
        <p className="mt-3 text-sm text-black/55">
          Please wait while we securely confirm your payment.
        </p>
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <PaymentVerification />
    </Suspense>
  );
}