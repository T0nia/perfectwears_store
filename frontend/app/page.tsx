"use client";

import { useEffect, useMemo, useState } from "react";

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

const API_URL =
  "https://perfectwears-backend.onrender.com/api/products/";

const categories = [
  { name: "All", slug: "all" },
  { name: "Shirts/Tops", slug: "shirtstops" },
  { name: "Bottoms", slug: "bottoms" },
  { name: "Footwear", slug: "footwear" },
  { name: "Matching Sets", slug: "matching-sets" },
  { name: "Fragrances", slug: "fragrances" },
  { name: "Accessories", slug: "accessories" },
  { name: "Jalabiyas", slug: "jalabiyas" },
  { name: "Others", slug: "others" },
];

function formatPrice(price: string) {
  const amount = Number(price);

  if (Number.isNaN(amount)) {
    return `₦${price}`;
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount] = useState(0);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data: ProductResponse = await response.json();

        setProducts(data.results ?? []);
      } catch (err) {
        console.error(err);
        setError(
          "We couldn't load the collection right now. Please refresh and try again.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") {
      return products;
    }

    return products.filter(
      (product) => product.category.slug === activeCategory,
    );
  }, [activeCategory, products]);

  function scrollToCollection() {
    document
      .getElementById("collection")
      ?.scrollIntoView({ behavior: "smooth" });

    setMenuOpen(false);
  }

  function handleCategoryChange(slug: string) {
    setActiveCategory(slug);

    window.setTimeout(() => {
      document
        .getElementById("collection")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    setMenuOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#171717]">
      {/* Announcement */}
      <div className="bg-[#171717] px-4 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.28em] text-white sm:text-[10px]">
      Same Day Delivery &nbsp; | &nbsp; Fashion made for you
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f5f1]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href="/"
            className="flex items-center gap-3"
            aria-label="Perfectwears home"
          >
            <img
              src="/perfectwears-logo.jpg"
              alt="Perfectwears"
              className="h-12 w-12 rounded-full object-cover"
            />

            <div>
              <div className="text-[17px] font-black uppercase leading-none tracking-[0.12em]">
                Perfect
              </div>
              <div className="mt-1 text-[10px] font-medium tracking-[0.3em] text-black/45">
                Wears
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-9 md:flex">
            <button
              onClick={() => handleCategoryChange("all")}
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/65 transition hover:text-black"
            >
              Shop
            </button>

            <button
              onClick={() => handleCategoryChange("matching-sets")}
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/65 transition hover:text-black"
            >
              Matching Sets
            </button>

            <button
              onClick={() => handleCategoryChange("footwear")}
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/65 transition hover:text-black"
            >
              Footwear
            </button>

            <button
              onClick={() => handleCategoryChange("fragrances")}
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/65 transition hover:text-black"
            >
              Fragrances
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Shopping cart"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-white transition hover:border-black/40"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>

              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-white md:hidden"
            >
              <span className="flex w-5 flex-col gap-1.5">
                <span className="h-px w-full bg-black" />
                <span className="h-px w-full bg-black" />
                <span className="h-px w-full bg-black" />
              </span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-black/10 bg-[#f7f5f1] px-5 py-5 md:hidden">
            <div className="flex flex-col gap-1">
              {categories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => handleCategoryChange(category.slug)}
                  className={`rounded-lg px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.13em] transition ${
                    activeCategory === category.slug
                      ? "bg-black text-white"
                      : "text-black/60 hover:bg-black/5 hover:text-black"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#e8e4dc]">
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full border border-black/5" />
        <div className="absolute -bottom-48 -left-24 h-[520px] w-[520px] rounded-full border border-black/5" />

        <div className="relative mx-auto flex min-h-[560px] max-w-[1400px] items-center px-5 py-20 sm:min-h-[620px] sm:px-8 lg:min-h-[680px] lg:px-12">
          <div className="max-w-3xl">
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.38em] text-black/45 sm:text-xs">
              New collection • Perfectwears
            </p>

            <h1 className="text-6xl font-black uppercase leading-[0.84] tracking-[-0.055em] sm:text-8xl lg:text-[110px]">
              Wear
              <br />
              <span className="text-black/35">Your</span>
              <br />
              <span>Perfect.</span>
            </h1>

            <p className="mt-8 max-w-lg text-sm leading-7 text-black/55 sm:text-base">
              Discover clothing, footwear, fragrances, accessories and
              statement pieces selected for the modern wardrobe.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={scrollToCollection}
                className="h-13 rounded-full bg-black px-8 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-black/80"
              >
                Shop Collection
              </button>

              <button
                onClick={() => handleCategoryChange("matching-sets")}
                className="h-13 rounded-full border border-black/20 bg-white/50 px-8 text-xs font-bold uppercase tracking-[0.18em] transition hover:bg-white"
              >
                Explore Sets
              </button>
            </div>
          </div>

          <div className="absolute bottom-10 right-10 hidden text-right lg:block">
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/35">
              PERFECTWEARS
            </div>
            <div className="mt-2 text-4xl font-black tracking-[-0.06em] text-black/10">
              PWS
            </div>
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-[1400px] px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => (
              <button
                key={category.slug}
                onClick={() => handleCategoryChange(category.slug)}
                className={`shrink-0 rounded-full border px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.13em] transition sm:text-[11px] ${
                  activeCategory === category.slug
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-[#f7f5f1] text-black/55 hover:border-black/30 hover:text-black"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Collection */}
      <section
        id="collection"
        className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="mb-10 flex items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.32em] text-black/35">
              {activeCategory === "all"
                ? "The Collection"
                : categories.find(
                    (item) => item.slug === activeCategory,
                  )?.name}
            </p>

            <h2 className="text-3xl font-black tracking-[-0.035em] sm:text-5xl">
              {activeCategory === "all"
                ? "Latest arrivals"
                : "Shop the edit"}
            </h2>
          </div>

          <p className="hidden text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:block">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "product" : "products"}
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[4/5] rounded-2xl bg-black/5" />
                <div className="mt-4 h-3 w-3/4 rounded bg-black/5" />
                <div className="mt-2 h-3 w-1/3 rounded bg-black/5" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-black/10 bg-white px-6 py-14 text-center">
            <p className="text-sm text-black/55">{error}</p>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-black/80"
            >
              Refresh
            </button>
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-black/10 bg-white px-6 py-20 text-center">
            <p className="text-lg font-bold">Nothing here yet.</p>
            <p className="mt-2 text-sm text-black/45">
              New pieces are being added to this collection.
            </p>
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14">
            {filteredProducts.map((product) => (
              <article key={product.id} className="group">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => {
                    console.log("Product selected:", product.slug);
                  }}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e6e0]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
                      loading="lazy"
                    />

                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-black shadow-sm">
                        Low stock
                      </span>
                    )}

                    {product.stock === 0 && (
                      <span className="absolute left-3 top-3 rounded-full bg-black px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                        Sold out
                      </span>
                    )}

                    <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-sm transition duration-300 group-hover:opacity-100">
                      +
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-black/35">
                      {product.category.name}
                    </p>

                    <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-black/85 sm:text-[15px]">
                      {product.name}
                    </h3>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">
                        {formatPrice(product.price)}
                      </p>

                      {product.sizes.length > 0 && (
                        <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-black/35">
                          {product.sizes.join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Brand statement */}
      <section className="bg-[#171717] text-white">
        <div className="mx-auto max-w-[1100px] px-5 py-20 text-center sm:py-28">
          <img
            src="/perfectwears-logo.jpg"
            alt=""
            className="mx-auto h-16 w-16 rounded-full object-cover opacity-90"
          />

          <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.38em] text-white/35">
            Perfectwears
          </p>

          <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.045em] sm:text-6xl">
            Your style.
            <br />
            Your statement.
            <br />
            <span className="text-white/35">Wear it perfectly.</span>
          </h2>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f7f5f1]">
        <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 lg:px-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <img
                src="/perfectwears-logo.jpg"
                alt="Perfectwears"
                className="h-16 w-16 rounded-full object-cover"
              />

              <p className="mt-5 max-w-sm text-sm leading-6 text-black/45">
                Fashion and style for the modern wardrobe. Discover your next
                favourite piece at Perfectwears.
              </p>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">
                Shop
              </h3>

              <div className="mt-5 flex flex-col gap-3">
                {categories.slice(1, 5).map((category) => (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryChange(category.slug)}
                    className="text-left text-sm text-black/55 transition hover:text-black"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">
                Explore
              </h3>

              <div className="mt-5 flex flex-col gap-3">
                {categories.slice(5).map((category) => (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryChange(category.slug)}
                    className="text-left text-sm text-black/55 transition hover:text-black"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-black/10 pt-6 text-[10px] font-medium uppercase tracking-[0.15em] text-black/30 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Perfectwears</p>
            <p>Fashion & Style • Lagos, Nigeria</p>
          </div>
        </div>
      </footer>
    </main>
  );
}