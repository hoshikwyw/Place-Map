import type { Metadata } from 'next'
import { nunito } from '@/lib/font'
import './globals.css'

export const metadata: Metadata = {
  title: 'Place Map admin',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (colour pickers, document
    // viewers, password managers) write attributes onto <html> and <body>
    // before React hydrates. It covers only these two elements' own attributes,
    // never their children, so a real mismatch inside the page is still reported.
    <html lang="en" className={nunito.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
