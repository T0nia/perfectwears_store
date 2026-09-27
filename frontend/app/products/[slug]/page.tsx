"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

type CartResponse = {
  id: string;
  created_at: string;
  items: unknown[];
};

const API_URL = "https://perfectwears-backend.onrender.com/api";
const CART_STORAGE_KEY = "perfectwears_cart_id";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/products/${slug}`);

        if (!response.ok) {
          throw new Error("Product not found");
        }

        const data: Product = await response.json();

        setProduct(data);

        if (data.sizes && data.sizes.length > 0) {
          setSelectedSize(data.sizes[0]);
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load this product.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadProduct();
    }
  }, [slug]);

  async function createCart() {
    const response = await fetch(`${API_URL}/cart/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Unable to create cart");
    }

    const data: CartResponse = await response.json();

    localStorage.setItem(CART_STORAGE_KEY, data.id);

    return data.id;
  }

  async function addToCart() {
    if (!product || addingToCart) {
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setCartMessage("Please select a size.");
      return;
    }

    try {
      setAddingToCart(true);
      setCartMessage("");

      let cartId = localStorage.getItem(CART_STORAGE_KEY);

      if (!cartId) {
        cartId = await createCart();
      }

      const response = await fetch(`${API_URL}/cart/add-item/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart_id: cartId,
          product_id: product.id,
          quantity: 1,
          selected_size: selectedSize || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to add product to cart");
      }

      window.dispatchEvent(new Event("cart-updated"));

      router.push("/cart");
    } catch (err) {
      console.error(err);
      setCartMessage(
        "We could not add this item to your cart. Please try again.",
      );
    } finally {
      setAddingToCart(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f1edff] px-5 py-12 text-black">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="h-4 w-28 rounded bg-[#ddd4ff]" />
            <div className="mt-6 h-8 w-56 rounded bg-[#ddd4ff]" />
            <div className="mt-8 aspect-square rounded-3xl bg-[#ddd4ff]" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#f1edff] px-5 py-12 text-black">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ddd4ff] text-2xl">
            ✦
          </div>

          <h1 className="mt-6 text-2xl font-black">
            Product not found
          </h1>

          <p className="mt-3 text-sm text-black/50">
            We could not load this product.
          </p>

          <a
            href="/"
            className="mt-7 inline-flex rounded-lg bg-[#7c5cff] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#6848e8]"
          >
            Back to Shop
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f1edff] text-black">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <a
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/50 transition hover:text-[#6b4ce6]"
        >
          <span className="text-base">←</span>
          Back to shop
        </a>

        <div className="grid overflow-hidden rounded-3xl bg-white shadow-sm lg:grid-cols-2">
          <div className="relative overflow-hidden bg-[#ddd4ff]">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full min-h-[430px] w-full object-cover sm:min-h-[560px] lg:min-h-[680px]"
              />
            ) : (
              <div className="flex min-h-[430px] items-center justify-center text-sm text-black/35 sm:min-h-[560px] lg:min-h-[680px]">
                No image available
              </div>
            )}

            {product.stock > 0 && product.stock <= 5 && (
              <span className="absolute left-5 top-5 rounded-full bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[0.13em] shadow-sm">
                Low stock
              </span>
            )}

            {product.stock <= 0 && (
              <span className="absolute left-5 top-5 rounded-full bg-black px-3 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-white">
                Sold out
              </span>
            )}
          </div>

          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#7c5cff]" />

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                {product.category?.name}
              </p>
            </div>

            <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              {product.name}
            </h1>

            <p className="mt-5 text-2xl font-black text-[#6b4ce6] sm:text-3xl">
              ₦{Number(product.price).toLocaleString("en-NG")}
            </p>

            <div className="mt-7 h-px bg-black/10" />

            {product.sizes && product.sizes.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">
                    Select size
                  </h2>

                  <span className="text-[10px] font-medium text-black/35">
                    {selectedSize
                      ? `Selected: ${selectedSize}`
                      : "Choose a size"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setSelectedSize(size);
                          setCartMessage("");
                        }}
                        className={
                          isSelected
                            ? "min-w-14 rounded-lg border border-[#7c5cff] bg-[#7c5cff] px-5 py-3 text-sm font-semibold text-white shadow-sm"
                            : "min-w-14 rounded-lg border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:border-[#7c5cff] hover:text-[#6b4ce6]"
                        }
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center gap-2">
              <span
                className={
                  product.stock > 0
                    ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
                    : "h-2.5 w-2.5 rounded-full bg-red-500"
                }
              />

              <p className="text-xs font-medium text-black/50">
                {product.stock > 0
                  ? `${product.stock} available`
                  : "Currently out of stock"}
              </p>
            </div>

            <button
              type="button"
              onClick={addToCart}
              disabled={
                product.stock <= 0 ||
                addingToCart ||
                (product.sizes.length > 0 && !selectedSize)
              }
              className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#7c5cff] px-6 text-sm font-black uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-[#6848e8] disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-black/40 disabled:shadow-none"
            >
              {addingToCart ? (
                "Adding..."
              ) : product.stock > 0 ? (
                <>
                  Add to Cart
                  <span className="text-lg">+</span>
                </>
              ) : (
                "Out of Stock"
              )}
            </button>

            {cartMessage && (
              <p className="mt-3 text-center text-xs font-semibold text-[#6848e8]">
                {cartMessage}
              </p>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f1edff] px-4 py-4">
                <p className="text-lg">🚚</p>

                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em]">
                  Same Day Delivery
                </p>

                <p className="mt-1 text-[10px] leading-4 text-black/45">
                  Across Lagos
                </p>
              </div>

              <div className="rounded-xl bg-[#f1edff] px-4 py-4">
                <p className="text-lg">🔒</p>

                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em]">
                  Secure Payment
                </p>

                <p className="mt-1 text-[10px] leading-4 text-black/45">
                  Powered by Paystack
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}