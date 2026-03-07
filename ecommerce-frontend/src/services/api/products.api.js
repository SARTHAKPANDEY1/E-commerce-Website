import useProductsStore from "../../store/products.store";

/* ---------------- PRODUCTS ---------------- */

export async function listProducts({
  q = "",
  category = "All",
  sort = "relevance",
} = {}) {
  const query = q.trim().toLowerCase();
  let result = [...useProductsStore.getState().getAllProducts()];

  // Search filter
  if (query) {
    result = result.filter((p) =>
      (p.title + " " + p.category).toLowerCase().includes(query)
    );
  }

  // Category filter
  if (category && category !== "All") {
    result = result.filter((p) => p.category === category);
  }

  // Sorting
  if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
  if (sort === "rating-desc")
    result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (sort === "newest")
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return result;
}

export async function getProductById(id) {
  return useProductsStore.getState().getProductById(id);
}

export async function listCategories() {
  const categories = new Set(
    useProductsStore
      .getState()
      .getAllProducts()
      .map((p) => p.category)
      .filter(Boolean)
  );

  return ["All", ...Array.from(categories)];
}
