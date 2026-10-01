
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type VerificationResponse = {
  message?: string;
  payment_status?: string;
  error?: string;
  order?: {
    id: string;
    payment_status: string;
  };
};

const API_URL = "https://perfectwears-backend.onrender.com/api";
const PENDING_ORDER_KEY = "perfectwears_pending_order_id";

function PaymentVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("Verifying your payment...");
  const [error, setError] = useState(false);

  useEffect(() => {
    async function verifyPayment() {
      const reference = searchParams.get("reference");
      const orderId = localStorage.getItem(PENDING_ORDER_KEY);

      if (!reference || !orderId) {
        setError(true);
        setMessage(
          "We could not find your payment details. Please contact Perfectwears if you were charged.",
        );
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/orders/verify-payment/`,
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
          throw new Error(
            data.error || "Payment verification failed.",
          );
        }

        if (data.payment_status !== "PAID") {
          throw new Error(
            "Your payment has not been confirmed yet.",
          );
        }

        localStorage.removeItem(PENDING_ORDER_KEY);

        router.replace(`/payment/success?order=${orderId}`);
      } catch (err) {
        console.error(err);

        setError(true);
        setMessage(
          err instanceof Error
            ? err.message
            : "We could not verify your payment.",
        );
      }
    }

    verifyPayment();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1edff] px-5 text-black">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        {!error ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#7c5cff] text-2xl text-white">
              🔒
            </div>

            <h1 className="mt-6 text-2xl font-black">
              Verifying payment
            </h1>

            <p className="mt-3 text-sm leading-6 text-black/50">
              Please wait while we securely confirm your
              payment with Paystack.
            </p>

            <div className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-[#7c5cff]/20 border-t-[#7c5cff]" />
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl">
              !
            </div>

            <h1 className="mt-6 text-2xl font-black">
              Payment verification
            </h1>

            <p className="mt-3 text-sm leading-6 text-black/50">
              {message}
            </p>

            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="mt-7 h-12 w-full rounded-xl bg-[#7c5cff] text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#6848e8]"
            >
              Return to Cart
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function CallbackLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1edff] px-5 text-black">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#7c5cff] text-2xl text-white">
          🔒
        </div>

        <h1 className="mt-6 text-2xl font-black">
          Verifying payment
        </h1>

        <p className="mt-3 text-sm leading-6 text-black/50">
          Please wait while we securely confirm your payment.
        </p>

        <div className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-[#7c5cff]/20 border-t-[#7c5cff]" />
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
