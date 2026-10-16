"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type OrderItem = {
  id: number | string;
  product: string | null;
  product_name: string;
  unit_price: string | number;
  quantity: number;
  selected_size: string | null;
  line_total: string | number;
};

type VerifiedOrder = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: string | number;
  payment_reference: string | null;
  payment_status: string;
  order_status: string;
  delivery_method: string | null;
  created_at: string;
  items: OrderItem[];
};

type VerificationResponse = {
  message?: string;
  payment_status?: string;
  error?: string;
  detail?: string;
  order?: VerifiedOrder;
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

const CART_STORAGE_KEY = "perfectwears_cart_id";
const PENDING_ORDER_KEY = "perfectwears_pending_order_id";
const VERIFIED_ORDER_KEY = "perfectwears_verified_order";

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
          "We could not find your payment details. If you were charged, please contact Perfectwears and provide your Paystack payment reference.",
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
          throw new Error(
            data.error ||
              data.detail ||
              "Payment verification failed.",
          );
        }

        if (
          data.payment_status !== "PAID" ||
          data.order?.payment_status !== "PAID"
        ) {
          throw new Error(
            "Your payment has not been confirmed. Please do not pay again. If you were charged, contact Perfectwears.",
          );
        }

        if (cancelled || !data.order) {
          return;
        }

        // Store the backend-verified order before clearing the active cart.
        sessionStorage.setItem(
          VERIFIED_ORDER_KEY,
          JSON.stringify(data.order),
        );

        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(PENDING_ORDER_KEY);

        window.dispatchEvent(new Event("cart-updated"));

        router.replace(
          `/payment/success?order=${encodeURIComponent(orderId)}`,
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error("Payment verification error:", err);
        setHasError(true);
        setMessage(
          err instanceof Error
            ? err.message
            : "We could not verify your payment. If you were charged, please contact Perfectwears.",
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
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black text-white ${
            hasError ? "bg-red-500" : "bg-[#7c5cff]"
          }`}
        >
          {hasError ? "!" : "✓"}
        </div>

        <h1 className="mt-6 text-2xl font-black">
          {hasError
            ? "Payment not confirmed"
            : "Verifying your payment"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-black/60">
          {hasError
            ? message
            : "Please wait while we securely confirm your payment with Paystack. Do not close this page."}
        </p>

        {!hasError && (
          <div className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-[#7c5cff]/20 border-t-[#7c5cff]" />
        )}

        {hasError && (
          <a
            href="/"
            className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#7c5cff] text-xs font-black uppercase tracking-wider text-white hover:bg-[#6848e8]"
          >
            Return to store
          </a>
        )}
      </div>
    </main>
  );
}

function CallbackLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1edff] px-5 text-black">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black">
          Verifying your payment
        </h1>
        <p className="mt-3 text-sm text-black/60">
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