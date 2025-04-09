"use client"

import React, { useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ExperimentalDisclaimerProps {
  title: string
  content: React.ReactNode
  backLink?: string
}

export const ExperimentalDisclaimer: React.FC<ExperimentalDisclaimerProps> = ({
  title,
  content,
  backLink = "/"
}) => {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        router.push(backLink)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [router, backLink])

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container max-w-3xl mx-auto py-12 px-4">
        <Card ref={cardRef} className="bg-base-200 border-base-300">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">{title}</CardTitle>
            <CardDescription className="text-white/70">
              Last updated: {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-invert max-w-none text-white 
              [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:pl-2 [&>ul>li]:ml-2 [&>ul>li]:marker:text-white/70
              [&>ol]:list-decimal [&>ol]:pl-6 [&>ol>li]:pl-2 [&>ol>li]:ml-2 [&>ol>li]:marker:text-white/70
              [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-4 [&>h2]:text-white">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <h3 className="text-yellow-500 font-semibold mb-2">⚠️ Experimental Product Notice</h3>
                <p className="text-white/90">
                  This application is an experimental product developed during a hackathon. It is provided "as is" without any warranties or guarantees of any kind.
                </p>
              </div>
              {content}
            </div>
            <div className="flex justify-end pt-4">
              <Link href={backLink}>
                <Button variant="outline" className="text-black border-white hover:bg-white/10 hover:text-white">Back</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 