"use client";
import React, { useState, useEffect, useRef } from "react";

export default function PriceCalculator() {
  const [cost, setCost] = useState("");
  const [margin, setMargin] = useState(60);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const centerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemWidth = 60; // 宽度一致即可
  const isInitialLoad = useRef(true); // 新增：标记是否初始加载

  /* 初始加载 margin */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("margin");
    if (saved) {
      setMargin(Number(saved));
    }
  }, []);

  /* 保存 margin */
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("margin", String(margin));
  }, [margin]);

  /* 价格计算 */
  const sellingPrice = cost
    ? (Number(cost) / (1 - margin / 100)).toFixed(2)
    : "0.00";

  const handleDigit = (d: string) => {
    // 限制只能输入一个小数点
    if (d === "." && cost.includes(".")) return;
    setCost((p) => (p + d).replace(/^0+(\d)/, "$1"));
  };

  const handleReset = () => setCost("");

  /* 核心：使用 IntersectionObserver 检测中心元素 */
  useEffect(() => {
    if (!centerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const v = Number(entry.target.getAttribute("data-value"));
            if (!isNaN(v) && !isInitialLoad.current) { // 初始加载时不触发
              setMargin(v);
            }
          }
        });
      },
      {
        root: scrollRef.current,
        rootMargin: "0px",
        threshold: 0.6, // 重叠超过 60% 即视为选中
      }
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  /* margin 变化 → 自动滚动到中心 */
  useEffect(() => {
    if (!scrollRef.current) return;

    // 计算滚动位置
    const index = margin - 1;
    const center =
      index * itemWidth +
      itemWidth / 2 -
      scrollRef.current.clientWidth / 2;

    // 执行滚动
    scrollRef.current.scrollTo({
      left: center,
      behavior: isInitialLoad.current ? "auto" : "smooth", // 初始加载用瞬间滚动
    });

    // 初始加载完成后标记
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [margin]);

  return (
    <div className="w-full h-screen bg-neutral-900 text-white flex flex-col items-center p-4 select-none">
      <h1 className="text-xl mb-6">售价计算器</h1>

      <div className="w-full text-center text-sm opacity-80 mb-4">
        成本 <span className="text-lg">{cost || 0}</span> ÷ (1 - 毛利率 {margin}% ) =
      </div>

      <div className="text-4xl font-bold mb-6">{sellingPrice}</div>

      {/* 数字键盘 */}
      <div className="grid grid-cols-3 gap-3 w-64 mb-6">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(String(d))}
            className="bg-neutral-700 p-4 rounded-xl active:scale-95 transition-transform"
          >
            {d}
          </button>
        ))}
        <button
          onClick={handleReset}
          className="bg-neutral-700 p-4 rounded-xl active:scale-95"
        >
          重置
        </button>
        <button
          onClick={() => handleDigit("0")}
          className="bg-neutral-700 p-4 rounded-xl active:scale-95"
        >
          0
        </button>
        <button
          onClick={() => handleDigit(".")}
          className="bg-neutral-700 p-4 rounded-xl active:scale-95"
        >
          .
        </button>
      </div>

      <div className="text-sm mb-2">毛利率：</div>

      {/* 滚轮选择器 */}
      <div className="relative w-full max-w-xs py-6">
        {/* 中央白点 */}
        <div className="pointer-events-none absolute left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full z-20"></div>

        {/* 两侧渐变 */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-neutral-900 to-transparent z-10"></div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-neutral-900 to-transparent z-10"></div>

        {/* 中心观察区域 */}
        <div
          ref={centerRef}
          className="pointer-events-none absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2"
        ></div>

        {/* 滚动容器 */}
        <div
          ref={scrollRef}
          className="flex overflow-x-scroll scrollbar-hide px-[calc(50%-30px)] space-x-0"
        >
          {Array.from({ length: 99 }, (_, i) => i + 1).map((v, idx) => (
            <div
              key={v}
              data-value={v}
              ref={(el) => (itemRefs.current[idx] = el)}
              className={`flex-none w-[60px] h-10 flex items-center justify-center transition-all duration-150
              ${v === margin ? "text-3xl font-extrabold" : "text-lg opacity-40"}
            `}
            >
              {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}