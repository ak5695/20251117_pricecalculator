"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";

export default function PriceCalculator() {
  const t = useTranslations("PriceCalculator");
  const [cost, setCost] = useState("");
  // 设置默认值为60，确保初始状态就是60
  const [margin, setMargin] = useState(60);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const savedMargin = localStorage.getItem("margin");
    if (savedMargin) {
      const parsed = parseInt(savedMargin, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 99) {
        setMargin(parsed);
      }
      // 如果解析失败，保持默认值60不变
    }
    setIsLoaded(true);
  }, []);

  // Persist margin
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("margin", margin.toString());
    }
  }, [margin, isLoaded]);

  const sellingPrice = useMemo(() => {
    const costNum = parseFloat(cost);
    if (!costNum || isNaN(costNum)) return "0.00";
    const price = costNum / (1 - margin / 100);
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [cost, margin]);

  const handleInput = (val: string) => {
    if (navigator.vibrate) navigator.vibrate(5);

    if (val === "reset") {
      setCost("");
      return;
    }
    if (val === ".") {
      if (!cost.includes(".")) {
        setCost((prev) => (prev === "" ? "0." : prev + "."));
      }
      return;
    }
    setCost((prev) => {
      const next = prev + val;
      // Prevent multiple leading zeros
      if (next.startsWith("0") && !next.startsWith("0.") && next.length > 1) {
        return next.substring(1);
      }
      // Limit decimal places to 2
      if (next.includes(".")) {
        const parts = next.split(".");
        const decimal = parts[1];
        if (decimal && decimal.length > 2) return prev;
      }
      return next;
    });
  };

  // 处理毛利率变化
  const handleMarginChange = (newMargin: number) => {
    if (newMargin >= 1 && newMargin <= 99) {
      setMargin(newMargin);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1c1e] text-white font-sans touch-none overflow-hidden flex flex-col items-center">
      <div className="w-full max-w-md px-6 py-8 flex flex-col h-full">
        {/* Title */}
        <h1 className="text-center text-4xl text-white font-bold mt-4 mb-9 tracking-wider">
          {t("title")}
        </h1>

        {/* Formula Area */}
        <div className="flex items-center justify-center gap-1 mb-6 w-full font-bold">
          <FormulaBox label={t("cost")} value={cost || "0.00"} width="w-24" />
          <span className="text-gray-400 text-xl px-1">÷</span>
          <span className="text-gray-400 text-xl">(</span>
          <span className="text-white text-xl px-1">1</span>
          <span className="text-gray-400 text-xl">-</span>
          <FormulaBox label={t("margin")} value={`${margin}%`} width="w-20" />
          <span className="text-gray-400 text-xl">)</span>
          <span className="text-gray-400 text-xl px-1">=</span>
          <FormulaBox
            label={t("sellingPrice")}
            value={sellingPrice}
            width="w-28"
          />
        </div>

        {/* Selling Price Row */}
        <div className="flex items-baseline justify-between mb-7 w-full">
          <span className="text-gray-400 text-xl font-bold whitespace-nowrap">
            {t("sellingPrice")}:
          </span>
          <span className="text-5xl font-bold tracking-tight leading-none text-white">
            {sellingPrice}
          </span>
        </div>

        {/* Cost & Keypad Row */}
        <div className="flex justify-between mb-5 w-full flex-1">
          <span className="text-gray-400 text-xl font-bold whitespace-nowrap pt-4 mr-4">
            {t("cost")}:
          </span>
          <div className="flex-1 max-w-[260px]">
            <div className="grid grid-cols-3 gap-x-5 gap-y-3">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                <KeypadButton
                  key={num}
                  label={num.toString()}
                  onClick={() => handleInput(num.toString())}
                />
              ))}
              <KeypadButton
                label={t("reset")}
                onClick={() => handleInput("reset")}
                fontSize="text-lg"
                isSpecial={true}
              />
              <KeypadButton label="0" onClick={() => handleInput("0")} />
              <KeypadButton label="." onClick={() => handleInput(".")} />
            </div>
          </div>
        </div>

        {/* Margin Wheel Row */}
        <div className="flex items-center justify-between w-full mt-auto pb-8">
          <span className="text-gray-400 text-xl font-bold whitespace-nowrap mr-1">
            {t("margin")}:
          </span>

          <WheelSelector
            currentMargin={margin}
            onMarginChange={handleMarginChange}
          />
          <span className="text-3xl font-bold">%</span>
        </div>
      </div>
    </div>
  );
}

const WheelSelector = ({
  currentMargin,
  onMarginChange,
}: {
  currentMargin: number;
  onMarginChange: (margin: number) => void;
}) => {
  // 扩展范围到1-99，覆盖所有可能的毛利率值
  const arr = useMemo(() => Array.from({ length: 99 }, (_, i) => i + 1), []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // 确保初始索引计算正确，如果currentMargin无效，使用60的索引（59）
  const initialIndex = arr.indexOf(currentMargin) !== -1 
    ? arr.indexOf(currentMargin) 
    : arr.indexOf(60); // 直接使用60的索引
  
  const activeIndexRef = useRef(initialIndex);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // 用于防抖的计时器引用
  const vibrateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 当外部margin变化时同步滚动位置
  useEffect(() => {
    const newIndex = arr.indexOf(currentMargin);
    const targetIndex = newIndex !== -1 ? newIndex : arr.indexOf(60);
    
    if (targetIndex !== activeIndexRef.current) {
      activeIndexRef.current = targetIndex;
      setActiveIndex(targetIndex);
      // 使用 setTimeout 确保DOM已渲染完成
      setTimeout(() => scrollToIndex(targetIndex), 0);
    }
  }, [currentMargin, arr]);

  // 组件挂载时滚动到初始位置
  useEffect(() => {
    // 使用 setTimeout 确保DOM已渲染完成
    setTimeout(() => scrollToIndex(activeIndexRef.current), 0);
  }, []);

  // 滚动到指定索引的元素
  const scrollToIndex = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const item = container.querySelector<HTMLDivElement>(
      `[data-index="${index}"]`
    );
    if (item) {
      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      // 计算滚动位置，使选中的元素居中
      const scrollLeft =
        container.scrollLeft +
        (itemRect.left - containerRect.left) -
        containerRect.width / 2 +
        itemRect.width / 2;

      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  // 振动反馈函数
  const triggerVibration = () => {
    // 清除之前的计时器
    if (vibrateTimeoutRef.current) {
      clearTimeout(vibrateTimeoutRef.current);
    }

    // 只有在支持振动API且数值变化时才触发振动
    if (navigator.vibrate) {
      // 短振动，模拟滚轮的段落感
      navigator.vibrate(10);

      // 设置防抖，避免连续振动
      vibrateTimeoutRef.current = setTimeout(() => {
        vibrateTimeoutRef.current = null;
      }, 50);
    }
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (!scrollContainer) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerCenter = containerRect.left + containerWidth / 2;

      const centerZoneWidth = containerWidth / 3;
      const centerZoneLeft = containerCenter - centerZoneWidth / 2;
      const centerZoneRight = containerCenter + centerZoneWidth / 2;

      const items =
        scrollContainer.querySelectorAll<HTMLDivElement>("[data-number-item]");

      let newActiveIndex = -1;
      items.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.left + itemRect.width / 2;

        if (itemCenter >= centerZoneLeft && itemCenter <= centerZoneRight) {
          newActiveIndex = parseInt(item.dataset.index || "0", 10);
        }
      });

      if (newActiveIndex !== -1 && newActiveIndex !== activeIndexRef.current) {
        // 当选中项变化时触发振动
        triggerVibration();
        activeIndexRef.current = newActiveIndex;
        setActiveIndex(newActiveIndex);
        onMarginChange(arr[newActiveIndex]);
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);

    // 移除初始检查，避免在未滚动到正确位置时触发错误的更新
    // handleScroll();

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      // 清除计时器
      if (vibrateTimeoutRef.current) {
        clearTimeout(vibrateTimeoutRef.current);
      }
    };
  }, [arr, onMarginChange]);

  return (
    <div className="h-20 w-52 relative">
      {/* 左侧渐变遮罩 */}
      <div className="absolute -left-[2px] top-0 bottom-0 w-10 bg-linear-to-r from-[#1c1c1e] to-transparent z-10 pointer-events-none"></div>

      {/* 右侧渐变遮罩 */}
      <div className="absolute -right-[2px] top-0 bottom-0 w-10 bg-linear-to-l from-[#1c1c1e] to-transparent z-10 pointer-events-none"></div>

      {/* 中间指示器（可选）
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600 -translate-x-1/2 z-5"></div> */}

      <div
        ref={scrollContainerRef}
        className="h-full flex items-center overflow-x-auto scrollbar-hide space-x-2 px-2 relative z-0"
        onTouchStart={() => {
          if (navigator.vibrate) navigator.vibrate(1);
        }}
      >
        {arr.map((num, index) => (
          <div
            key={num}
            data-number-item
            data-index={index}
            className={`size-10 shrink-0 flex items-center justify-center text-center text-base transition-all duration-200 rounded-full select-none pointer-events-auto ${
              index === activeIndex
                ? "scale-130 bg-gray-500 text-white shadow-lg"
                : "scale-90 bg-gray-700 text-gray-200 hover:bg-gray-600 hover:scale-95"
            }`}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};

function FormulaBox({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center border border-gray-600 rounded-xl py-1 h-16 bg-[#2c2c2e]/50 ${width}`}
    >
      <span className="text-base text-gray-300 font-bold mb-0.5">{label}</span>
      <span className="text-sm text-white font-bold truncate px-1 w-full text-center">
        {value}
      </span>
    </div>
  );
}

function KeypadButton({
  label,
  onClick,
  fontSize = "text-2xl",
  isSpecial = false,
}: {
  label: string;
  onClick: () => void;
  fontSize?: string;
  isSpecial?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-16 rounded-2xl ${fontSize} font-bold text-white transition-all duration-200 flex items-center justify-center select-none touch-manipulation shadow-sm cursor-pointer
        ${
          isSpecial
            ? "bg-[#ff3b30] hover:bg-[#ff453a] active:bg-[#ff2d22] active:scale-95 hover:scale-105"
            : "bg-[#3a3a3c] hover:bg-[#444446] active:bg-[#4a4a4c] active:scale-95 hover:scale-105"
        }`}
    >
      {label}
    </button>
  );
}