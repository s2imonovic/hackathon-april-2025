import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers';

export const metadata: Metadata = {
  title: 'ZetaHopper',
  description: 'Onchain trading bot for Zetachain',
  openGraph: {
    title: 'ZetaHopper',
    description: 'Onchain trading bot for Zetachain',
    url: 'https://zeta-hopper.vercel.app/',
    siteName: 'ZetaHopper',
    images: [
      {
        url: 'https://zeta-hopper.vercel.app/thumbnail_zetahopper.webp',
        width: 1024,
        height: 533,
        alt: 'ZetaHopper Preview',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZetaHopper',
    description: 'Onchain trading bot for Zetachain',
    images: ['https://zeta-hopper.vercel.app/thumbnail_zetahopper.webp'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
