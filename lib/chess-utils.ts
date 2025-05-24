import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ChessGame {
  id: string
  player1: string
  player2: string
  winner: string | null
  moves: string
  moveDetails?: string
  gameState: string
  status: 'ongoing' | 'completed' | 'error' | 'abandoned'
  pgn?: string
  lichessUrl?: string
  startedAt: string
  completedAt?: string
  lastMoveAt?: string
  totalMoves: number
  isAbandoned: boolean
  errorReason?: string
}

export interface ModelStats {
  wins: number
  losses: number
  draws: number
  total: number
  ongoing: number
  abandoned: number
}

export interface Scoreboard {
  [key: string]: ModelStats
}

// Generate PGN notation from moves
export function generatePGN(game: ChessGame, player1Label?: string, player2Label?: string): string {
  const moves = JSON.parse(game.moves || '[]')
  
  // PGN header - handle invalid dates gracefully
  let date = '????-??-??'
  try {
    if (game.startedAt) {
      const startDate = new Date(game.startedAt)
      if (!isNaN(startDate.getTime())) {
        date = startDate.toISOString().split('T')[0].replace(/-/g, '.')
      }
    }
  } catch (error) {
    console.warn('Invalid startedAt date in game:', game.startedAt)
    // Use current date as fallback
    date = new Date().toISOString().split('T')[0].replace(/-/g, '.')
  }
  
  const white = player1Label || game.player1
  const black = player2Label || game.player2
  
  let result = '*' // Default to ongoing
  if (game.status === 'completed') {
    if (game.winner === 'player1') result = '1-0'
    else if (game.winner === 'player2') result = '0-1'
    else if (game.winner === 'draw') result = '1/2-1/2'
  }
  
  const headers = [
    `[Event "AI Chess Battle"]`,
    `[Site "Cerebras Demo"]`,
    `[Date "${date}"]`,
    `[Round "1"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${result}"]`,
    `[GameId "${game.id}"]`,
    `[Status "${game.status}"]`,
  ]
  
  // Add move text
  let moveText = ''
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) {
      moveText += `${Math.floor(i / 2) + 1}. `
    }
    moveText += `${moves[i]} `
  }
  
  if (result !== '*') {
    moveText += result
  }
  
  return headers.join('\n') + '\n\n' + moveText.trim()
}

// Generate Lichess analysis URL
export function generateLichessUrl(pgn: string): string {
  return `https://lichess.org/paste?pgn=${encodeURIComponent(pgn)}`
}

// Save or update a chess game in the database
export async function saveChessGame(game: Partial<ChessGame>): Promise<ChessGame> {
  const moves = JSON.parse(game.moves || '[]')
  const totalMoves = moves.length
  
  // Generate PGN if moves exist and we have enough data
  let pgn = null
  let lichessUrl = null
  
  try {
    if (totalMoves > 0 && game.id && game.player1 && game.player2) {
      // Ensure we have a valid startedAt date for PGN generation
      const gameForPGN = {
        ...game,
        startedAt: game.startedAt || new Date().toISOString(),
      } as ChessGame
      
      pgn = generatePGN(gameForPGN)
      lichessUrl = generateLichessUrl(pgn)
    }
  } catch (error) {
    console.warn('Failed to generate PGN for game:', game.id, error)
    // Continue without PGN
  }
  
  const savedGame = await prisma.chessGame.upsert({
    where: { id: game.id || 'new' },
    update: {
      moves: game.moves,
      moveDetails: game.moveDetails,
      gameState: game.gameState,
      status: game.status,
      winner: game.winner,
      completedAt: game.status === 'completed' ? new Date() : game.completedAt ? new Date(game.completedAt) : null,
      lastMoveAt: totalMoves > 0 ? new Date() : null,
      totalMoves,
      isAbandoned: game.status === 'abandoned',
      errorReason: game.errorReason,
      pgn,
      lichessUrl,
    },
    create: {
      id: game.id || undefined,
      player1: game.player1!,
      player2: game.player2!,
      moves: game.moves || '[]',
      moveDetails: game.moveDetails,
      gameState: game.gameState!,
      status: game.status || 'ongoing',
      winner: game.winner,
      startedAt: game.startedAt ? new Date(game.startedAt) : new Date(),
      completedAt: game.status === 'completed' ? new Date() : null,
      lastMoveAt: totalMoves > 0 ? new Date() : null,
      totalMoves,
      isAbandoned: game.status === 'abandoned',
      errorReason: game.errorReason,
      pgn,
      lichessUrl,
    },
  })
  
  return {
    ...savedGame,
    startedAt: savedGame.startedAt.toISOString(),
    completedAt: savedGame.completedAt?.toISOString(),
    lastMoveAt: savedGame.lastMoveAt?.toISOString(),
  } as ChessGame
}

// Get a chess game by ID
export async function getChessGame(id: string): Promise<ChessGame | null> {
  const game = await prisma.chessGame.findUnique({
    where: { id },
  })
  
  if (!game) return null
  
  return {
    ...game,
    startedAt: game.startedAt.toISOString(),
    completedAt: game.completedAt?.toISOString(),
    lastMoveAt: game.lastMoveAt?.toISOString(),
  } as ChessGame
}

// Get all chess games with optional filtering
export async function getChessGames(includeOngoing = true, includeAbandoned = true, limit?: number): Promise<ChessGame[]> {
  const where: any = {}
  
  if (!includeOngoing && !includeAbandoned) {
    where.status = 'completed'
  } else if (!includeOngoing) {
    where.status = { in: ['completed', 'abandoned', 'error'] }
  } else if (!includeAbandoned) {
    where.status = { in: ['completed', 'ongoing'] }
  }
  
  const games = await prisma.chessGame.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
  
  return games.map((game: any) => ({
    ...game,
    startedAt: game.startedAt.toISOString(),
    completedAt: game.completedAt?.toISOString(),
    lastMoveAt: game.lastMoveAt?.toISOString(),
  })) as ChessGame[]
}

// Calculate scoreboard from all games
export async function getScoreboard(includeOngoing = true, includeAbandoned = true): Promise<Scoreboard> {
  const games = await getChessGames(includeOngoing, includeAbandoned)
  
  const scoreboard: Scoreboard = {}

  games.forEach((game: ChessGame) => {
    // Initialize players if not exists
    if (!scoreboard[game.player1]) {
      scoreboard[game.player1] = { wins: 0, losses: 0, draws: 0, total: 0, ongoing: 0, abandoned: 0 }
    }
    if (!scoreboard[game.player2]) {
      scoreboard[game.player2] = { wins: 0, losses: 0, draws: 0, total: 0, ongoing: 0, abandoned: 0 }
    }

    // Update stats based on game status
    if (game.status === 'ongoing') {
      scoreboard[game.player1].ongoing++
      scoreboard[game.player2].ongoing++
    } else if (game.status === 'abandoned' || game.status === 'error') {
      scoreboard[game.player1].abandoned++
      scoreboard[game.player2].abandoned++
    }
    
    // Count all games in total
    scoreboard[game.player1].total++
    scoreboard[game.player2].total++

    // Only count wins/losses/draws for completed games
    if (game.status === 'completed') {
      if (game.winner === 'draw') {
        scoreboard[game.player1].draws++
        scoreboard[game.player2].draws++
      } else if (game.winner === 'player1') {
        scoreboard[game.player1].wins++
        scoreboard[game.player2].losses++
      } else if (game.winner === 'player2') {
        scoreboard[game.player2].wins++
        scoreboard[game.player1].losses++
      }
    }
  })

  return scoreboard
}

// Mark games as abandoned if they've been inactive for too long
export async function markAbandonedGames(timeoutMinutes = 30): Promise<number> {
  const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000)
  
  const abandonedCount = await prisma.chessGame.updateMany({
    where: {
      status: 'ongoing',
      OR: [
        { lastMoveAt: { lt: cutoffTime } },
        { AND: [{ lastMoveAt: null }, { startedAt: { lt: cutoffTime } }] }
      ]
    },
    data: {
      status: 'abandoned',
      isAbandoned: true,
      errorReason: `Game abandoned after ${timeoutMinutes} minutes of inactivity`,
    },
  })
  
  return abandonedCount.count
}

export default prisma 