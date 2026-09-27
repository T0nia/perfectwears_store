"use client";

import { useEffect, useState } from "react";
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

const API_URL = "https://perfectwears-backend.onrender.com/api";
const CART_STORAGE_KEY = "perfectwears_cart_id";

export default function CartPage() {
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCart() {
      try {
        setLoading(true);
        setError("");

        const cartId = localStorage.getItem(CART_STORAGE_KEY);

        if (!cartId) {
          setCart(null);
          return;
        }

        const response = await fetch(`${API_URL}/cart/${cartId}/`);

        if (!response.ok) {
          localStorage.removeItem(CART_STORAGE_KEY);
          setCart(null);
          return;
        }

        const data: Cart = await response.json();
        setCart(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load your cart.");
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, []);

  async function updateQuantity(
    itemId: number,
    quantity: number,
  ) {
    if (quantity < 1 || updatingItem !== null) {
      return;
    }

    try {
      setUpdatingItem(itemId);

      const response = await fetch(`${API_URL}/cart/update-item/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart_item_id: itemId,
          quantity,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to update cart");
      }

      const data: Cart = await response.json();

      setCart(data);
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      console.error(err);
      setError("Unable to update your cart.");
    } finally {
      setUpdatingItem(null);
    }
  }

  async function removeItem(itemId: number) {
    if (updatingItem !== null) {
      return;
    }

    try {
      setUpdatingItem(itemId);

      const response = await fetch(`${API_URL}/cart/remove-item/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart_item_id: itemId,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to remove item");
      }

      const cartId = localStorage.getItem(CART_STORAGE_KEY);

      if (cartId) {
        const cartResponse = await fetch(
          `${API_URL}/cart/${cartId}/`,
        );

        if (cartResponse.ok) {
          const data: Cart = await cartResponse.json();
          setCart(data);
        }
      }

      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      console.error(err);
      setError("Unable to remove this item.");
    } finally {
      setUpdatingItem(null);
    }
  }

  const total =
    cart?.items.reduce(
      (sum, item) =>
        sum + Number(item.product.price) * item.quantity,
      0,
    ) ?? 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f1edff] px-5 py-12 text-black">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 w-32 rounded bg-[#ddd4ff]" />
            <div className="mt-8 h-32 rounded-2xl bg-[#ddd4ff]" />
            <div className="mt-4 h-32 rounded-2xl bg-[#ddd4ff]" />
          </div>
        </div>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-[#f1edff] px-5 py-12 text-black">
        <div className="mx-auto max-w-3xl">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/50 transition hover:text-[#6b4ce6]"
          >
            <span className="text-base">←</span>
            Continue Shopping
          </a>

          <div className="mt-8 rounded-3xl bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#ddd4ff] text-3xl">
              🛍️
            </div>

            <h1 className="mt-7 text-3xl font-black tracking-tight">
              Your cart is empty
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black/50">
              Looks like you haven't added anything to your cart yet.
            </p>

            <a
              href="/"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-[#7c5cff] px-7 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#6848e8]"
            >
              Shop Now
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f1edff] text-black">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/50 transition hover:text-[#6b4ce6]"
        >
          <span className="text-base">←</span>
          Continue Shopping
        </a>

        <div className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7c5cff]">
                Your selection
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
                Shopping Cart
              </h1>
            </div>

            <p className="text-xs font-medium text-black/45">
              {cart.items.length}{" "}
              {cart.items.length === 1 ? "item" : "items"}
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {cart.items.map((item) => {
                const itemTotal =
                  Number(item.product.price) * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm"
                  >
                    <div className="flex gap-4 p-4 sm:gap-6 sm:p-5">
                      <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-[#ddd4ff] sm:h-36 sm:w-32">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-black/30">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/35">
                              {item.product.category?.name}
                            </p>

                            <h2 className="mt-1 text-base font-black sm:text-lg">
                              {item.product.name}
                            </h2>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={updatingItem !== null}
                            className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/35 transition hover:text-red-500 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-black/50">
                          {item.selected_size && (
                            <span>
                              Size:{" "}
                              <strong className="text-black">
                                {item.selected_size}
                              </strong>
                            </span>
                          )}

                          <span>
                            ₦
                            {Number(
                              item.product.price,
                            ).toLocaleString("en-NG")}
                          </span>
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                          <div className="flex items-center overflow-hidden rounded-lg border border-black/10">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  item.quantity - 1,
                                )
                              }
                              disabled={
                                item.quantity <= 1 ||
                                updatingItem !== null
                              }
                              className="flex h-9 w-9 items-center justify-center text-lg font-medium transition hover:bg-[#f1edff] disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              −
                            </button>

                            <span className="flex h-9 min-w-10 items-center justify-center border-x border-black/10 text-xs font-bold">
                              {updatingItem === item.id
                                ? "..."
                                : item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  item.quantity + 1,
                                )
                              }
                              disabled={updatingItem !== null}
                              className="flex h-9 w-9 items-center justify-center text-lg font-medium transition hover:bg-[#f1edff] disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>

                          <p className="text-base font-black text-[#6b4ce6]">
                            ₦{itemTotal.toLocaleString("en-NG")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                Order Summary
              </p>

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-black/55">Subtotal</span>

                <span className="font-bold">
                  ₦{total.toLocaleString("en-NG")}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
                <span className="text-sm font-bold">Total</span>

                <span className="text-xl font-black text-[#6b4ce6]">
                  ₦{total.toLocaleString("en-NG")}
                </span>
              </div>

              <button
                type="button"
                onClick={() => router.push("/checkout")}
                className="mt-6 flex h-14 w-full items-center justify-center rounded-xl bg-[#7c5cff] px-6 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#6848e8]"
              >
                Proceed to Checkout
              </button>

              <div className="mt-5 rounded-xl bg-[#f1edff] p-4">
                <p className="text-lg">🔒</p>

                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em]">
                  Secure Payment
                </p>

                <p className="mt-1 text-[10px] leading-4 text-black/45">
                  Your payment will be securely processed by Paystack.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}