import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { query } = await request.json()
    const { userId } = await params

    // Call your Cloudflare Workers API
    const apiUrl = `${process.env.API_BASE_URL || 'http://localhost:8787'}/session/${userId}/search`
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query
      }),
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json(result)
    } else {
      const errorText = await response.text()
      throw new Error(`Backend error: ${response.status} - ${errorText}`)
    }
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
