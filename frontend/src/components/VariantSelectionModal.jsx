"use client";

import { useEffect, useState } from "react";
import { X, ShoppingCart, Check } from "lucide-react";
import api from "@/lib/api";
import { useCart } from "@/context/cartContext";

export default function VariantSelectionModal({
  product,
  storeId,
  open,
  onClose,
  onAdded,
}) {
  const { addToCart } = useCart();

  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !product?._id) return;

    const fetchVariants = async () => {
      try {
        setLoading(true);
        setError("");
        setSelectedVariant(null);

        const response = await api.get(
          `/product-variants/product/${product._id}`,
          {
            params: storeId ? { storeId } : {},
          }
        );

        const data = response.data.variants || [];
        setVariants(data);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            "Unable to load variants"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, [open, product?._id, storeId]);

  if (!open) return null;

  const handleAdd = async () => {
    if (!selectedVariant) {
      setError("Please select a variant");
      return;
    }

    try {
      setAdding(true);
      setError("");

      const variant = selectedVariant;

      addToCart({
        _id: String(product._id),
        variantId: String(variant._id),
        name: product.name,
        variantName: variant.name,
        unitValue: variant.unitValue,
        unit: variant.unit,
        price: Number(variant.sellingPrice),
        mrp: Number(variant.mrp),
        image:
          variant.images?.[0]?.url ||
          product.images?.[0]?.url ||
          "",
        storeId: variant.storeId,
        inventoryId: variant.inventoryId,
      });

      onAdded?.(variant);
      onClose();
    } catch (err) {
      setError("Unable to add item");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">
              Select Variant
            </h2>
            <p className="text-sm text-gray-500">
              {product?.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">
          {loading && (
            <p className="py-8 text-center text-gray-500">
              Loading variants...
            </p>
          )}

          {!loading && variants.length === 0 && (
            <p className="py-8 text-center text-gray-500">
              No variants available for this product.
            </p>
          )}

          {!loading &&
            variants.map((variant) => {
              const selected =
                String(selectedVariant?._id) ===
                String(variant._id);

              return (
                <button
                  type="button"
                  key={variant._id}
                  disabled={!variant.inStock}
                  onClick={() => {
                    setSelectedVariant(variant);
                    setError("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-green-600 bg-green-50"
                      : "border-gray-200"
                  } ${
                    !variant.inStock
                      ? "cursor-not-allowed opacity-50"
                      : "hover:border-green-500 cursor-pointer"
                  }`}
                >
                  <img
                    src={
                      variant.images?.[0]?.url ||
                      product?.images?.[0]?.url ||
                      "/placeholder.png"
                    }
                    alt={variant.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {variant.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {variant.unitValue} {variant.unit}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-semibold text-green-700">
                        ₹{variant.sellingPrice}
                      </span>

                      <span className="text-sm text-gray-400 line-through">
                        ₹{variant.mrp}
                      </span>
                    </div>

                    <p className="mt-1 text-xs">
                      {variant.inStock
                        ? `${variant.availableToSell} available`
                        : "Out of stock"}
                    </p>
                  </div>

                  <div className="flex h-6 w-6 items-center justify-center rounded-full border">
                    {selected && (
                      <Check
                        size={16}
                        className="text-green-600"
                      />
                    )}
                  </div>
                </button>
              );
            })}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="border-t p-4">
          <button
            type="button"
            onClick={handleAdd}
            disabled={
              loading ||
              adding ||
              !selectedVariant ||
              !selectedVariant.inStock
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <ShoppingCart size={18} />
            {adding ? "Adding..." : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

