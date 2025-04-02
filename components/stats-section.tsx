"use client"

import { motion } from "framer-motion"
import { Users, TrendingUp, BarChart, Clock } from "lucide-react"

export function StatsSection() {
  const stats = [
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      value: "10,000+",
      label: "Active Users",
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
      value: "$25M+",
      label: "Trading Volume",
    },
    {
      icon: <BarChart className="h-6 w-6 text-primary" />,
      value: "18.7%",
      label: "Avg. Monthly Return",
    },
    {
      icon: <Clock className="h-6 w-6 text-primary" />,
      value: "24/7",
      label: "Bot Uptime",
    },
  ]

  return (
    <section className="w-full py-12 md:py-24 bg-base-100 border-y border-base-300">
      <div className="container px-4 md:px-6">
        <motion.div
          className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center justify-center space-y-2 rounded-lg bg-base-200 p-4 text-center shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">{stat.icon}</div>
              <div className="text-2xl font-bold text-base-content">{stat.value}</div>
              <div className="text-sm text-base-content/70">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

