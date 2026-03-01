import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'EduConnect — O\'qituvchi-Talaba Chat Platformasi',
  description: 'Ta\'lim muhitida o\'qituvchi-talaba muloqotini ta\'minlovchi real-time web-chat platformasi',
  keywords: 'ta\'lim, chat, o\'qituvchi, talaba, real-time',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Nunito:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  fontFamily: 'Nunito, sans-serif',
                  borderRadius: '12px',
                  fontSize: '14px',
                },
                success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
                error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
