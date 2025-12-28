'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getConfig, hasConfig } from '@/lib/config';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasConfig()) {
      router.push('/configure');
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return null;
}

