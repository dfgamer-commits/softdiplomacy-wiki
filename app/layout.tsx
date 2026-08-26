import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const bodyFont = Inter({
  variable: '--font-body',
  subsets: ['latin'],
});

const displayFont = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SoftDiplomacy Wiki',
  description:
    'OpenFront knowledge with the SoftDiplomacy airport and air-unit expansion documented in one place.',
  applicationName: 'SoftDiplomacy Wiki',
  openGraph: {
    title: 'SoftDiplomacy Wiki',
    description:
      'Base OpenFront mechanics, plus complete SoftDiplomacy air-unit documentation.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
