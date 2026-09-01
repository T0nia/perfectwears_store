"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = "https://perfectwears-backend.onrender.com";

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

type ProductResponse = {
  count: number;
  total_pages: number;
  current_page: number;
  results: Product[];
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStore() {
      try {
        setLoading(true);
        setError("");

        const [productsResponse, categoriesResponse] = await Promise.all([
          fetch(`${API_URL}/api/products/`, {
            cache: "no-store",
          }),
          fetch(`${API_URL}/api/categories/`, {
            cache: "no-store",
          }),
        ]);

        if (!productsResponse.ok) {
          throw new Error("Unable to load products.");
        }

        const productsData: ProductResponse =
          await productsResponse.json();

        let categoriesData: Category[] = [];

        if (categoriesResponse.ok) {
          const categoryJson = await categoriesResponse.json();

          categoriesData = Array.isArray(categoryJson)
            ? categoryJson
            : categoryJson.results ?? [];
        }

        setProducts(productsData.results ?? []);
        setCategories(categoriesData);
      } catch (err) {
        console.error(err);
        setError(
          "We couldn't load the store right now. Please refresh the page and try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadStore();
  }, []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") {
      return products;
    }

    return products.filter(
      (product) => String(product.category.id) === selectedCategory
    );
  }, [products, selectedCategory]);

  function formatPrice(price: string) {
    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice)) {
      return `₦${price}`;
    }

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(numericPrice);
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Perfectwears
            </h1>

            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Fashion & Style
            </p>
          </div>

          <button
            type="button"
            className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium transition hover:bg-neutral-100"
          >
            Cart
          </button>
        </div>
      </header>

      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Welcome to Perfectwears
          </p>

          <h2 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Style made for you.
          </h2>

          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
            Discover our latest collection of clothing, footwear,
            fragrances, accessories and more.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedCategory === "all"
                ? "bg-black text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            All
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(String(category.id))}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedCategory === String(category.id)
                  ? "bg-black text-white"
                  : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
              {category.name}
          </button>
          ))}
        </div>

        {loading && (
          <div className="py-20 text-center">
            <p className="text-neutral-500">
              Loading Perfectwears...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-10 text-center">
            <h3 className="text-xl font-semibold">
              No products in this category yet.
            </h3>

            <p className="mt-2 text-neutral-500">
              More Perfectwears products will be available soon.
            </p>
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="group"
              >
                <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-neutral-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      No image
                    </div>
                  )}

                  {product.stock <= 0 && (
                    <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold">
                      Out of stock
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <h3 className="font-medium leading-6">
                    {product.name}
                  </h3>

                  <p className="mt-1 text-base font-semibold">
                    {formatPrice(product.price)}
                  </p>

                  {product.sizes.length > 0 && (
                    <p className="mt-2 text-xs text-neutral-500">
                      Sizes: {product.sizes.join(", ")}
                    </p>
                  )}

                  {product.stock > 0 && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {product.stock} available
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}