// A lightweight inline confirm dialog rendered via react-hot-toast
import toast from "react-hot-toast";
import { Trash2, X } from "lucide-react";

/**
 * Shows a confirm toast.
 * Returns a Promise<boolean> — resolves true if confirmed, false if cancelled.
 *
 * Usage:
 *   const ok = await confirmToast("Delete this item?");
 *   if (!ok) return;
 */
export const confirmToast = (message = "Are you sure?") =>
  new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2.5 min-w-[220px]">
          <div className="flex items-center gap-2">
            <Trash2 size={15} className="text-rose-400 shrink-0" />
            <span className="text-sm font-semibold text-slate-100">{message}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { toast.dismiss(t.id); resolve(true); }}
              className="flex-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600 transition cursor-pointer"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => { toast.dismiss(t.id); resolve(false); }}
              className="flex-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-600 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 8000,
        style: {
          background: "#1e293b",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          padding: "14px 16px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
        },
      }
    );
  });
