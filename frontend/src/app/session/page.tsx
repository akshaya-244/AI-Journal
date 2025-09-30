'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Session {
  user: {
    name: string;
    email: string;
  };
}

export default function Session() {
  const [journalEntry, setJournalEntry] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('journal-user');
    if (savedUser) {
      setSession(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    const words = journalEntry.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [journalEntry]);

  const handleSave = async () => {
    if (!journalEntry.trim()) {
      alert('Please write something before saving!');
      return;
    }

    if (!session?.user?.email) {
      alert('Please log in first!');
      return;
    }

    try {
      const userId = session.user.email;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://journal-logs.akshayamohan-2401.workers.dev'}/session/${encodeURIComponent(userId)}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: journalEntry,
          timestamp: Date.now()
        }),
      });

      const result = await response.json();
      console.log('Save response:', result);

      if (response.ok && result.success) {
        alert('Entry saved successfully! ✨');
        setJournalEntry('');
        setWordCount(0);
      } else {
        throw new Error(result.error || 'Failed to save entry');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      alert(`Failed to save entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-2xl mb-4">Please log in first</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Go to Home Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen min-w-screen'>
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6">
        <Link 
          href="/" 
          className="text-white/80 text-sm hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="text-white/80 text-sm">
          Welcome, {session.user?.name}
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-white text-3xl font-bold mb-2">Your Journal</h1>
            <p className="text-gray-300">Write about your day, thoughts, or anything on your mind</p>
          </div>

          {/* Journal Entry Area */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-6">
            <textarea
              value={journalEntry}
              onChange={(e) => setJournalEntry(e.target.value)}
              placeholder="Start writing your thoughts..."
              className="w-full h-96 bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none text-lg leading-relaxed"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center">
            <div className="text-gray-400 text-sm">
              {wordCount} words
            </div>
            <button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              Save Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
