"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Spotlight({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <motion.div
        animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-1/3 left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--sage) 38%, transparent) 0%, color-mix(in srgb, var(--sage) 8%, transparent) 45%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <motion.div
        animate={{ x: [0, -18, 0], y: [0, 14, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4 h-[45vh] w-[45vh] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--clay) 30%, transparent) 0%, transparent 65%)",
          filter: "blur(50px)",
        }}
      />
    </motion.div>
  );
}
