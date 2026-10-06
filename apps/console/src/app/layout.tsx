import '@site/design/styles.css';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@site/ui';
export const metadata = { title: 'حساب و مدیریت | روزنه', robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{const t=localStorage.getItem('city-perspectives:theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch{document.documentElement.dataset.theme='dark'}",
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          رفتن به محتوا
        </a>
        <div className="site-shell">
          <header className="site-header">
            <a href="/" className="brand">
              روزنه
              <span className="brand-dot" />
            </a>
            <ThemeToggle />
          </header>
          <main id="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
