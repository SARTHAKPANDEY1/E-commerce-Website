const categories = ["Men", "Women", "Kids", "Home", "Beauty", "Genz"];
const demoVendors = [
  { id: "vendor-demo-1", name: "Urban Outfit Hub" },
  { id: "vendor-demo-2", name: "Style Forge" },
  { id: "vendor-demo-3", name: "Nova Trends" },
];

function priceFor(i) {
  // stable prices
  return 599 + (i * 73) % 3400;
}

function ratingFor(i) {
  // stable ratings 3.0 - 5.0
  const r = 3 + ((i * 17) % 21) / 10; // 3.0..5.0
  return Number(r.toFixed(1));
}

function stockFor(i) {
  // stable stock: every 7th item out of stock
  return (i + 1) % 7 === 0 ? 0 : 15;
}

function soldFor(i, stock) {
  // stable sold values while respecting stock
  const sold = (i * 2) % 12;
  return stock === 0 ? sold + 4 : sold;
}

function dateFor(i) {
  // stable createdAt (newer first-ish)
  const now = Date.now();
  const daysAgo = (i * 3) % 120;
  return new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

export const products = Array.from({ length: 50 }, (_, idx) => {
  const i = idx + 1;
  const category = categories[idx % categories.length];
  const stock = stockFor(i);
  const vendor = demoVendors[idx % demoVendors.length];

  return {
    id: i, // stable numeric id
    title: `${category} Premium Product ${i}`,
    description: `Premium ${category.toLowerCase()} product built for daily use with clean design and reliable quality.`,
    category,
    price: priceFor(i),
    rating: ratingFor(i),
    stock,
    sold: soldFor(i, stock),
    createdAt: dateFor(i),
    vendorId: vendor.id,
    vendorName: vendor.name,
    image: `https://picsum.photos/seed/${category}-${i}/600/400`, // stable per id
  };
});
