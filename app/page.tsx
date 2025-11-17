"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function App() {
  // 毛利率持久化（本地存储）
  const getSavedMargin = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("grossMargin");
      return saved ? Math.min(99, Math.max(1, Number(saved))) : 60;
    }
    return 60;
  };

  const [margin, setMargin] = useState(getSavedMargin());
  const [costInput, setCostInput] = useState(""); // 用户输入的原始字符串
  const scrollRef = useRef<HTMLDivElement>(null);

  // 持久化毛利率
  useEffect(() => {
    localStorage.setItem("grossMargin", String(margin));
  }, [margin]);

  // 计算售价（保留2位小数）
  const cost = parseFloat(costInput.replace(/[^0-9.]/g, "")) || 0;
  const price = cost === 0 ? 0 : (cost / (1 - margin / 100)).toFixed(2);
  const displayPrice =
    cost === 0
      ? "0.00"
      : Number(price).toLocaleString("en-US", { minimumFractionDigits: 2 });

  // ==================== 毛利率滚轮 ====================
  const ITEM_WIDTH = 76;
  const items = Array.from({ length: 199 }, (_, i) => i + 1); // 多留点保证首尾能居中

  const scrollToValue = useCallback(
    (val: number, behavior: "smooth" | "auto" = "smooth") => {
      if (!scrollRef.current) return;
      const el = scrollRef.current;
      const center = el.offsetWidth / 2 - ITEM_WIDTH / 2;
      el.scrollTo({ left: (val - 1) * ITEM_WIDTH - center, behavior });
    },
    []
  );

  useEffect(() => {
    scrollToValue(margin, "auto");
  }, []);

  const handleMarginScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const timer = setTimeout(() => {
      const el = scrollRef.current!;
      const center = el.scrollLeft + el.offsetWidth / 2;
      const idx = Math.round(center / ITEM_WIDTH);
      const newVal = Math.max(1, Math.min(99, idx));
      if (newVal !== margin) {
        setMargin(newVal);
        navigator.vibrate?.(30);
      }
      scrollToValue(newVal, "smooth");
    }, 120);
    return () => clearTimeout(timer);
  }, [margin, scrollToValue]);

  // ==================== 数字键盘输入 ====================
  const append = (char: string) => {
    if (char === "." && costInput.includes(".")) return;
    setCostInput((prev) => (prev === "0" && char !== "." ? "" : prev) + char);
  };

  const resetCost = () => setCostInput("");

  return (
    <>
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start pt-8 pb-20 px-6">
        {/* 标题 */}
        <h1 className="text-2xl font-light mb-10 tracking-widest">
          售价计算器
        </h1>

        {/* 公式区 */}
        <div className="w-full max-w-md mb-12">
          <div className="flex items-center justify-center gap-3 text-lg">
            <div className="px-5 py-3 bg-zinc-800 rounded-2xl">
              成本 {cost || "-"}
            </div>
            <span>÷</span>
            <div className="px-5 py-3 bg-zinc-800 rounded-2xl">
              ( 1 - 毛利率 {margin}% )
            </div>
            <span>=</span>
            <div className="px-5 py-3 bg-zinc-800 rounded-2xl">
              售价 {displayPrice}
            </div>
          </div>

          <div className="text-center mt-8">
            <div className="text-sm text-gray-500 mb-2">售价：</div>
            <div className="text-6xl font-light tracking-wider">
              {displayPrice}
            </div>
          </div>
        </div>

        {/* 成本输入键盘 */}
        <div className="w-full max-w-xs mb-12">
          <div className="grid grid-cols-3 gap-4">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => append(String(n))}
                className="aspect-square bg-zinc-700 rounded-2xl text-3xl font-light active:bg-zinc-600 active:scale-95 transition-all"
              >
                {n}
              </button>
            ))}
            <button
              onClick={resetCost}
              className="col-span-1 bg-zinc-700 rounded-2xl text-lg font-light active:bg-zinc-600 active:scale-95 transition-all"
            >
              重置
            </button>
            <button
              onClick={() => append("0")}
              className="bg-zinc-700 rounded-2xl text-3xl font-light active:bg-zinc-600 active:scale-95 transition-all"
            >
              0
            </button>
            <button
              onClick={() => append(".")}
              className="bg-zinc-700 rounded-2xl text-3xl font-light active:bg-zinc-600 active:scale-95 transition-all"
            >
              .
            </button>
          </div>
        </div>

        {/* 毛利率滚轮 */}
        <div className="w-full max-w-md">
          <div className="text-sm text-gray-500 mb-3 text-center">毛利率：</div>

          <div className="relative">
            {/* 中间白点指示器 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg z-30 pointer-events-none" />

            {/* 底部5个小点（仅作视觉参考） */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
              {[60, 61, 68, 69, 70].map((v) => (
                <div
                  key={v}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    v === margin ? "bg-white/80" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* 两侧渐隐 */}
            <div className="absolute left-0 top-0 bottom-16 w-28 bg-gradient-to-r from-black to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-16 w-28 bg-gradient-to-l from-black to-transparent z-20 pointer-events-none" />

            {/* 滚轮本体 */}
            <div
              ref={scrollRef}
              onScroll={handleMarginScroll}
              className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex items-center py-12">
                <div className="shrink-0 w-screen" />
                {items.map((n) => {
                  const distance = Math.abs(n - margin);
                  const scale =
                    distance === 0 ? 2 : distance === 1 ? 1.4 : 0.95;
                  const opacity =
                    distance === 0 ? 1 : distance === 1 ? 0.6 : 0.2;
                  return (
                    <div
                      key={n}
                      className="shrink-0 flex items-center justify-center snap-center"
                      style={{ width: `${ITEM_WIDTH}px` }}
                    >
                      <span
                        className="text-5xl font-light transition-all duration-300"
                        style={{
                          transform: `scale(${scale})`,
                          opacity,
                          color: distance === 0 ? "#fff" : "#888",
                        }}
                      >
                        {n}
                      </span>
                    </div>
                  );
                })}
                <div className="shrink-0 w-screen" />
              </div>
            </div>

            {/* 右侧大 % 号 */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-8 pointer-events-none">
              <span className="text-6xl font-light text-gray-600">%</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
