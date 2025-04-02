"use client"

import { motion } from "framer-motion"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FaqSection() {
  const faqs = [
    {
      question: "How does ZetaHopper work?",
      answer: "TBD",
    },
    {
      question: "Is my investment safe with ZetaHopper?",
      answer: "TBD",
    },
    {
      question: "What are the fees for using ZetaHopper?",
      answer: "TBD",
    },
    {
      question: "What cryptocurrencies can I trade with ZetaHopper?",
      answer: "TBD",
    },
    {
      question: "How do I withdraw my funds?",
      answer: "TBD",
    },
    {
      question: "What kind of returns can I expect?",
      answer: "TBD",
    },
  ]

  return (
    <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-base-100 border-y border-base-300">
      <div className="container px-4 md:px-6">
        <motion.div
          className="flex flex-col items-center justify-center space-y-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-content">FAQ</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-base-content">
              Frequently Asked Questions
            </h2>
            <p className="max-w-[900px] text-base-content/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Everything you need to know about ZetaHopper and how it can help you trade on Zetachain.
            </p>
          </div>
        </motion.div>
        <motion.div
          className="mx-auto mt-12 max-w-3xl space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-base-300">
                <AccordionTrigger className="text-base-content hover:text-primary">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-base-content/70">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}

