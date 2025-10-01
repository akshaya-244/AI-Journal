'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, ArrowLeft, Sparkles, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatePresence } from 'framer-motion'
import { motion } from "framer-motion"

export default function QueryMyLogs() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<Array<{
    date: string;
    day: string;
    text: string;
    similarity_score?: number;
    keyword_score?: number;
    hybrid_score?: number;
  }>>([])
  const [answer, setAnswer] = useState('')
  const [showResults, setShowResults] = useState(false)
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
      <div className="starry-bg min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setResults([]) // Clear previous results
    setAnswer('')
    setShowResults(false) // Don't show results until we have them
    
    try {
      // Get user ID from session
      const userId = session?.user?.email
      if (!userId) {
        throw new Error('User not found')
      }

      // Call the search API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ai-journal-api.akshayamohan-2401.workers.dev'}/session/${encodeURIComponent(userId)}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query
        }),
      })

      const result = await response.json()
      console.log('Search response:', result)

      if (response.ok && result.success) {
        setResults(result.results)
        setAnswer(result.answer || '')
        setShowResults(true) // Only show results when we have them
      } else {
        throw new Error(result.error || 'Search failed')
      }
    } catch (error) {
      console.error('Error searching:', error)
      alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setShowResults(true) // Show results view even on error to display the error state
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewQuery = () => {
    setQuery('')
    setResults([])
    setAnswer('')
    setShowResults(false)
  }


  return (
    <div>
      {/* Navigation */}
      <nav className="min-w-screen z-10 flex justify-between items-center p-6">
  
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
                <Link href='/session'>
                    Back to Journal
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
            <span className="text-white">Welcome, {session?.user?.name}</span>
            <Button
              onClick={() => signOut()}
              className="active:scale-85 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </Button>
          </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6">
        {isLoading ? (
          /* Loading State */
          <div className="w-full max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 border border-blue-400/50 mb-6">
              <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
            </div>
            <h1 className="text-white text-3xl font-bold mb-4">Searching your memories...</h1>
            <p className="text-gray-300 text-lg">
              Finding the most relevant entries for: &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : !showResults ? (
          <>
            {/* Question Box */}
            <div className="w-full max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 border border-blue-400/50 mb-6">
                  <Search className="w-8 h-8 text-blue-400" />
                </div>
                <h1 className="text-white text-3xl font-bold mb-4">
                  What would you like to explore?
                </h1>
                <p className="text-gray-300 text-lg">
                  Ask me anything about your journal entries. I&apos;ll help you find the memories and insights you&apos;re looking for.
                </p>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask me anything about your journal entries..."
                    className="w-full pl-6 pr-12 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-lg"
                    disabled={isLoading}
                  />

                  {/* Search Icon */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Searching your memories...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Search My Journal
                    </>
                  )}
                </Button>
              </form>

              {/* Example Queries */}
              
            </div>
          </>
        ) : (
          /* Results View */
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-white text-2xl font-bold mb-2">Found {results.length} relevant entries</h2>
              <p className="text-gray-300">Here&apos;s what I found for: &ldquo;{query}&rdquo;</p>
            </div>

            {/* AI Generated Answer */}
            {answer && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-400/20 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold">AI Analysis</h3>
                </div>
                <div className="text-gray-200 leading-relaxed whitespace-pre-line">
                  {answer}
                </div>
              </div>
            )}

            <div className="space-y-4 mb-8">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-blue-400 font-semibold">{result.date}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-300">{result.day}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 text-sm font-medium">
                        {((result.similarity_score || result.keyword_score || result.hybrid_score || 0) * 100).toFixed(0)}% match
                      </span>
                    </div>
                  </div>
                  <p className="text-white leading-relaxed">{result.text}</p>
                </div>
              ))}
            </div>

            <div className="text-center py-4">
              <Button
                onClick={handleNewQuery}
                className=" active:scale-85 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 mx-auto"
              >
                <Search className="w-4 h-4" />
                Ask Another Question
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
