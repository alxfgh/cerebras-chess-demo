import { NextRequest, NextResponse } from 'next/server'
import { getChessGames, markAbandonedGames } from '@/lib/chess-utils'

export async function GET(request: NextRequest) {
  try {
    // Mark abandoned games first (games inactive for more than 30 minutes)
    await markAbandonedGames(30)
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const includeOngoing = searchParams.get('includeOngoing') !== 'false'
    const includeAbandoned = searchParams.get('includeAbandoned') !== 'false'
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    
    // Get all games with filtering
    const allGames = await getChessGames(includeOngoing, includeAbandoned, limit)
    
    return NextResponse.json(allGames)
  } catch (error) {
    console.error('Games API error:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
} 