import { NextResponse } from 'next/server'
import { getScoreboard, markAbandonedGames } from '@/lib/chess-utils'

export async function GET() {
  try {
    // Mark abandoned games first (games inactive for more than 30 minutes)
    await markAbandonedGames(30)
    
    // Get scoreboard including all game types (ongoing, completed, abandoned)
    const scoreboard = await getScoreboard(true, true)
    
    return NextResponse.json(scoreboard)
  } catch (error) {
    console.error('Scoreboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch scoreboard' }, { status: 500 })
  }
} 