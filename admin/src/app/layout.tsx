import type { Metadata } from 'next'
import { THEME_SCRIPT } from '@/components/theme-toggle'
import { fontVariables } from '@/lib/font'
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
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      {/* suppressHydrationWarning for the same reason as <html> and <body>:
          extensions write attributes onto <head> too, and this element now
          exists in our tree, so React compares it during hydration. */}
      <head suppressHydrationWarning>
        {/* Applies a saved light/dark choice before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
