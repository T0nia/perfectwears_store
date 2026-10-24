
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "perfectwears_verified_order";

const STORE_ADDRESS =
  "SHOP E2 SENIOR BEACON PLAZA OPP. OLD CENTRAL BANK, Lagos, Nigeria";

const MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(STORE_ADDRESS)}&travelmode=driving`;

const BOLT_APP_URL = "bolt://";
const BOLT_DOWNLOAD_URL = "https://bolt.eu/";

const WHATSAPP_URL = "https://wa.me/qr/O74M6IXLXIC4I1";
const INSTAGRAM_URL =
  "https://www.instagram.com/theperfectwearstore?utm_source=qr&stkn=N2Qzc3dweW01MzJ6";
const TIKTOK_URL = "https://tiktok.com/@perfectwearstore";
const SUPPORT_EMAIL = "theperfectwearstore@gmail.com";

type OrderItem = {
  id?: string | number;
  product?:
    | string
    | {
        name?: string;
        title?: string;
        image?: string;
        image_url?: string;
      };
  product_name?: string;
  product_image?: string;
  image?: string;
  unit_price?: string | number;
  quantity: number;
  selected_size?: string | null;
  line_total?: string | number;
};

type Order = {
  id: string;
  total_amount: string | number;
  payment_reference?: string;
  payment_status: string;
  order_status?: string;
  delivery_method?: string | null;
  items?: OrderItem[];
};

function naira(value: string | number | undefined) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function Icon({
  name,
  size = 22,
}: {
  name: string;
  size?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "check":
      return (
        <svg {...props}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "receipt":
      return (
        <svg {...props}>
          <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case "truck":
      return (
        <svg {...props}>
          <path d="M2.5 7h11.5v10H2.5z" />
          <path d="M14 10h4l3.5 3.5V17H14z" />
          <path d="M17 10v3.5h4.5" />
          <circle cx="7" cy="18" r="1.7" />
          <circle cx="17.5" cy="18" r="1.7" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...props}>
          <path d="M5 12h14m-7-7 7 7-7 7" />
        </svg>
      );

    case "whatsapp":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M20.5 3.5A11.7 11.7 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.2 1.6 6L.2 24l6.4-1.7a11.8 11.8 0 0 0 5.5 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.5-8.4ZM12.1 21.7c-1.7 0-3.4-.5-4.8-1.3l-.4-.2-3.8 1 1-3.7-.3-.4a9.8 9.8 0 1 1 8.3 4.6Zm5.4-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.4.3-.5.1-.2 0-.4 0-.6-.1-.2-.7-1.6-.9-2.1-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.5s1.1 2.8 1.3 3c.2.3 2.2 3.3 5.3 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.7-.5Z" />
        </svg>
      );

    case "instagram":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ig-gradient" x1="0" y1="24" x2="24" y2="0">
              <stop offset="0%" stopColor="#FFD600" />
              <stop offset="45%" stopColor="#FF0069" />
              <stop offset="100%" stopColor="#7638FA" />
            </linearGradient>
          </defs>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke="url(#ig-gradient)"
            strokeWidth="2.5"
          />
          <circle
            cx="12"
            cy="12"
            r="4"
            stroke="url(#ig-gradient)"
            strokeWidth="2.5"
          />
          <circle cx="17.5" cy="6.8" r="1.2" fill="#FF0069" />
        </svg>
      );

    case "tiktok":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M19.6 6.1a6.6 6.6 0 0 1-4.1-3.8V2h-3.8v13.6a2.8 2.8 0 1 1-2-2.7V9a6.6 6.6 0 1 0 5.8 6.6V9.2a10.2 10.2 0 0 0 4.1 1V6.4l-.1-.3Z" />
        </svg>
      );

    case "mail":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );

    default:
      return null;
  }
}

function BoltBrand({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size * 1.65}
      height={size}
      viewBox="0 0 66 40"
      role="img"
      aria-label="Bolt ride"
      fill="none"
    >
      <path
        d="M7 24.5 11.5 14a5 5 0 0 1 4.6-3h26.1a6 6 0 0 1 4.5 2.1l7.1 8.2 5.2 1.8a3.8 3.8 0 0 1 2.5 3.6v4.1H5.5v-3.2a3.3 3.3 0 0 1 1.5-3.1Z"
        fill="#101820"
      />
      <path d="m15.3 14.5-3.6 8.2h17.1v-8.2H15.3Z" fill="#D8F7E6" />
      <path
        d="M32.1 14.5v8.2h17.2l-6.4-7.4a2.8 2.8 0 0 0-2.1-.8h-8.7Z"
        fill="#D8F7E6"
      />
      <path
        d="M3 28.8h60"
        stroke="#101820"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="17" cy="30.5" r="5.8" fill="#101820" />
      <circle cx="17" cy="30.5" r="2.5" fill="#FFFFFF" />
      <circle cx="49" cy="30.5" r="5.8" fill="#101820" />
      <circle cx="49" cy="30.5" r="2.5" fill="#FFFFFF" />
      <path
        d="m36.5 1.8-8.2 10.6h5.9l-2 7.2 10.1-12h-6.1l.3-5.8Z"
        fill="#079E55"
      />
    </svg>
  );
}

function GoogleMapsBrand({ size = 42 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Google Maps"
    >
      <path
        fill="#34A853"
        d="M24 4C14.6 4 8 10.9 8 19.4c0 10.6 12.9 23 15.1 25.1a1.3 1.3 0 0 0 1.8 0C27.1 42 40 30 40 19.4 40 10.9 33.4 4 24 4Z"
      />
      <path
        fill="#4285F4"
        d="M24 4C17.1 4 11.5 7.6 9.1 13l10.4 4.3L29 7.1A17 17 0 0 0 24 4Z"
      />
      <path
        fill="#FBBC04"
        d="M9.1 13A15.5 15.5 0 0 0 8 19.4c0 3.7 2 7.9 4.5 11.8l9.1-9.1-2.1-4.8L9.1 13Z"
      />
      <path
        fill="#EA4335"
        d="M29 7.1 19.5 17l5.1 5.1 10.2-10.2A15.5 15.5 0 0 0 29 7.1Z"
      />
      <circle cx="24" cy="19" r="6.2" fill="#fff" />
      <circle cx="24" cy="19" r="3.2" fill="#4285F4" />
    </svg>
  );
}

export default function PaymentSuccessPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);

      if (!stored) {
        setError(true);
        return;
      }

      const parsed = JSON.parse(stored);
      const verified = parsed?.order ?? parsed;

      if (
        !verified?.id ||
        String(verified.payment_status).toUpperCase() !== "PAID"
      ) {
        setError(true);
        return;
      }

      setOrder(verified);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  function openBolt() {
    window.location.href = BOLT_APP_URL;
  }

  function openStoreMaps() {
    window.location.href = MAPS_URL;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          <p className="font-semibold text-slate-700">
            Loading your order…
          </p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-white px-5 py-10 text-slate-800">
        <div className="mx-auto max-w-xl text-center">
          <Link
            href="/"
            aria-label="Perfectwears home"
            className="mb-8 inline-flex"
          >
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm">
              <img
                src="/perfectwears-logo.jpg"
                alt="Perfectwears"
                className="h-full w-full rounded-full object-cover"
              />
            </span>
          </Link>

          <h1 className="text-3xl font-extrabold">
            Let&apos;s find your order
          </h1>

          <p className="mt-3 leading-7 text-slate-500">
            We couldn&apos;t load your verified order details in this browser.
            If your payment went through, please contact us so we can help
            confirm your order.
          </p>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#16a34a] px-6 py-3 font-bold text-white"
          >
            <Icon name="whatsapp" />
            Contact customer care
          </a>

          <div>
            <Link
              href="/"
              className="mt-5 inline-block font-semibold text-slate-600 underline"
            >
              Return to store
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#172033]">
      <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <header className="flex flex-col items-center border-b border-slate-100 py-5">
          <Link href="/" aria-label="Perfectwears home">
            <span className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
              <img
                src="/perfectwears-logo.jpg"
                alt="Perfectwears logo"
                className="h-full w-full rounded-full object-cover"
              />
            </span>
          </Link>
        </header>

        <section className="py-8 text-center sm:py-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Thank you for shopping with us!
          </h1>
        </section>

        <section className="rounded-2xl bg-[#f0faf5] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#d9f7e7] text-[#087f5b]">
              <Icon name="receipt" size={28} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-500">Payment reference</p>
              <p className="mt-1 break-all font-bold">
                {order.payment_reference || "Payment confirmed"}
              </p>
              <p className="mt-2 break-all text-sm text-slate-500">
                Order ID: {order.id}
              </p>
            </div>
          </div>
        </section>

        {/* The product/order summary remains intentionally hidden for launch. */}

        <section className="mt-4 rounded-2xl border border-[#dcefe4] bg-[#f0faf5] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Total paid</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#172033]">
                {naira(order.total_amount)}
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-[#d6f8e5] px-3 py-2 text-xs font-extrabold text-[#07804b]">
              <Icon name="check" size={16} />
              Payment received
            </span>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e9f6ff] text-[#253a56]">
              <Icon name="truck" size={29} />
            </span>

            <div>
              <h2 className="text-xl font-extrabold">
                How would you like to receive your order?
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Choose an option below.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={openBolt}
              className="min-h-[140px] rounded-2xl bg-[#f1fbf6] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-2xl bg-[#2bdc83]">
                  <BoltBrand size={30} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold">
                    Bolt delivery
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    Arrange a Bolt ride from our store to your location.
                  </span>
                  <span className="mt-3 flex items-center gap-1 text-sm font-bold text-[#087f5b]">
                    Open Bolt
                    <Icon name="arrow" size={17} />
                  </span>
                </span>
              </span>

              <a
                href={BOLT_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 underline underline-offset-2"
              >
                Don&apos;t have Bolt? Get the app
                <Icon name="arrow" size={15} />
              </a>
            </button>

            <button
              type="button"
              onClick={openStoreMaps}
              className="min-h-[140px] rounded-2xl bg-[#f6f8ff] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-2xl bg-white">
                  <GoogleMapsBrand size={40} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold">
                    Store pickup
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    Collect your order directly from our store.
                  </span>
                  <span className="mt-3 flex items-center gap-1 text-sm font-bold text-[#263b60]">
                    Get directions on Google Maps
                    <Icon name="arrow" size={17} />
                  </span>
                </span>
              </span>
            </button>
          </div>
        </section>

        <section className="mt-7 rounded-2xl bg-[#f3f6f9] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e1effa] text-[#253a56]">
              <Icon name="whatsapp" size={27} />
            </span>

            <div>
              <h2 className="font-extrabold">Need help with your order?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Message us on WhatsApp if you need help with delivery, pickup
                or your order.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#079e55] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#078347]"
              >
                <Icon name="whatsapp" size={19} />
                WhatsApp Customer Care
                <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
        </section>

        <footer className="mt-8">
          <p className="font-bold">Stay connected with us</p>

          <div className="mt-4 flex gap-5">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2 text-xs text-slate-500 hover:text-slate-900"
              aria-label="Instagram"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-pink-100 bg-white">
                <Icon name="instagram" size={24} />
              </span>
              Instagram
            </a>

            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2 text-xs text-slate-500 hover:text-slate-900"
              aria-label="TikTok"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#101010] text-white">
                <Icon name="tiktok" size={23} />
              </span>
              TikTok
            </a>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex flex-col items-center gap-2 text-xs text-slate-500 hover:text-slate-900"
              aria-label="Email us"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f3ff] text-[#2583e9]">
                <Icon name="mail" size={23} />
              </span>
              Email us
            </a>
          </div>

          <Link
            href="/"
            onClick={() => sessionStorage.removeItem(STORAGE_KEY)}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#151a23] px-5 py-4 font-bold text-white transition hover:bg-[#252c38]"
          >
            Continue Shopping
            <Icon name="arrow" size={19} />
          </Link>

          <p className="mt-3 text-center text-xs leading-5 text-slate-400">
            Your paid order remains recorded by Perfectwears. Continuing
            shopping starts a new shopping session.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <Link
              href="/"
              aria-label="Perfectwears home"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white"
            >
              <img
                src="/perfectwears-logo.jpg"
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            </Link>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Perfectwears. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}