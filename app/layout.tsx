import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['cyrillic', 'latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://forme-fitness-content-os.evgenyrsk7.chatgpt.site'),
  title: 'Forme — научный редактор фитнес-контента',
  description: 'От научного вопроса до понятного и точного контента.',
  icons: {
    icon: [{ url: '/meta-app-icon.svg', type: 'image/svg+xml' }],
    apple: '/meta-app-icon.png',
  },
  openGraph: {
    title: 'Forme — Fitness Content OS',
    description: 'Из научного вопроса — в точный контент.',
    images: [{ url: '/og.png', width: 1730, height: 909, alt: 'Forme — Fitness Content OS' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forme — Fitness Content OS',
    description: 'Из научного вопроса — в точный контент.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={manrope.variable}>{children}</body>
    </html>
  );
}
