import { NextRequest, NextResponse } from 'next/server'
import { getChessGame } from '@/lib/chess-utils'

// Get the shared activeGames from the start route
const getActiveGames = () => {
  if (typeof global !== 'undefined' && (global as any).chessActiveGames) {
    return (global as any).chessActiveGames
  }
  // Fallback for development
  return new Map<string, any>()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
    }

    // Try to get game from database first
    let game = await getChessGame(id)
    
    // If not found in database, check active games (for very recent games)
    if (!game) {
      const activeGames = getActiveGames()
      const activeGame = activeGames.get(id)
      if (activeGame) {
        // Convert active game format to match database format
        game = {
          ...activeGame,
          totalMoves: JSON.parse(activeGame.moves || '[]').length,
          isAbandoned: activeGame.status === 'abandoned',
        }
      }
    }
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    return NextResponse.json(game)
  } catch (error) {
    console.error('Game status API error:', error)
    return NextResponse.json({ error: 'Failed to fetch game status' }, { status: 500 })
  }
} 