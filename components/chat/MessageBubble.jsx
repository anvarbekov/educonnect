'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="flex flex-col items-center gap-4">
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
            <span style={{ color: 'white', fontSize: 22, fontWeight: 900 }}>E</span>
          </div>
          <span className="loading loading-dots loading-md text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-base-100 overflow-hidden">
      <Sidebar />
      {/*
        On mobile, the hamburger button is fixed at top-left (64px tall area).
        We add pt-16 on mobile to push content below the hamburger.
        The Sidebar itself handles its own overlay.
      */}
      <main className="flex-1 overflow-hidden flex flex-col lg:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}