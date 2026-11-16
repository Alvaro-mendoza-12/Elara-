import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { APPEARANCE_BOOTSTRAP } from '@/lib/appearance';

const sans = Plus_Jakarta_Sans({
  variable: '--font-elara-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  variable: '--font-elara-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Elara — Un espacio para tus ideas',
  applicationName: 'Elara',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
  description:
    'Interfaz conversacional de ELARA con streaming en tiempo real, generación de código, visor responsivo de index.html y acceso con tu cuenta de Novvin.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP }} /></head>
      <body className="h-full bg-[var(--canvas)] text-[var(--ink)] font-sans selection:bg-[var(--accent)]/30 selection:text-[var(--ink)]">
        {children}
      </body>
    </html>
  );
}
