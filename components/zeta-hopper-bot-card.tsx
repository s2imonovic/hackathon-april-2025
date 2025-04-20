"use client"
import { motion } from "framer-motion"
import { Zap } from "lucide-react"

export function ZetaHopperBotCard() {
  return (
    <motion.div
      className="rounded-xl bg-base-200 p-6 shadow-lg border border-base-300"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-accent" />
          <span className="font-bold text-base-content">ZetaHopper Bot</span>
        </div>
        <div className="flex space-x-1">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <div className="h-2 w-2 rounded-full bg-success animate-pulse delay-75" />
          <div className="h-2 w-2 rounded-full bg-success animate-pulse delay-150" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-base-content/70">Current Position</div>
          <div className="text-xl font-bold text-base-content">
            +12.4% <span className="text-success text-sm">↑</span>
          </div>
        </div>
        <div className="h-24 w-full bg-base-300 rounded-md overflow-hidden">
          <svg viewBox="0 0 100 20" className="w-full h-full">
            <path d="M0,10 Q30,5 50,10 T100,10" fill="none" stroke="#34EEB6" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-base-300 p-2">
            <div className="text-xs text-base-content/70">24h Volume</div>
            <div className="text-sm font-medium text-base-content">$1.2M</div>
          </div>
          <div className="rounded-md bg-base-300 p-2">
            <div className="text-xs text-base-content/70">Trades</div>
            <div className="text-sm font-medium text-base-content">142</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 