// src/components/BannerSlider.jsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react";

export default function BannerSlider({ banners = [] }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const list = Array.isArray(banners) ? banners : [];

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (list.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, 4500);
  }, [list.length]);

  useEffect(() => {
    if (!isPaused) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused, startTimer]);

  if (list.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? list.length - 1 : prev - 1));
    if (!isPaused) startTimer();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % list.length);
    if (!isPaused) startTimer();
  };

  const resolveImage = (b) => {
    const rawUrl = b?.image?.url || b?.imageUrl || "";
    if (!rawUrl) return "";
    if (/^https?:\/\//.test(rawUrl)) return rawUrl;
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";
    return `${base}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
  };

  const handleBannerAction = (link) => {
    if (!link) return;
    if (link.startsWith("/")) router.push(link);
    else if (/^https?:\/\//i.test(link)) window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className="w-full my-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative isolate min-h-[280px] sm:min-h-[340px] md:min-h-[400px] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-xl shadow-slate-200">

        {/* Sliding track */}
        <div
          style={{
            display: "flex",
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            willChange: "transform",
            height: "100%",
          }}
        >
          {list.map((banner, idx) => {
            const bannerImg = resolveImage(banner);
            return (
              <div
                key={banner._id || idx}
                style={{ minWidth: "100%", flexShrink: 0 }}
                className="relative min-h-[280px] sm:min-h-[340px] md:min-h-[400px]"
              >
                {bannerImg ? (
                  <>
                    <img
                      src={bannerImg}
                      alt={banner?.title || "Banner"}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading={idx === 0 ? "eager" : "lazy"}
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/75 to-slate-950/30" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-indigo-950 to-slate-950" />
                )}

                {/* Content */}
                <div className="relative flex flex-col justify-between h-full min-h-[280px] sm:min-h-[340px] md:min-h-[400px] p-6 sm:p-10 md:p-14 z-10">
                  <div className="max-w-2xl">
                    {banner?.badge && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-600/30 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-violet-200 backdrop-blur-md">
                        <Sparkles size={12} className="text-amber-400" />
                        {banner.badge}
                      </span>
                    )}
                    {banner?.title && (
                      <h2 className="mt-3.5 text-2xl font-black tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
                        {banner.title}
                      </h2>
                    )}
                    {banner?.subtitle && (
                      <p className="mt-2 text-xs sm:text-base font-medium text-slate-200/90 line-clamp-2">
                        {banner.subtitle}
                      </p>
                    )}
                    {banner?.content && (
                      <div
                        className="mt-4 max-w-none text-sm sm:text-base text-slate-100 [&_p]:mb-2 [&_a]:text-violet-300 [&_strong]:text-amber-300"
                        dangerouslySetInnerHTML={{ __html: banner.content }}
                      />
                    )}
                    {banner?.link && (
                      <button
                        type="button"
                        onClick={() => handleBannerAction(banner.link)}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-violet-700/40 transition hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Explore Offer <ArrowRight size={16} />
                      </button>
                    )}
                  </div>

                  {/* Dots — only show on active slide */}
                  {list.length > 1 && idx === currentIndex && (
                    <div className="flex items-center gap-2 pt-4">
                      {list.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          onClick={(e) => { e.stopPropagation(); setCurrentIndex(dotIdx); if (!isPaused) startTimer(); }}
                          className={`h-2 rounded-full transition-all duration-300 ${dotIdx === currentIndex ? "w-8 bg-violet-400" : "w-2 bg-white/40 hover:bg-white/70"}`}
                          aria-label={`Slide ${dotIdx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Arrows */}
        {list.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Previous"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-violet-600/90"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-violet-600/90"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Slide count */}
        {list.length > 1 && (
          <div className="absolute bottom-4 right-4 z-20 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white/80 backdrop-blur-sm">
            {currentIndex + 1} / {list.length}
          </div>
        )}
      </div>
    </section>
  );
}
