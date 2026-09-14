import type { Metadata } from 'next'
import { nunito } from '@/lib/font'
import './globals.css'

export const metadata: Metadata = {
  title: 'Place Map admin',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
