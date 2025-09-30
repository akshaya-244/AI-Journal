import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { text, timestamp } = await request.json()
    const { userId } = await params

    // Simplified payload - just text and timestamp
    // User authentication is handled separately via /auth/login
    const payload = {
      text,
      timestamp
    }
    
    console.log('Final payload:', payload)

    // Call your Cloudflare Workers API
    const apiUrl = `${process.env.API_BASE_URL || 'http://localhost:8787'}/session/${userId}/add`
    console.log('Calling backend API:', apiUrl)
    console.log('Payload:', payload)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('Backend response status:', response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log('Backend response:', result)
      return NextResponse.json({ success: true })
    } else {
      const errorText = await response.text()
      console.error('Backend error response:', errorText)
      throw new Error(`Backend error: ${response.status} - ${errorText}`)
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to save entry' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // Call your Cloudflare Workers API
    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8787'}/session/${userId}/entries`)

    if (response.ok) {
      const entries = await response.json()
      return NextResponse.json(entries)
    } else {
      throw new Error('Failed to fetch entries')
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    )
  }
}
