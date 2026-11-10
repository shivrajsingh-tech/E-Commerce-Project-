"use client";

import { useState } from "react";
import { Plus, Home, Briefcase, MapPin, Check, Trash2, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function AddressManager({
    addresses = [],
    selectedAddressId,
    onSelectAddress,
    onAddressesUpdated,
}) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        label: "Home",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        phone: "",
        isDefault: false,
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleAddAddress = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await api.post("/addresses", formData);
            if (res.data) {
                setShowAddForm(false);
                setFormData({
                    label: "Home",
                    street: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    phone: "",
                    isDefault: false,
                });
                if (onAddressesUpdated) onAddressesUpdated();
            }
        } catch (err) {
            console.error("Failed to add address:", err);
            alert(err.response?.data?.message || "Failed to save address");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this address?")) return;
        try {
            await api.delete(`/addresses/${id}`);
            if (onAddressesUpdated) onAddressesUpdated();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const getIcon = (label) => {
        switch (label?.toLowerCase()) {
            case "home":
                return <Home size={16} className="text-violet-400" />;
            case "office":
                return <Briefcase size={16} className="text-cyan-400" />;
            default:
                return <MapPin size={16} className="text-amber-400" />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Delivery Address</h3>
                <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20"
                >
                    <Plus size={14} />
                    {showAddForm ? "Cancel" : "Add New Address"}
                </button>
            </div>

            {/* ADD ADDRESS MODAL / FORM */}
            {showAddForm && (
                <form
                    onSubmit={handleAddAddress}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm space-y-3"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-semibold">Address Label:</span>
                        {["Home", "Office", "Other"].map((lbl) => (
                            <button
                                key={lbl}
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, label: lbl }))}
                                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                                    formData.label === lbl
                                        ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                                        : "border border-white/10 bg-white/[0.04] text-slate-400"
                                }`}
                            >
                                {lbl}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            type="text"
                            name="street"
                            required
                            placeholder="Flat / House No. / Street"
                            value={formData.street}
                            onChange={handleInputChange}
                            className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-white outline-none focus:border-violet-500"
                        />
                        <input
                            type="tel"
                            name="phone"
                            required
                            placeholder="10-digit Mobile Number"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-white outline-none focus:border-violet-500"
                        />
                        <input
                            type="text"
                            name="city"
                            required
                            placeholder="City"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-white outline-none focus:border-violet-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                name="state"
                                required
                                placeholder="State"
                                value={formData.state}
                                onChange={handleInputChange}
                                className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-white outline-none focus:border-violet-500"
                            />
                            <input
                                type="text"
                                name="postalCode"
                                required
                                placeholder="Pincode"
                                value={formData.postalCode}
                                onChange={handleInputChange}
                                className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-white outline-none focus:border-violet-500"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                        <input
                            type="checkbox"
                            name="isDefault"
                            checked={formData.isDefault}
                            onChange={handleInputChange}
                            className="rounded border-white/10 accent-violet-500"
                        />
                        Set as default address
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 text-xs font-bold text-white shadow-lg disabled:opacity-50"
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        Save Address
                    </button>
                </form>
            )}

            {/* SAVED ADDRESSES LIST */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {addresses.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                        No saved address found. Click above to add one.
                    </div>
                ) : (
                    addresses.map((addr) => {
                        const addrId = String(addr._id || addr.id);
                        const isSelected = selectedAddressId === addrId;
                        return (
                            <div
                                key={addrId}
                                onClick={() => onSelectAddress(addrId)}
                                className={`relative cursor-pointer rounded-2xl border p-4 transition ${
                                    isSelected
                                        ? "border-cyan-400 bg-cyan-400/10 shadow-md shadow-cyan-950/40"
                                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        {getIcon(addr.label)}
                                        <span className="text-xs font-bold text-white">{addr.label}</span>
                                        {addr.isDefault && (
                                            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isSelected && (
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
                                                <Check size={12} strokeWidth={3} />
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => handleDelete(addrId, e)}
                                            className="text-slate-500 hover:text-rose-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-300 leading-relaxed">
                                    {addr.street}, {addr.city}, {addr.state} - {addr.postalCode}
                                </p>
                                <p className="mt-2 text-[11px] text-slate-400 font-medium">
                                    Phone: {addr.phone}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}