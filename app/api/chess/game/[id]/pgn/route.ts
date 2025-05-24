import { NextRequest, NextResponse } from 'next/server'
import { getChessGame } from '@/lib/chess-utils'
import { generatePGN } from '@/lib/chess-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
    }

    // Get game from database
    const game = await getChessGame(id)
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Generate PGN if not already stored
    let pgn = game.pgn
    if (!pgn && game.moves) {
      pgn = generatePGN(game)
    }

    if (!pgn) {
      return NextResponse.json({ error: 'PGN could not be generated for this game' }, { status: 400 })
    }

    // Return PGN as plain text
    return new Response(pgn, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="chess-game-${id}.pgn"`,
      },
    })
  } catch (error) {
    console.error('PGN API error:', error)
    return NextResponse.json({ error: 'Failed to generate PGN' }, { status: 500 })
  }
} 