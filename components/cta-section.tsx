"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Rocket } from "lucide-react"
import Link from "next/link"

export function CtaSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-primary">
      <div className="container px-4 md:px-6">
        <motion.div
          className="flex flex-col items-center justify-center space-y-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-primary-content">
              Ready to Start Trading Smarter?
            </h2>
            <p className="max-w-[900px] text-primary-content/90 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Join thousands of traders who are already using ZetaHopper to maximize their returns on Zetachain.
            </p>
          </div>
          <motion.div
            className="flex flex-col gap-2 min-[400px]:flex-row"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Button
              size="lg"
              className="bg-accent text-accent-content hover:bg-accent/90"
            >
              <Link href="/trade" className="flex items-center">
                <Rocket className="mr-2 h-4 w-4" /> Launch App
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

