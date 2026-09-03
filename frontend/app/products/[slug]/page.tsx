"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

const API_URL = "https://perfectwears-backend.onrender.com/api/products/";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL + slug);

        if (!response.ok) {
          throw new Error("Product not found");
        }

        const data: Product = await response.json();
        setProduct(data);
      } catch {
        setError("Unable to load this product.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadProduct();
    }
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-5 py-12 text-black">
        <div className="mx-auto max-w-6xl">
          <p className="text-black/50">Loading product...</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-white px-5 py-12 text-black">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold">Product not found</h1>

          <p className="mt-3 text-black/50">
            We could not load this product.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="overflow-hidden rounded-2xl bg-[#f3f1ed]">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-auto w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-black/35">
                No image available
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
              {product.category?.name}
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
              {product.name}
            </h1>

            <p className="mt-5 text-2xl font-bold">
              ₦{Number(product.price).toLocaleString("en-NG")}
            </p>

            {product.sizes && product.sizes.length > 0 && (
              <div className="mt-8">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">
                  Available sizes
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className="rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-medium transition hover:border-black"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 text-sm text-black/50">
              {product.stock > 0
                ? `${product.stock} available`
                : "Out of stock"}
            </p>

            <button
              type="button"
              disabled={product.stock <= 0}
              className="mt-8 w-full rounded-xl bg-black px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}