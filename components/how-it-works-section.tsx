"use client"

import { motion } from "framer-motion"
import { Wallet, Bot, BarChart3, ArrowRight } from "lucide-react"

export function HowItWorksSection() {
  const steps = [
    {
      icon: <Wallet className="h-10 w-10 text-primary" />,
      title: "Connect Wallet",
      description: "Connect your wallet to ZetaHopper securely with just a few clicks.",
    },
    {
      icon: <Bot className="h-10 w-10 text-primary" />,
      title: "Set Trading Range",
      description: "Specify how much you want to trade inside your range, and let the smart contracts do the rest.",
    },
    {
      icon: <BarChart3 className="h-10 w-10 text-primary" />,
      title: "Monitor Performance",
      description: "Track your trading performance in real-time through our intuitive dashboard.",
    },
  ]

  return (
    <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-base-100">
      <div className="container px-4 md:px-6">
        <motion.div
          className="flex flex-col items-center justify-center space-y-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-content">
              Simple Process
            </div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-base-content">How ZetaHopper Works</h2>
            <p className="max-w-[900px] text-base-content/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Get started with ZetaHopper in just three simple steps and let the smart contracts do the heavy lifting.
            </p>
          </div>
        </motion.div>
        <div className="mx-auto mt-12 max-w-5xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative flex flex-col items-center space-y-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {step.icon}
                </div>

                {/* Only show connector line between steps (not after the last step) */}
                {index < steps.length - 1 && (
                  <div className="absolute top-8 left-full hidden h-0.5 w-full -translate-y-1/2 bg-primary/30 md:block" />
                )}

                {/* Only show arrow between steps (not after the last step) */}
                {index < steps.length - 1 && (
                  <div className="absolute top-8 left-[calc(100%+1rem)] hidden -translate-y-1/2 text-primary md:block">
                    <ArrowRight className="h-8 w-8" />
                  </div>
                )}

                <h3 className="text-xl font-bold text-base-content">{step.title}</h3>
                <p className="text-center text-base-content/70">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

