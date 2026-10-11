
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type OrderItem = {
  id: string;
  quantity: number;
  selected_size: string | null;
  product: {
    id: string;
    name: string;
    price: string | number;
  };
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

const VERIFIED_ORDER_KEY = "perfectwears_verified_order";

const PICKUP_ADDRESS =
  "SHOP E2 SENIOR BEACON PLAZA OPP. OLD CENTRAL BANK, Lagos, Nigeria";

const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=SHOP%20E2%20SENIOR%20BEACON%20PLAZA%20OPP.%20OLD%20CENTRAL%20BANK%2C%20Lagos%2C%20Nigeria";

const WHATSAPP_URL = "https://wa.me/qr/O74M6IXLXIC4I1";
const INSTAGRAM_URL =
  "https://www.instagram.com/theperfectwearstore?utm_source=qr&stkn=N2Qzc3dweW01MzJ6";
const TIKTOK_URL = "https://tiktok.com/@perfectwearstore";
const SUPPORT_EMAIL = "theperfectwearstore@gmail.com";

function formatNaira(value: string | number) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [order, setOrder] = useState<VerifiedOrder | null>(null);
  const [loaded, setLoaded] = useState(false);

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
              Payment confirmed
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Thank you for shopping with us!
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/90">
              Your payment has been verified by Paystack, and your
              order has been received by Perfectwears.
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
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-black/50">
                        Order reference
                      </p>
                      <p className="mt-1 break-all text-sm font-bold">
                        {order.payment_reference || order.id}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                      PAID
                    </span>
                  </div>

                  <div className="mt-5 divide-y divide-black/10">
                    {order.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="font-bold">{item.product.name}</p>

                          <p className="mt-1 text-sm text-black/55">
                            Quantity: {item.quantity}
                            {item.selected_size
                              ? ` · Size: ${item.selected_size}`
                              : ""}
                          </p>

                          <p className="mt-1 text-sm text-black/55">
                            {formatNaira(item.product.price)} each
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-bold">
                          {formatNaira(
                            Number(item.product.price) * item.quantity,
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
                    <span className="font-bold">Total paid</span>
                    <span className="text-xl font-black text-[#7c5cff]">
                      {formatNaira(order.total_amount)}
                    </span>
                  </div>
                </section>

                <section className="rounded-2xl bg-[#fff7f1] p-5">
                  <h2 className="text-lg font-black">
                    What happens next?
                  </h2>

                  {deliveryMethod === "STORE_PICKUP" ? (
                    <>
                      <p className="mt-2 text-sm leading-6 text-black/65">
                        You selected store pickup. Please contact us
                        before setting out to confirm when your order
                        will be ready.
                      </p>

                      <p className="mt-4 text-sm font-bold">
                        Pickup address
                      </p>

                      <p className="mt-1 text-sm leading-6 text-black/65">
                        {PICKUP_ADDRESS}
                      </p>

                      <a
                        href={MAPS_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex font-bold text-[#6848e8] underline underline-offset-4"
                      >
                        Find the address on Google Maps
                      </a>
                    </>
                  ) : deliveryMethod === "BOLT" ? (
                    <p className="mt-2 text-sm leading-6 text-black/65">
                      Please contact Perfectwears on WhatsApp to
                      coordinate your Bolt delivery. The payment
                      confirms your order; it does not automatically
                      book a Bolt ride.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-black/65">
                      Our team can help you coordinate delivery or
                      store pickup. Contact us on WhatsApp to confirm
                      your preferred arrangement and the next steps.
                    </p>
                  )}

                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-[#25D366] px-5 py-3 text-sm font-black text-white hover:brightness-95"
                  >
                    Contact us on WhatsApp
                  </a>
                </section>
              </>
            ) : (
              <section className="rounded-2xl bg-[#fff7f1] p-5">
                <h2 className="text-lg font-black">
                  Your order was paid successfully
                </h2>

                <p className="mt-2 text-sm leading-6 text-black/65">
                  Your receipt details could not be loaded in this
                  browser session. If you need help with your order,
                  contact Perfectwears and provide your payment
                  reference if available.
                </p>

                {orderId && (
                  <p className="mt-3 break-all text-xs text-black/60">
                    Order ID: {orderId}
                  </p>
                )}

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
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
                  rel="noreferrer"
                  className="text-[#6848e8] hover:underline"
                >
                  Instagram
                </a>

                <a
                  href={TIKTOK_URL}
                  target="_blank"
                  rel="noreferrer"
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
