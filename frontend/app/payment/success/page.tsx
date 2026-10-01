
"use client";

export default function PaymentSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1edff] px-5 text-black">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#7c5cff] text-3xl text-white">
          ✓
        </div>

        <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7c5cff]">
          Payment confirmed
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-[-0.03em]">
          Thank you for your order!
        </h1>

        <p className="mt-4 text-sm leading-6 text-black/50">
          Your payment has been successfully verified by Paystack.
          Your order has been received by Perfectwears.
        </p>

        <div className="mt-6 rounded-2xl bg-[#fff7f1] px-4 py-4 text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
            Payment confirmed
          </p>

          <p className="mt-2 text-xs leading-5 text-black/50">
            Your payment is confirmed. We'll now arrange the next
            step for getting your order to you.
          </p>
        </div>

        <a
          href="/"
          className="mt-7 flex h-13 w-full items-center justify-center rounded-xl bg-[#7c5cff] px-6 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#6848e8]"
        >
          Continue Shopping
        </a>
      </div>
    </main>
  );
}
