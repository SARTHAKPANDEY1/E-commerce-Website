import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Boxes, Building2, PackagePlus, FileText, CircleDollarSign, Image as ImageIcon, Package } from "lucide-react";
import { useState } from "react";
import useAuthStore from "../../store/auth.store";
import useProductsStore from "../../store/products.store";
import { createVendorProduct } from "../../services/api/vendor.api";
import { formatCurrency } from "../../utils/formatCurrency";

export default function AddProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const addVendorProduct = useProductsStore((s) => s.addVendorProduct);
  const upsertVendorProduct = useProductsStore((s) => s.upsertVendorProduct);

  const {
    register,
    control,
    setError,
    clearErrors,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      category: "Men",
      price: "",
      description: "",
      stock: "",
      image: "",
      sku: "",
      status: "active",
    },
  });
  const [previewTitle, previewCategory, previewPrice, previewStock, previewImage, previewDescription, previewSku, previewStatus] = useWatch({
    control,
    name: ["title", "category", "price", "stock", "image", "description", "sku", "status"],
  });
  const [imageMode, setImageMode] = useState("url");
  const [uploadedImage, setUploadedImage] = useState("");

  function handleImageUpload(file) {
    if (!file) {
      setUploadedImage("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(String(reader.result || ""));
      clearErrors("image");
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(values) {
    const finalImage = imageMode === "upload" ? uploadedImage : String(values.image || "").trim();

    if (!finalImage) {
      setError("image", {
        type: "manual",
        message: "Please upload an image or provide an image URL.",
      });
      return;
    }

    let product = null;
    try {
      product = await createVendorProduct({
        ...values,
        price: Number(values.price),
        stock: Number(values.stock),
        image: finalImage,
      });
      product = upsertVendorProduct({
        ...product,
        image: finalImage,
        vendorId: user?.id || product.vendorId,
        vendorName: user?.organizationName || user?.name || product.vendorName,
      });
    } catch (error) {
      // Keep existing local fallback so feature doesn't break if API is unavailable.
      product = addVendorProduct(
        {
          ...values,
          price: Number(values.price),
          stock: Number(values.stock),
          image: finalImage,
        },
        user
      );
    }

    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-order-summary"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["product", String(product.id)] });

    navigate("/vendor/dashboard");
  }

  return (
    <div className="ec-container">
      <div className="py-8">
        <div className="ec-surface p-6">
          <div className="ec-pill inline-flex">Seller Catalog</div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
            Add Product
          </h1>
          <p className="mt-1 text-slate-700">
            Publish a new listing with complete details for better visibility and conversion.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 ec-surface p-6 space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white/60 p-4">
              <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                <FileText size={16} className="text-blue-700" />
                Product Information
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Add clear naming and category details to improve discoverability.
              </p>

              <div className="mt-4 space-y-4">
            <Field label="Product Title" error={errors.title?.message}>
              <input
                {...register("title", { required: "Title is required" })}
                className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Premium Product Title"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" error={errors.category?.message}>
                <select
                  {...register("category", { required: "Category is required" })}
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Kids">Kids</option>
                  <option value="Home">Home</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Genz">Genz</option>
                </select>
              </Field>

              <Field label="SKU (Optional)">
                <input
                  {...register("sku")}
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="OD-MEN-001"
                />
              </Field>
            </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/60 p-4">
              <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                <CircleDollarSign size={16} className="text-emerald-700" />
                Pricing & Inventory
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Keep pricing and stock accurate to prevent order issues.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Price (INR)" error={errors.price?.message}>
              <input
                type="number"
                step="0.01"
                {...register("price", {
                  required: "Price is required",
                  min: { value: 0.01, message: "Price must be greater than 0" },
                })}
                className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="999"
              />
            </Field>
              <Field label="Stock Qty" error={errors.stock?.message}>
                <input
                  type="number"
                  {...register("stock", {
                    required: "Stock is required",
                    min: { value: 0, message: "Stock cannot be negative" },
                  })}
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="10"
                />
              </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/60 p-4">
              <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                <Package size={16} className="text-violet-700" />
                Description & Status
              </div>
              <div className="mt-4 space-y-4">
            <Field label="Description" error={errors.description?.message}>
              <textarea
                rows={4}
                {...register("description", { required: "Description is required" })}
                className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Describe key features, material, and usage."
              />
            </Field>
              <Field label="Listing Status">
                <select
                  {...register("status")}
                  className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/60 p-4">
              <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                <ImageIcon size={16} className="text-amber-700" />
                Product Media
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Use high-resolution visuals. You can provide URL or upload file.
              </p>
              <div className="mt-4">
            <Field label="Product Image" error={errors.image?.message}>
              <div className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-white/70 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setImageMode("url");
                    clearErrors("image");
                  }}
                  className={
                    "rounded-xl px-3 py-2 text-sm font-black transition " +
                    (imageMode === "url"
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100/70")
                  }
                >
                  Image URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageMode("upload");
                    clearErrors("image");
                  }}
                  className={
                    "rounded-xl px-3 py-2 text-sm font-black transition " +
                    (imageMode === "upload"
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100/70")
                  }
                >
                  Upload Image
                </button>
              </div>

              <div className="mt-3">
                {imageMode === "url" ? (
                  <input
                    {...register("image", {
                      validate: (value) => {
                        if (imageMode !== "url") return true;
                        if (!String(value || "").trim()) return true;
                        return /^https?:\/\//i.test(String(value)) || "Enter a valid image URL";
                      },
                    })}
                    className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="https://example.com/image.jpg"
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                    className="w-full rounded-2xl border border-slate-300/70 bg-slate-900/5 px-3 py-2.5 text-sm font-extrabold outline-none focus:ring-2 focus:ring-blue-200"
                  />
                )}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-600">
                Choose either image URL or image upload. One option is required.
              </p>
            </Field>
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="ec-btn-primary inline-flex items-center gap-2">
                <PackagePlus size={16} />
                {previewStatus === "draft" ? "Save as Draft" : "Publish Product"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/vendor/dashboard")}
                className="ec-btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>

          <aside className="ec-surface p-5 h-fit">
            <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
              <Building2 size={16} className="text-blue-700" />
              Seller: {user?.organizationName || user?.name || "Vendor"}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-3">
              <img
                src={uploadedImage || previewImage || "https://picsum.photos/seed/vendor-preview/500/320"}
                alt="Preview"
                className="h-36 w-full rounded-xl object-cover"
              />
              <div className="mt-3 font-black text-slate-950 line-clamp-2">
                {previewTitle || "Product preview title"}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-600">
                {previewCategory || "Category"} • SKU: {previewSku || "N/A"}
              </div>
              <div className="mt-2 text-sm font-black text-slate-900">
                {formatCurrency(previewPrice || 0)}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-600">
                Stock: {previewStock || "0"} • Status: {previewStatus || "active"}
              </div>
              <p className="mt-2 text-xs text-slate-600 line-clamp-3">
                {previewDescription || "Product description preview will appear here."}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <Tip icon={<BadgeCheck size={15} className="text-emerald-700" />} text="Use clear product names and real pricing." />
              <Tip icon={<Boxes size={15} className="text-blue-700" />} text="Keep stock updated to avoid overselling." />
              <Tip icon={<PackagePlus size={15} className="text-violet-700" />} text="Use image URL or upload high quality image." />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs font-black text-slate-800">{label}</label>
      <div className="mt-2">{children}</div>
      {error ? <div className="mt-1 text-xs font-black text-rose-700">{error}</div> : null}
    </div>
  );
}

function Tip({ icon, text }) {
  return (
    <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white/65 px-3 py-2 text-xs font-semibold text-slate-700">
      {icon}
      <span>{text}</span>
    </div>
  );
}
