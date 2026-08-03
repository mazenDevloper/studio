
import { redirect } from 'next/navigation';

/**
 * Sovereign Entry Point - Automatic Media Redirect
 * Redirects to /media while keeping /dashboard available in the dock.
 */
export default function Home() {
  redirect('/media');
}
