"use client";

import * as React from "react";
import { motion, animate } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type DonutProps = { used: number; remaining: number; total: number };

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function CreditDonut({ used, remaining, total }: DonutProps) {
  const safeUsed = Math.max(Number(used) || 0, 0);
  const safeRemainingProp = Math.max(Number(remaining) || 0, 0);
  const safeTotal = Math.max(Number(total) || safeUsed + safeRemainingProp, 0);
  const safeRemaining =
    safeRemainingProp > 0 ? safeRemainingProp : Math.max(safeTotal - safeUsed, 0);

  const [activeMetric, setActiveMetric] =
    React.useState<"used" | "remaining">("used");

  const initialTarget = activeMetric === "used" ? safeUsed : safeRemaining;
  const [fillValue, setFillValue] = React.useState<number>(initialTarget);

  const FILL_FROM_ZERO = true;

  React.useEffect(() => {
    const target = activeMetric === "used" ? safeUsed : safeRemaining;
    const from = FILL_FROM_ZERO ? 0 : fillValue;
    const controls = animate(from, target, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setFillValue(latest),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMetric, safeUsed, safeRemaining]);

  const blueSlice = Math.min(Math.max(fillValue, 0), safeTotal);
  const graySlice = Math.max(safeTotal - blueSlice, 0);

  const data =
    activeMetric === "used"
      ? [
          { name: "Used", value: blueSlice },
          { name: "Remaining", value: graySlice },
        ]
      : [
          { name: "Used", value: graySlice },
          { name: "Remaining", value: blueSlice },
        ];

  const COLORS = ["#0ea5e9", "#e2e8f0"];
  const centerValue = Math.round(blueSlice);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={cardVariants}
      className="h-full w-full bg-white rounded-3xl border border-neutral-900/10 p-5"
    >
      <div className="flex items-center justify-between h-12">
        <h3 className="text-sky-500 text-base md:text-lg font-extrabold">
          Credit Information
        </h3>

        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveMetric("used")}
            aria-pressed={activeMetric === "used"}
            className={`px-2 py-0.5 rounded-md font-medium transition ${
              activeMetric === "used"
                ? "bg-sky-500 text-white"
                : "bg-slate-100 text-slate-900"
            }`}
          >
            Used
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("remaining")}
            aria-pressed={activeMetric === "remaining"}
            className={`px-2 py-0.5 rounded-md font-medium transition ${
              activeMetric === "remaining"
                ? "bg-sky-500 text-white"
                : "bg-slate-100 text-slate-900"
            }`}
          >
            Remaining
          </button>
        </div>
      </div>

      <div className="mt-1 flex flex-col items-center gap-2">
        <div className="w-48 h-48 md:w-52 md:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cy="50%"
                cx="50%"
                innerRadius={54}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive={false}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="-mt-32 md:-mt-36 text-slate-900 text-2xl md:text-3xl font-extrabold select-none">
          {centerValue}
        </div>

        <div className="mt-24 md:mt-28 w-full max-w-xs">
          <div className="flex items-center gap-2 p-0.5 text-xs">
            <span className="w-2.5 h-2.5 bg-sky-500 rounded-sm" />
            <span className="text-slate-800">Total Credits</span>
            <span className="ml-auto text-slate-900 font-bold">{safeTotal}</span>
          </div>
          <div className="flex items-center gap-2 p-0.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: activeMetric === "used" ? COLORS[0] : COLORS[1],
              }}
            />
            <span className="text-slate-800">Used Credits</span>
            <span className="ml-auto text-slate-900 font-bold">{safeUsed}</span>
          </div>
          <div className="flex items-center gap-2 p-0.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor:
                  activeMetric === "remaining" ? COLORS[0] : COLORS[1],
              }}
            />
            <span className="text-slate-800">Remaining Credits</span>
            <span className="ml-auto text-slate-900 font-bold">
              {safeRemaining}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
