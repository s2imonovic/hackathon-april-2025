"use client"

import { motion } from "framer-motion"
import { Bot, Shield, Zap, BarChart3, Clock, Coins } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: <Bot className="h-10 w-10 text-primary" />,
      title: "Automated Trading",
      description: "Our bot handles all trading operations automatically with no manual intervention required.",
    },
    {
      icon: <Shield className="h-10 w-10 text-primary" />,
      title: "Secure On-Chain",
      description: "All transactions happen directly on Zetachain with full transparency and security.",
    },
    {
      icon: <Coins className="h-10 w-10 text-primary" />,
      title: "Multi-Asset Support",
      description: "Trade across multiple tokens and pairs on Zetachain's ecosystem.",
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-base-200">
      <div className="container px-4 md:px-6">
        <motion.div
          className="flex flex-col items-center justify-center space-y-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-content">Features</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-base-content">
              Why ZetaHopper?
            </h2>
            <p className="max-w-[900px] text-base-content/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Our cutting-edge trading bot operates entirely on-chain, ensuring unmatched security and eliminating the need for external infrastructure. With multi-chain support, ZetaHopper empowers you to trade seamlessly across multiple blockchain networks.
            </p>
          </div>
        </motion.div>
        <motion.div
          className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center space-y-4 rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm transition-all hover:shadow-md"
              variants={itemVariants}
            >
              <div className="rounded-full bg-base-200 p-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-base-content">{feature.title}</h3>
              <p className="text-center text-base-content/70">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

