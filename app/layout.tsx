import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

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
    'Interfaz conversacional de ELARA con streaming en tiempo real, generación de código, visor responsivo de index.html e acceso con tu cuenta de Novvin.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="h-full bg-[#F7F8FC] text-[#292D47] font-sans selection:bg-[#6654D9]/30 selection:text-[#292D47]">
        {children}
      </body>
    </html>
  );
}
