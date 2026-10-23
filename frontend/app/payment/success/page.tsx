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
  delivery_method: "BOLT" | "STORE_PICKUP" | null;
  created_at: string;
  items: OrderItem[];
};

type DeliveryResponse = {
  message?: string;
  error?: string;
  detail?: string;
  order?: VerifiedOrder;
};

const VERIFIED_ORDER_KEY = "perfectwears_verified_order";
const API_URL = "https://perfectwears-backend.onrender.com/api";

const PICKUP_ADDRESS =
  "SHOP E2 SENIOR BEACON PLAZA OPP. OLD CENTRAL BANK, Lagos";

const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=SHOP%20E2%20SENIOR%20BEACON%20PLAZA%20OPP.%20OLD%20CENTRAL%20BANK%2C%20Lagos%2C%20Nigeria";

const WHATSAPP_URL = "https://wa.me/qr/O74M6IXLXIC4I1";

const INSTAGRAM_URL =
  "https://www.instagram.com/theperfectwearstore?utm_source=qr&stkn=N2Qzc3dweW01MzJ6";

const TIKTOK_URL = "https://tiktok.com/@perfectwearstore";

const SUPPORT_EMAIL = "theperfectwearstore@gmail.com";

// Best-effort app deep link. Availability depends on the customer's device
// and whether the Bolt app supports this link on that device.
const BOLT_APP_URL = "bolt://";

function formatNaira(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getMessage(data: DeliveryResponse, fallback: string) {
  return data.error || data.detail || fallback;
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [order, setOrder] = useState<VerifiedOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");

  const orderId = searchParams.get("order");

  useEffect(() => {
    try {
      const storedOrder = sessionStorage.getItem(VERIFIED_ORDER_KEY);

      if (storedOrder) {
        const parsed = JSON.parse(storedOrder) as VerifiedOrder;

        if (
          parsed.payment_status === "PAID" &&
          (!orderId || parsed.id === orderId)
        ) {
          setOrder(parsed);
        }
      }
    } catch (error) {
      console.error("Could not load the order receipt:", error);
    } finally {
      setLoaded(true);
    }
  }, [orderId]);

  async function chooseDeliveryMethod(
    deliveryMethod: "BOLT" | "STORE_PICKUP",
  ) {
    if (!order || savingDelivery) return;

    if (!order.payment_reference) {
      setDeliveryError(
        "We couldn't verify the payment reference for this order. Please contact us on WhatsApp for help.",
      );
      return;
    }

    try {
      setSavingDelivery(true);
      setDeliveryError("");

      const response = await fetch(
        `${API_URL}/orders/set-delivery-method/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: order.id,
            reference: order.payment_reference,
            delivery_method: deliveryMethod,
          }),
        },
      );

      const data: DeliveryResponse = await response.json();

      if (!response.ok || !data.order) {
        throw new Error(
          getMessage(
            data,
            "We couldn't save your delivery preference. Please try again.",
          ),
        );
      }

      if (data.order.payment_status !== "PAID") {
        throw new Error(
          "We couldn't confirm the paid order. Please contact us before proceeding.",
        );
      }

      setOrder(data.order);

      sessionStorage.setItem(
        VERIFIED_ORDER_KEY,
        JSON.stringify(data.order),
      );
    } catch (error) {
      console.error("Saving delivery preference failed:", error);

      setDeliveryError(
        error instanceof Error
          ? error.message
          : "Unable to save your preference. Please try again.",
      );
    } finally {
      setSavingDelivery(false);
    }
  }

  function continueShopping() {
    sessionStorage.removeItem(VERIFIED_ORDER_KEY);
    router.push("/");
  }

  const deliveryMethod = order?.delivery_method;

  return (
    <main className="min-h-screen bg-[#f1edff] px-4 py-8 text-black sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#7c5cff] to-[#a28cff] px-6 py-9 text-center text-white sm:px-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl font-black text-[#7c5cff]">
              ✓
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
              Payment confirmation
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Thank you for shopping with us!
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/90">
              Your payment confirmation and receipt are shown below
              when your verified order is available.
            </p>
          </div>

          <div className="space-y-6 p-5 sm:p-8">
            {!loaded ? (
              <p className="text-center text-sm text-black/60">
                Loading your order receipt...
              </p>
            ) : order ? (
              <>
                <section className="rounded-2xl border border-black/10 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-black/50">
                        Payment reference
                      </p>

                      <p className="mt-1 break-all text-sm font-bold">
                        {order.payment_reference || order.id}
                      </p>

                      <p className="mt-2 break-all text-xs text-black/45">
                        Order ID: {order.id}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                      PAYMENT VERIFIED
                    </span>
                  </div>

                  <div className="mt-5 border-t border-black/10 pt-5">
                    <h2 className="text-lg font-black">Your receipt</h2>

                    {order.items?.length ? (
                      <div className="mt-3 divide-y divide-black/10">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-4 py-4 first:pt-2 last:pb-2"
                          >
                            <div className="min-w-0">
                              <p className="break-words font-bold">
                                {item.product_name}
                              </p>

                              <p className="mt-1 text-sm text-black/55">
                                Quantity: {item.quantity}
                                {item.selected_size
                                  ? ` · Size: ${item.selected_size}`
                                  : ""}
                              </p>

                              <p className="mt-1 text-sm text-black/55">
                                {formatNaira(item.unit_price)} each
                              </p>
                            </div>

                            <p className="shrink-0 text-right text-sm font-bold">
                              {formatNaira(item.line_total)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl bg-[#fff7f1] p-4">
                        <p className="text-sm font-bold">
                          Your payment is confirmed.
                        </p>

                        <p className="mt-2 text-sm leading-6 text-black/65">
                          The original item details for this older order
                          were not saved separately when the order was
                          first created. To avoid showing incorrect
                          quantities or prices, we can't reconstruct
                          its itemised receipt from the current cart.
                          Please contact Perfectwears if you need help
                          with the original purchase details.
                        </p>

                        <a
                          href={WHATSAPP_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex font-bold text-[#6848e8] underline underline-offset-4"
                        >
                          Contact us on WhatsApp
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/10 pt-4">
                    <span className="font-bold">Total paid</span>

                    <span className="text-xl font-black text-[#7c5cff]">
                      {formatNaira(order.total_amount)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-black/55">
                    <span className="rounded-full bg-green-50 px-3 py-1.5 font-bold text-green-700">
                      Paystack verified
                    </span>

                    <span className="rounded-full bg-[#f1edff] px-3 py-1.5 font-bold text-[#6848e8]">
                      Order received
                    </span>
                  </div>
                </section>

                <section className="rounded-2xl bg-[#fff7f1] p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      📦
                    </span>

                    <div>
                      <h2 className="text-xl font-black">
                        How would you like to receive your order?
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-black/65">
                        Choose an option below. Your selection will be
                        saved to your order after payment.
                      </p>
                    </div>
                  </div>

                  {deliveryMethod === null ? (
                    <>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={savingDelivery}
                          onClick={() => chooseDeliveryMethod("BOLT")}
                          className="flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 border-[#7c5cff]/20 bg-white p-4 text-center transition hover:border-[#7c5cff] hover:bg-[#f8f5ff] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="text-2xl" aria-hidden="true">
                            🚗
                          </span>

                          <span className="mt-2 font-black">
                            Bolt delivery
                          </span>

                          <span className="mt-1 text-xs text-black/55">
                            Coordinate your ride with us
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={savingDelivery}
                          onClick={() => chooseDeliveryMethod("STORE_PICKUP")}
                          className="flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 border-[#7c5cff]/20 bg-white p-4 text-center transition hover:border-[#7c5cff] hover:bg-[#f8f5ff] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="text-2xl" aria-hidden="true">
                            📍
                          </span>

                          <span className="mt-2 font-black">
                            Store Pickup
                          </span>

                          <span className="mt-1 text-xs text-black/55">
                            Collect from our store
                          </span>
                        </button>
                      </div>

                      {savingDelivery && (
                        <p
                          role="status"
                          className="mt-4 text-center text-sm font-semibold text-[#6848e8]"
                        >
                          Saving your choice...
                        </p>
                      )}
                    </>
                  ) : deliveryMethod === "STORE_PICKUP" ? (
                    <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">
                          📍
                        </span>

                        <div>
                          <h3 className="font-black">
                            Store Pickup selected
                          </h3>

                          <p className="mt-1 text-sm text-black/55">
                            Please contact us to confirm when your
                            order will be ready before setting out.
                          </p>
                        </div>
                      </div>

                      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-black/50">
                        Pickup address
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6">
                        {PICKUP_ADDRESS}
                      </p>

                      <a
                        href={MAPS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-[#7c5cff] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#6848e8]"
                      >
                        📍 Open Google Maps
                      </a>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">
                          🚗
                        </span>

                        <div>
                          <h3 className="font-black">
                            Bolt delivery selected
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-black/60">
                            Open Bolt on your phone if supported, then
                            contact Perfectwears to coordinate delivery.
                            Selecting this option does not automatically
                            book a driver.
                          </p>
                        </div>
                      </div>

                      <a
                        href={BOLT_APP_URL}
                        className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-[#7c5cff] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#6848e8]"
                      >
                        🚗 Try opening the Bolt app
                      </a>
                    </div>
                  )}

                  {deliveryError && (
                    <div
                      role="alert"
                      className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700"
                    >
                      {deliveryError}
                    </div>
                  )}

                  <div className="mt-5 border-t border-black/10 pt-5">
                    <h3 className="font-black">Need help with your order?</h3>

                    <p className="mt-1 text-sm leading-6 text-black/65">
                      Message us on WhatsApp if you need help with
                      delivery, pickup, or your receipt.
                    </p>

                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Contact Perfectwears on WhatsApp"
                      className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-black text-white transition hover:brightness-95"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                        className="h-5 w-5"
                      >
                        <path d="M20.52 3.48A11.78 11.78 0 0 0 12.12 0C5.55 0 .2 5.35.2 11.92c0 2.1.55 4.15 1.6 5.96L.1 24l6.27-1.65a11.9 11.9 0 0 0 5.74 1.46h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.52-8.41ZM12.12 21.8a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.85 9.85 0 0 1-1.51-5.27c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.9 6.99c0 5.46-4.44 9.88-9.91 9.88Zm5.43-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.8-1.49-1.78-1.66-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
                      </svg>

                      WhatsApp Customer Care
                    </a>
                  </div>
                </section>
              </>
            ) : (
              <section className="rounded-2xl bg-[#fff7f1] p-5">
                <h2 className="text-lg font-black">
                  We couldn't load this receipt
                </h2>

                <p className="mt-2 text-sm leading-6 text-black/65">
                  This page needs the verified order details from the
                  payment confirmation session. If you have completed
                  payment but cannot see your receipt, contact
                  Perfectwears before attempting another payment.
                </p>

                {orderId && (
                  <p className="mt-3 break-all text-xs text-black/60">
                    Order ID: {orderId}
                  </p>
                )}

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex font-bold text-[#6848e8] underline underline-offset-4"
                >
                  Contact us on WhatsApp
                </a>
              </section>
            )}

            <section className="text-center">
              <p className="text-sm font-bold">Stay connected with us</p>

              <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6848e8] hover:underline"
                >
                  Instagram
                </a>

                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6848e8] hover:underline"
                >
                  TikTok
                </a>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-[#6848e8] hover:underline"
                >
                  Email us
                </a>
              </div>
            </section>

            <button
              type="button"
              onClick={continueShopping}
              className="flex min-h-14 w-full items-center justify-center rounded-xl bg-[#7c5cff] px-6 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:bg-[#6848e8]"
            >
              Continue Shopping
            </button>

            <p className="text-center text-xs leading-5 text-black/45">
              Your paid order remains recorded by Perfectwears.
              Continuing shopping starts a new cart.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function SuccessLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1edff] px-5 text-black">
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="font-bold">Loading your order confirmation...</p>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}