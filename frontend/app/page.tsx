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
    <main className="min-h-screen bg-white text-[#171717]">
      {/* Top utility bar */}
      <div className="hidden bg-[#111111] px-5 py-2 text-[10px] font-medium text-white/75 sm:block">
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-7">

          <button
            type="button"
            className="transition hover:text-white"
          >
            Help & Contact
          </button>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-50 bg-[#111111] text-white shadow-sm">
        <div className="mx-auto flex min-h-[74px] max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:gap-5 lg:px-10">
          {/* Logo */}
          <a
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Perfectwears home"
          >
            <img
              src="/perfectwears-logo.jpg"
              alt="Perfectwears"
              className="h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11"
            />

            <div className="hidden sm:block">
              <div className="text-[16px] font-black uppercase leading-none tracking-[0.12em]">
                Perfect
              </div>

              <div className="mt-1 text-[8px] font-medium uppercase tracking-[0.38em] text-white/45">
                Wears
              </div>
            </div>
          </a>

          {/* Categories button */}
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="hidden h-11 shrink-0 items-center gap-2 border border-white/35 px-4 text-[10px] font-bold uppercase tracking-[0.14em] transition hover:border-white md:flex"
          >
            Categories

            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Search */}
          <div className="flex min-w-0 flex-1">
            <div className="flex h-11 w-full items-center bg-white">
              <input
                type="search"
                placeholder="Search for products"
                className="min-w-0 flex-1 bg-transparent px-4 text-xs text-black outline-none placeholder:text-black/40"
                aria-label="Search products"
              />

              <button
                type="button"
                aria-label="Search"
                className="flex h-11 w-12 shrink-0 items-center justify-center bg-white text-black"
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 5 5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Account + cart */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <button
              type="button"
              className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/80 transition hover:text-white sm:flex"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5.5 20c.7-3.7 2.8-5.6 6.5-5.6s5.8 1.9 6.5 5.6" />
              </svg>

              Log In
            </button>

            <button
              type="button"
              aria-label="Shopping cart"
              className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/80 transition hover:text-white"
            >
              <svg
                width="20"
                height="20"
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

              <span className="hidden sm:inline">Cart</span>

              {cartCount > 0 && (
                <span className="absolute -right-2 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-black">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu */}
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center border border-white/20 md:hidden"
            >
              <span className="flex w-5 flex-col gap-1.5">
                <span className="h-px w-full bg-white" />
                <span className="h-px w-full bg-white" />
                <span className="h-px w-full bg-white" />
              </span>
            </button>
          </div>
        </div>

        {/* Category menu */}
        {menuOpen && (
          <div className="border-t border-white/10 bg-[#111111] px-4 py-5 md:absolute md:left-0 md:right-0 md:top-full md:px-10">
            <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => handleCategoryChange(category.slug)}
                  className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.13em] transition ${
                    activeCategory === category.slug
                      ? "bg-white text-black"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
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
      <section className="relative overflow-hidden bg-[#e9e9e7]">
        <div className="mx-auto grid min-h-[540px] max-w-[1400px] lg:min-h-[620px] lg:grid-cols-2">
          {/* Hero copy */}
          <div className="relative z-10 flex items-center px-6 py-16 sm:px-10 sm:py-20 lg:px-14 lg:py-24">
            <div className="max-w-[570px]">
              <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.34em] text-black/45 sm:text-xs">
                Perfectwears • Fashion & Style
              </p>

              <h1 className="max-w-[560px] text-5xl font-black uppercase leading-[0.9] tracking-[-0.055em] sm:text-7xl lg:text-[78px]">
                Wear Your
                <br />
                <span className="text-black/35">Perfect</span>
                <br />
                Style.
              </h1>

              <p className="mt-7 max-w-[470px] text-sm leading-7 text-black/55 sm:text-base">
                Discover clothing, footwear, fragrances, accessories and
                statement pieces selected for the modern wardrobe.
              </p>

              <button
                type="button"
                onClick={scrollToCollection}
                className="group mt-8 inline-flex h-12 items-center gap-4 border border-black bg-transparent px-6 text-[10px] font-bold uppercase tracking-[0.18em] transition hover:bg-black hover:text-white"
              >
                Shop Now

                <span className="text-base transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative min-h-[430px] overflow-hidden bg-[#deddd9] lg:min-h-0">
            <img
              src="/perfectwears-hero.jpg"
              alt="Perfectwears fashion"
              className="absolute inset-0 h-full w-full object-cover object-center"
              fetchPriority="high"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/10" />
          </div>
        </div>


        {/* Carousel dots */}
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
          <span className="h-2 w-7 rounded-full bg-black" />
          <span className="h-2 w-2 rounded-full bg-black/20" />
          <span className="h-2 w-2 rounded-full bg-black/20" />
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto grid max-w-[1400px] sm:grid-cols-3">
          <div className="flex items-center gap-4 border-b border-black/10 px-6 py-6 sm:border-b-0 sm:border-r sm:px-8 lg:px-12">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3f1ed]">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M3 6h11v10H3z" />
                <path d="M14 9h4l3 3v4h-7z" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Same Day Delivery
              </p>
              <p className="mt-1 text-xs leading-5 text-black/45">
                Fast delivery across Lagos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-black/10 px-6 py-6 sm:border-b-0 sm:border-r sm:px-8 lg:px-12">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3f1ed]">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18" />
                <path d="M7 15h4" />
              </svg>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Secure Payments
              </p>
              <p className="mt-1 text-xs leading-5 text-black/45">
                Pay securely with Paystack
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6 py-6 sm:px-8 lg:px-12">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3f1ed]">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M8 10a4 4 0 0 1 8 0" />
                <path d="M8 14a4 4 0 0 0 8 0" />
                <path d="M8 12h8" />
              </svg>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Customer Support
              </p>
              <p className="mt-1 text-xs leading-5 text-black/45">
                We're here whenever you need us
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section className="border-b border-black/10 bg-[#f7f5f1]">
        <div className="mx-auto max-w-[1400px] px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => handleCategoryChange(category.slug)}
                className={`shrink-0 rounded-full border px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.13em] transition sm:text-[11px] ${
                  activeCategory === category.slug
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white text-black/55 hover:border-black/30 hover:text-black"
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
                ? "Shop Our Collection"
                : categories.find(
                    (item) => item.slug === activeCategory,
                  )?.name}
            </p>

            <h2 className="text-3xl font-black tracking-[-0.035em] sm:text-5xl">
              {activeCategory === "all"
                ? "Find your perfect style"
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
              type="button"
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
      <section className="bg-[#111111] text-white">
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
                    type="button"
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
                More
              </h3>

              <div className="mt-5 flex flex-col gap-3">
                {categories.slice(5).map((category) => (
                  <button
                    key={category.slug}
                    type="button"
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