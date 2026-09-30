import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'The Chinese Wala — Restaurant OS',description:'Restaurant management system for The Chinese Wala'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}