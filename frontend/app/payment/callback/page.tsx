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

type RecoveryCredentials = {
  order_id: string;
  recovery_token: string;
};

const API_URL = "https://perfectwears-backend.onrender.com/api";

const CART_STORAGE_KEY = "perfectwears_cart_id";
const PENDING_ORDER_KEY = "perfectwears_pending_order_id";
const VERIFIED_ORDER_KEY = "perfectwears_verified_order";
const CURRENT_RECOVERY_KEY = "perfectwears_current_order_recovery";

function recoveryStorageKey(orderId: string) {
  return `perfectwears_order_recovery_${orderId}`;
}

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

      const orderId =
        searchParams.get("order") ||
        searchParams.get("order_id") ||
        localStorage.getItem(PENDING_ORDER_KEY);

      if (!reference || !orderId) {
        setHasError(true);
        setMessage(
          "The payment reference or order ID is missing. Do not pay again. Your existing payment may still be recoverable. Please contact Perfectwears for help.",
        );
        return;
      }

      let credentials: RecoveryCredentials | null = null;

      try {
        const savedCredentials =
          localStorage.getItem(recoveryStorageKey(orderId)) ||
          localStorage.getItem(CURRENT_RECOVERY_KEY);

        if (savedCredentials) {
          const parsed: unknown = JSON.parse(savedCredentials);

          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "order_id" in parsed &&
            "recovery_token" in parsed &&
            typeof parsed.order_id === "string" &&
            typeof parsed.recovery_token === "string" &&
            parsed.order_id === orderId &&
            parsed.recovery_token.length > 0
          ) {
            credentials = {
              order_id: parsed.order_id,
              recovery_token: parsed.recovery_token,
            };
          }
        }
      } catch (error) {
        console.error("Could not read saved order recovery credentials:", error);
      }

      if (!credentials) {
        setHasError(true);
        setMessage(
          "We could not find the secure recovery details for this order in this browser. Do not pay again. Please contact Perfectwears so the existing payment can be checked.",
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
              recovery_token: credentials.recovery_token,
            }),
          },
        );

        const data: VerificationResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.detail ||
              "We could not verify the existing payment. Do not pay again; please contact Perfectwears for help.",
          );
        }

        if (
          data.payment_status?.toUpperCase() !== "PAID" ||
          data.order?.payment_status?.toUpperCase() !== "PAID"
        ) {
          throw new Error(
            "Paystack has not yet been confirmed as paid by the backend. Do not pay again. Your existing order can be checked and recovered.",
          );
        }

        if (cancelled || !data.order) {
          return;
        }

        sessionStorage.setItem(
          VERIFIED_ORDER_KEY,
          JSON.stringify(data.order),
        );

        // Keep the order's recovery credentials so the customer can
        // return to the existing order if the next step is interrupted.
        localStorage.setItem(
          recoveryStorageKey(orderId),
          JSON.stringify(credentials),
        );
        localStorage.setItem(
          CURRENT_RECOVERY_KEY,
          JSON.stringify(credentials),
        );

        // Clear the cart only after the backend confirms payment.
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(PENDING_ORDER_KEY);

        window.dispatchEvent(new Event("cart-updated"));

        router.replace(
          `/payment/success?order=${encodeURIComponent(data.order.id)}`,
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
            : "We could not verify this payment. Do not pay again; contact Perfectwears to check the existing order.",
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
            ? "Payment verification needs attention"
            : "Verifying your payment"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-black/60">
          {hasError
            ? message
            : "Please wait while we securely confirm your existing payment with Paystack."}
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