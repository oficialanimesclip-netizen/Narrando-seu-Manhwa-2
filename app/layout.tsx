import './globals.css'
export const metadata = { title: 'Narrando Seu Manhwa', description: 'Portal oficial' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
