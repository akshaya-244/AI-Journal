'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, ChangeEvent, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { motion } from "framer-motion"

export default function Session() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [journalEntry, setJournalEntry] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [open, setOpen] = useState(false);


  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setJournalEntry(text)
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
  }

  const handleSave = async () => {
    if (!journalEntry.trim()) {
      alert('Please write something before saving!')
      return
    }

    try {
      // Use the user's Google ID as the user_id
      const userId = session.user?.email // Use email as fallback since we need a string
      
      if (!userId) {
        alert('User not found. Please try logging in again.')
        return
      }

      console.log('Saving entry for user:', userId)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ai-journal-api.akshayamohan-2401.workers.dev'}/session/${userId}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: journalEntry,
          timestamp: Date.now()
        }),
      })

      const result = await response.json()
      console.log('Save response:', result)

      if (response.ok && result.success) {
        alert('Entry saved successfully! ✨')
        setJournalEntry('')
        setWordCount(0)
      } else {
        throw new Error(result.error || 'Failed to save entry')
      }
    } catch (error) {
      console.error('Error saving entry:', error)
      alert(`Failed to save entry: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  return (
    <div className='min-h-screen min-w-screen'>
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6">

      <div className="relative inline-block" ref={dropdownRef}>
      {/* Arrow */}
      <ArrowLeft
        onClick={() => setOpen((prev) => !prev)}
        className="text-white w-6 h-6 cursor-pointer mb-2"
      />

      {/* Animated dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute  bg-slate-800 text-white flex flex-col rounded-md shadow-lg p-2"
          >
            <Button className="text-white" variant="link">
                <Link href='/query_my_logs'>
                    Back to Logs
                </Link>
            </Button>
            <Button className="text-white z-20" variant="link">
                <Link href='/'>
                    Back to Home
                </Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
        <div className="flex gap-4 items-center">
          <span className="text-white">Welcome, {session.user?.name}</span>
          <Button
            onClick={handleSave}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Save Entry
          </Button>
        </div>
      </nav>

      {/* Notebook */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Notebook Cover */}
          <div className="bg-gradient-to-r from-amber-100 to-amber-50 p-6 border-b-2 border-amber-200">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-amber-800">My Journal</h1>
              <div className="text-sm text-amber-700">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>

          {/* Notebook Page */}
          <div className="p-8 bg-gradient-to-b from-white to-amber-50">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-amber-200">
             
              <div className="text-sm text-amber-600">
                Page 1
              </div>
            </div>

            {/* Writing Area */}
            <div className="relative">
              {/* Notebook Lines */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-100/30 to-transparent bg-[length:100%_32px] pointer-events-none"></div>
              
              {/* Textarea */}
              <textarea
                value={journalEntry}
                onChange={handleTextChange}
                placeholder="What's on your mind today? Let your thoughts flow freely... ✨"
                className="w-full h-96 p-6 bg-transparent text-gray-800 text-lg leading-8 resize-none focus:outline-none font-handwriting"
                style={{
                  fontFamily: '"Kalam", cursive',
                  lineHeight: '2rem'
                }}
              />
            </div>

            {/* Page Footer */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-amber-200 text-sm text-amber-600">
              <div>
                <span className="font-medium">{wordCount}</span> words
              </div>
              <div className="flex items-center gap-2">
                <span>✨</span>
                <span>Mindful Journaling</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}