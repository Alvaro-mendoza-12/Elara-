import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'ELARA — Asistente de IA y Código',
  description:
    'Interfaz conversacional web de ELARA con streaming en tiempo real, generación de código y vista previa instantánea.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="h-full bg-[#0B0E14] text-[#F1F5F9] font-sans selection:bg-[#38BDF8]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
