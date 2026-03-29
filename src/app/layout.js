import './globals.css'
import { AuthProvider } from '../context/AuthContext'

export const metadata = {
  title: 'Sistem Penagihan Air',
  description: 'Water Billing and Payment System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
