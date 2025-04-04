'use client'; // Need client component for hooks

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient'; // Adjusted path

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.replace('/dashboard'); // Use replace to avoid adding to history
      } else {
        router.replace('/login'); // Redirect to login if no session
      }
    };

    checkSessionAndRedirect();
  }, [router]);

  // Render a loading state or null while checking the session
  // This prevents flashing the login/register components briefly
  return <div>Loading...</div>; // Or a more sophisticated loading indicator
}
