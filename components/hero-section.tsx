"use client"
import { motion } from "framer-motion"
import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  return (
    <section id="home" className="pt-2 w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-base-100">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <motion.div
            className="flex flex-col justify-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-2">
              <motion.div
                className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Introducing ZetaHopper
              </motion.div>
              <motion.h1
                className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-base-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Automated On-Chain Trading <span className="text-accent">Made Simple</span>
              </motion.h1>
              <motion.p
                className="max-w-[600px] text-base-content/80 md:text-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                We harnessed the power of ZetaChain's crosschain architecture to create a truly autonomous range trading system.
              </motion.p>
            </div>
            <motion.div
              className="flex flex-col gap-2 min-[400px]:flex-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Link href="/trade">
                <Button
                  size="lg"
                  className="bg-primary text-primary-content hover:bg-primary/90 px-8 py-4 text-lg"
                >
                  Start Trading <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="relative h-[350px] w-[350px] sm:h-[400px] sm:w-[400px] lg:h-[500px] lg:w-[500px]">
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-secondary opacity-20 blur-3xl"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.2, 0.3, 0.2],
                }}
                transition={{
                  duration: 5,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
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
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

