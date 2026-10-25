
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  price: string;
  stock: number;
};

type CartItem = {
  id: number;
  product: Product;
  quantity: number;
  selected_size: string | null;
};

type Cart = {
  id: string;
  items: CartItem[];
};

type OrderResponse = {
  id?: string;
  order_id?: string;
  recovery_token?: string;
  error?: string;
  detail?: string;
};

type PaymentResponse = {
  order_id?: string;
  authorization_url?: string;
  error?: string;
  detail?: string;
};

const API_URL = "https://perfectwears-backend.onrender.com/api";
const CART_STORAGE_KEY = "perfectwears_cart_id";
const PENDING_ORDER_KEY = "perfectwears_pending_order_id";
const CURRENT_RECOVERY_KEY = "perfectwears_current_order_recovery";

function recoveryStorageKey(orderId: string) {
  return `perfectwears_order_recovery_${orderId}`;
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getMessage(
  data: { error?: string; detail?: string },
  fallback: string,
) {
  return data.error || data.detail || fallback;
}

function CheckoutIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="h-7 w-7"
    >
      <path
        d="M10 17.5h28l-2.3 23H12.3L10 17.5Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M17 18v-4.5a7 7 0 0 1 14 0V18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="m19 29 3.5 3.5 7-7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      try {
        const cartId = localStorage.getItem(CART_STORAGE_KEY);

        if (!cartId) {
          router.replace("/cart");
          return;
        }

        const response = await fetch(`${API_URL}/cart/${cartId}/`);

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "We couldn't find your cart. Please return to your cart and try again."
              : "Unable to load your cart. Please try again.",
          );
        }

        const data: Cart = await response.json();

        if (!data.items?.length) {
          router.replace("/cart");
          return;
        }

        if (!cancelled) {
          setCart(data);
        }
      } catch (err) {
        console.error("Checkout cart request failed:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to connect to the store. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCart();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const total =
    cart?.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    ) ?? 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cart || submitting) return;

    try {
      setSubmitting(true);
      setError("");

      const orderResponse = await fetch(`${API_URL}/orders/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_id: cart.id,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim(),
        }),
      });

      const orderData: OrderResponse = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(
          getMessage(orderData, "Unable to create your order."),
        );
      }

      const orderId = orderData.id || orderData.order_id;
      const recoveryToken = orderData.recovery_token;

      if (!orderId || !recoveryToken) {
        throw new Error(
          "The server did not return the order recovery details. Please contact customer care before trying checkout again.",
        );
      }

      // Save recovery details immediately, before contacting Paystack.
      // Keep separate credentials for each order so one order cannot
      // overwrite the recovery details for another.
      const recoveryDetails = JSON.stringify({
        order_id: orderId,
        recovery_token: recoveryToken,
      });

      localStorage.setItem(
        recoveryStorageKey(orderId),
        recoveryDetails,
      );
      localStorage.setItem(CURRENT_RECOVERY_KEY, recoveryDetails);
      localStorage.setItem(PENDING_ORDER_KEY, orderId);

      const paymentResponse = await fetch(
        `${API_URL}/orders/initialize-payment/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            recovery_token: recoveryToken,
            callback_url: `${window.location.origin}/payment/callback`,
          }),
        },
      );

      const paymentData: PaymentResponse = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(
          getMessage(
            paymentData,
            "Unable to initialize payment. Your order recovery details have been saved. Please contact customer care before retrying if you are unsure whether payment started.",
          ),
        );
      }

      if (!paymentData.authorization_url) {
        throw new Error(
          "Paystack did not return a payment link. Your order recovery details have been saved. Please contact customer care before retrying.",
        );
      }

      const paymentOrderId = paymentData.order_id || orderId;

      // Keep the original recovery token attached to the returned order ID.
      if (paymentOrderId !== orderId) {
        localStorage.setItem(
          recoveryStorageKey(paymentOrderId),
          JSON.stringify({
            order_id: paymentOrderId,
            recovery_token: recoveryToken,
          }),
        );
        localStorage.setItem(
          PENDING_ORDER_KEY,
          paymentOrderId,
        );
        localStorage.setItem(
          CURRENT_RECOVERY_KEY,
          JSON.stringify({
            order_id: paymentOrderId,
            recovery_token: recoveryToken,
          }),
        );
      }

      window.location.assign(paymentData.authorization_url);
    } catch (err) {
      console.error("Checkout submission failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please check your order before retrying.",
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f1edff] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="h-8 w-40 rounded-lg bg-[#ddd4ff]" />
          <div className="mt-8 h-72 rounded-3xl bg-[#ddd4ff]" />
        </div>
      </main>
    );
  }

  if (!cart) {
    return (
      <main className="min-h-screen bg-[#f1edff] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-black sm:text-2xl">
            Unable to continue checkout
          </h1>
          <p className="mt-3 break-words text-sm leading-6 text-black/60">
            {error || "Your cart could not be loaded."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="mt-6 min-h-12 rounded-xl bg-[#7c5cff] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#6848e8]"
          >
            Return to cart
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f1edff] text-black">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <a
          href="/cart"
          className="inline-flex min-h-10 items-center gap-2 text-xs font-bold uppercase tracking-wider text-black/55 transition hover:text-[#7c5cff]"
        >
          <span aria-hidden="true">←</span>
          Back to cart
        </a>

        <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="min-w-0 rounded-3xl bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eee8ff] text-[#6948dc] sm:h-14 sm:w-14">
                <CheckoutIcon />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Checkout
                </h1>
                <p className="mt-1 text-sm leading-5 text-black/55">
                  Enter your contact details to continue to secure payment.
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 break-words rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="customerName"
                  className="mb-2 block text-sm font-bold"
                >
                  Full name
                </label>
                <input
                  id="customerName"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={255}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your full name"
                  className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-base outline-none transition focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="customerEmail"
                  className="mb-2 block text-sm font-bold"
                >
                  Email address
                </label>
                <input
                  id="customerEmail"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-base outline-none transition focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="customerPhone"
                  className="mb-2 block text-sm font-bold"
                >
                  Phone number
                </label>
                <input
                  id="customerPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  maxLength={20}
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="08012345678"
                  className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-base outline-none transition focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/15"
                />
              </div>

              <div className="rounded-2xl bg-[#fff7f1] p-4 text-sm leading-6 text-black/70">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg" aria-hidden="true">
                    🔒
                  </span>
                  <p>
                    You will pay securely through Paystack. Delivery and pickup
                    options will be available after your payment is verified.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-14 w-full items-center justify-center rounded-xl bg-[#7c5cff] px-4 py-3 text-sm font-black text-white transition hover:bg-[#6848e8] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
              >
                {submitting
                  ? "Preparing secure payment..."
                  : `Continue to Paystack · ${formatNaira(total)}`}
              </button>
            </form>
          </section>

          <aside className="h-fit min-w-0 rounded-3xl bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-lg font-black">Your order</h2>

            <div className="mt-5 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b border-black/5 pb-4"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold">
                      {item.product.name}
                    </p>
                    <p className="mt-1 text-xs text-black/50">
                      Qty: {item.quantity}
                      {item.selected_size
                        ? ` · Size: ${item.selected_size}`
                        : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-sm font-bold">
                    {formatNaira(
                      Number(item.product.price) * item.quantity,
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <span className="text-sm text-black/55">Subtotal</span>
              <span className="text-lg font-black">
                {formatNaira(total)}
              </span>
            </div>

            <p className="mt-4 text-xs leading-5 text-black/45">
              Delivery or pickup arrangements will be available after
              successful payment verification.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
