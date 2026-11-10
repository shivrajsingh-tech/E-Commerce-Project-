import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={36} className="animate-spin text-violet-600" />
        <p className="text-sm font-medium text-slate-500">Loading...</p>
      </div>
    </div>
  );
}