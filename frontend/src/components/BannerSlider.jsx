"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react";

export default function BannerSlider({ banners = [] }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Array safety
  const list = Array.isArray(banners) ? banners : [];

  useEffect(() => {
    if (list.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [list.length, isPaused]);

  if (list.length === 0) {
    return null;
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? list.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % list.length);
  };

  const currentBanner = list[currentIndex] || {};

  const resolveImage = (b) => {
    const rawUrl = b?.image?.url || b?.imageUrl || "";
    if (!rawUrl) return "";
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      return rawUrl;
    }
    const backendBase =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:5000";
    return `${backendBase}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
  };

  const bannerImg = resolveImage(currentBanner);

  const handleBannerAction = (link) => {
    if (!link) return;
    if (link.startsWith("/")) {
      router.push(link);
    } else if (/^https?:\/\//i.test(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section
      className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative isolate min-h-[300px] sm:min-h-[360px] md:min-h-[420px] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-xl shadow-slate-200">
        {/* Background Image / Gradient */}
        {bannerImg ? (
          <>
            <img
              key={bannerImg}
              src={bannerImg}
              alt={currentBanner?.title || "Banner"}
              className="absolute inset-0 -z-20 h-full w-full object-cover object-center transition-all duration-700 ease-out"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/40" />
          </>
        ) : (
          <div className="absolute inset-0 -z-20 bg-gradient-to-br from-violet-900 via-indigo-950 to-slate-950" />
        )}

        {/* Content Box */}
        <div className="flex h-full min-h-[300px] sm:min-h-[360px] md:min-h-[420px] flex-col justify-between p-6 sm:p-10 md:p-14">
          <div className="max-w-3xl">
            {currentBanner?.badge && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-600/30 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-violet-200 backdrop-blur-md">
                <Sparkles size={12} className="text-amber-400" />
                {currentBanner.badge}
              </span>
            )}

            {currentBanner?.title && (
              <h2 className="mt-3.5 text-2xl font-black tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
                {currentBanner.title}
              </h2>
            )}

            {currentBanner?.subtitle && (
              <p className="mt-2 text-xs sm:text-base font-medium text-slate-200/90 line-clamp-2">
                {currentBanner.subtitle}
              </p>
            )}

            {/* CKEditor Rich Text Content */}
            {currentBanner?.content && (
              <div
                className="mt-4 max-w-none text-sm sm:text-base text-slate-100 [&_p]:mb-2 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_a]:text-violet-300 [&_strong]:text-amber-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: currentBanner.content }}
              />
            )}

            {currentBanner?.link && (
              <button
                type="button"
                onClick={() => handleBannerAction(currentBanner.link)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-violet-700/40 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Explore Offer
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Dots Indicator */}
          {list.length > 1 && (
            <div className="flex items-center gap-2 pt-4">
              {list.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? "w-8 bg-violet-400"
                      : "w-2 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {list.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/80"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next Slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/80"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}