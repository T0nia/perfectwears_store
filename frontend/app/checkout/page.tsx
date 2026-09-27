"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: string;
  category: Category;
  image: string;
  sizes: string[];
  stock: number;
  is_active: boolean;
  created_at: string;
};

type CartItem = {
  id: number;
  product: Product;
  quantity: number;
  selected_size: string | null;
  created_at: string;
};

type Cart = {
  id: string;
  created_at: string;
  items: CartItem[];
};

type Order = {
  id: string;
  cart: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: string;
  payment_reference: string | null;
  payment_status: string;
  order_status: string;
  delivery_method: string | null;
  created_at: string;
};

type PaymentResponse = {
  order_id: string;
  payment_reference: string;
  authorization_url: string;
  access_code: string | null;
};

const API_URL = "https://perfectwears-backend.onrender.com/api";
const CART_STORAGE_KEY = "perfectwears_cart_id";

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
    async function loadCart() {
      try {
        const cartId = localStorage.getItem(CART_STORAGE_KEY);

        if (!cartId) {
          router.push("/cart");
          return;
        }

        const response = await fetch(`${API_URL}/cart/${cartId}/`);

        if (!response.ok) {
          localStorage.removeItem(CART_STORAGE_KEY);
          router.push("/cart");
          return;
        }

        const data: Cart = await response.json();

        if (!data.items || data.items.length === 0) {
          router.push("/cart");
          return;
        }

        setCart(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load your cart.");
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, [router]);

  const total =
    cart?.items.reduce(
      (sum, item) =>
        sum + Number(item.product.price) * item.quantity,
      0,
    ) ?? 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cart || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const orderResponse = await fetch(`${API_URL}/orders/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart_id: cart.id,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim(),
        }),
      });

      const orderData: Order & { error?: string } =
        await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(
          orderData.error || "Unable to create your order.",
        );
      }

      const paymentResponse = await fetch(
        `${API_URL}/orders/initialize-payment/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: orderData.id,
          }),
        },
      );

      const paymentData: PaymentResponse & { error?: string } =
        await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(
          paymentData.error ||
            "Unable to initialize your payment.",
        );
      }

      if (!paymentData.authorization_url) {
        throw new Error(
          "Paystack did not return a payment link.",
        );
      }

      window.location.href = paymentData.authorization_url;
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );

      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f1edff] px-5 py-12 text-black">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-8 w-40 rounded bg-[#ddd4ff]" />
          <div className="mt-8 h-64 rounded-3xl bg-[#ddd4ff]" />
        </div>
      </main>
    );
  }

  if (!cart) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#f1edff] text-black">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <a
          href="/cart"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/50 transition hover:text-[#6b4ce6]"
        >
          <span className="text-base">←</span>
          Back to Cart
        </a>

        <div className="mt-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7c5cff]">
            Secure checkout
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
            Checkout
          </h1>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="text-xl font-black">
              Your details
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Enter your details before continuing to secure
              payment.
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="customer-name"
                  className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/50"
                >
                  Full name
                </label>

                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(event.target.value)
                  }
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                  className="mt-2 h-13 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition placeholder:text-black/30 focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-email"
                  className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/50"
                >
                  Email address
                </label>

                <input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(event) =>
                    setCustomerEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="mt-2 h-13 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition placeholder:text-black/30 focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-phone"
                  className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/50"
                >
                  Phone number
                </label>

                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(event) =>
                    setCustomerPhone(event.target.value)
                  }
                  placeholder="080..."
                  required
                  autoComplete="tel"
                  className="mt-2 h-13 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition placeholder:text-black/30 focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/10"
                />
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 flex h-14 w-full items-center justify-center rounded-xl bg-[#7c5cff] px-6 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#6848e8] disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-black/40"
            >
              {submitting
                ? "Connecting to Paystack..."
                : "Continue to Secure Payment"}
            </button>

            <div className="mt-5 rounded-xl bg-[#f1edff] p-4">
              <div className="flex gap-3">
                <span className="text-lg">🔒</span>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em]">
                    Secure payment
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-black/45">
                    You'll be redirected to Paystack to
                    securely complete your payment.
                  </p>
                </div>
              </div>
            </div>
          </form>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
              Your order
            </p>

            <div className="mt-5 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3"
                >
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-[#ddd4ff]">
                    {item.product.image && (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">
                      {item.product.name}
                    </p>

                    <p className="mt-1 text-[10px] text-black/45">
                      {item.selected_size
                        ? `Size ${item.selected_size} · `
                        : ""}
                      Qty {item.quantity}
                    </p>
                  </div>

                  <p className="text-xs font-bold">
                    ₦
                    {(
                      Number(item.product.price) *
                      item.quantity
                    ).toLocaleString("en-NG")}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-black/10 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-black/50">
                  Subtotal
                </span>

                <span className="text-sm font-bold">
                  ₦{total.toLocaleString("en-NG")}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-bold">
                  Total
                </span>

                <span className="text-xl font-black text-[#6b4ce6]">
                  ₦{total.toLocaleString("en-NG")}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}