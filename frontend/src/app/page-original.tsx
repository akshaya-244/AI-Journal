'use client'

import AuthButton from '@/components/AuthButton';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div >
      {/* Navigation - only show when logged in */}
      {session && (
        <nav className="flex justify-end py-4 px-6" >
          <div className="flex gap-4 items-center">
            <span className="text-white">Welcome, {session.user?.name}</span>
            <Button
              onClick={() => signOut()}
              className="active:scale-85 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </Button>
          </div>
         
        </nav>
      )}
      
      {/* Your content will go here */}
      <div className="relative z-10 flex flex-col items-center justify-center min-w-screen min-h-[calc(100vh-120px)]">
        <h1 className="text-white text-4xl font-bold mb-8">AI Journal</h1>
      
      {/* Feature sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Night Journaling */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/50">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 111 11.21 3 7 7 0 0021 12.79z" />
            </svg>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Night Journaling</h3>
          <p className="text-gray-300 text-sm">Capture thoughts under the stars.</p>
        </div>

        {/* Dream Tracking */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-400/50">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Dream Tracking</h3>
          <p className="text-gray-300 text-sm">Unravel the mysteries of sleep.</p>
        </div>

        {/* AI Insights */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-400/50">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">AI Insights</h3>
          <p className="text-gray-300 text-sm">Discover patterns and clarity.</p>
        </div>
      </div>

      {/* Auth Button - shows login or start journaling based on auth state */}
      <AuthButton />
    </div>
  </div>
  );
}
