import { NextRequest, NextResponse } from 'next/server'
import { Chess } from 'chess.js'
import { saveChessGame } from '@/lib/chess-utils'

// In-memory storage for active games (keep for real-time updates)
const activeGames = new Map<string, any>()

// Expose globally for other routes to access
if (typeof global !== 'undefined') {
  (global as any).chessActiveGames = activeGames
}

async function makeChessMove(model: string, chess: Chess, playerColor: 'white' | 'black', moveNumber: number, userApiKey?: string): Promise<{move: string, thinking: string}> {
  const currentFen = chess.fen()
  const possibleMoves = chess.moves()
  const gameHistory = chess.history()
  
  const prompt = `You are an expert chess player playing as ${playerColor}. It's move ${moveNumber} of the game.

Current position (FEN): ${currentFen}
Your possible legal moves: ${possibleMoves.join(', ')}
Game history so far: ${gameHistory.join(' ')}

Provide a detailed analysis of the position considering:
1. Material balance and piece activity
2. King safety and pawn structure  
3. Tactical opportunities (checks, captures, threats)
4. Strategic plans and positional factors
5. Your opponent's last move and potential threats
6. Candidate moves and their pros/cons

CRITICAL REQUIREMENT: You MUST end your response with your move in this EXACT format. NO EXCEPTIONS:
### MOVE ###
[move]

DO NOT include anything after the move. DO NOT add explanations after the move. 
The format "### MOVE ###" followed by your chosen move MUST be the last thing in your response.

EXAMPLE of correct response format:
Looking at the current position, I need to consider my development and central control. The pawn structure is still symmetrical, and both kings are safe. My main candidates are:

1. e4 - This controls the center and opens lines for my pieces
2. Nf3 - Develops a piece and supports central control
3. d4 - Another central pawn move

I think e4 is the strongest choice because it immediately stakes a claim in the center and allows for quick development.

### MOVE ###
e4

REMEMBER: Your move MUST be one of these legal moves: ${possibleMoves.join(', ')}
REMEMBER: You MUST end with "### MOVE ###" followed by your chosen move.
REMEMBER: Nothing should come after your move choice.

Now analyze the position and provide your move:`

  const maxRetries = 3
  let lastResponse = ''
  
  // Use user API key if provided, otherwise use server key
  const apiKey = userApiKey || process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('No OpenRouter API key available');
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Making API request to ${model} for ${playerColor} move ${moveNumber} (attempt ${attempt}/${maxRetries})`)
      
      // Parse model string to extract provider if specified
      let actualModel = model
      let provider = undefined
      
      if (model.includes(':')) {
        const parts = model.split(':')
        actualModel = parts[0]
        provider = parts[1]
      }
      
      // Try different parameters for different models
      const requestBody: any = {
        model: actualModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.8,
      }
      
      // Add provider routing if specified
      if (provider) {
        requestBody.provider = {
          order: [provider],
          allow_fallbacks: false
        }
      }
      
      // Some models might need different parameters
      if (actualModel.includes('qwen')) {
        requestBody.max_tokens = 1000
        requestBody.temperature = 0.7
      }
      
      console.log(`Request body for ${model} (attempt ${attempt}):`, JSON.stringify(requestBody, null, 2))
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3333',
          'X-Title': 'Chess Battle App',
        },
        body: JSON.stringify(requestBody),
      })

      console.log(`API response status for ${model} (attempt ${attempt}):`, response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Model ${model} request failed (attempt ${attempt}):`, errorText)
        if (attempt === maxRetries) {
          throw new Error(`Model ${model} request failed after ${maxRetries} attempts: ${response.status} - ${errorText}`)
        }
        continue // Try again
      }

      const data = await response.json()
      console.log(`API response data for ${model} (attempt ${attempt}):`, JSON.stringify(data, null, 2))
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(`Invalid response structure from ${model} (attempt ${attempt}):`, data)
        if (attempt === maxRetries) {
          throw new Error(`Invalid response structure from ${model} after ${maxRetries} attempts`)
        }
        continue // Try again
      }
      
      // Handle different response formats - some providers put content in "reasoning" field
      const messageContent = data.choices[0].message.content?.trim() || ''
      const reasoningContent = data.choices[0].message.reasoning?.trim() || ''
      const fullResponse = messageContent || reasoningContent
      
      if (!fullResponse) {
        console.error(`No content found in response from ${model} (attempt ${attempt}):`, data.choices[0].message)
        if (attempt === maxRetries) {
          throw new Error(`No content found in response from ${model} after ${maxRetries} attempts`)
        }
        continue // Try again
      }
      
      lastResponse = fullResponse
      console.log(`Response content length for ${model} (attempt ${attempt}):`, fullResponse.length)
      
      console.log(`\n=== ${model} (${playerColor}) Response (attempt ${attempt}) ===`)
      console.log(fullResponse)
      console.log('=====================================\n')
      
      // Enhanced move extraction with multiple patterns
      const extractMoveAndThinking = (response: string) => {
        console.log(`--- Parsing response (attempt ${attempt}) ---`)
        console.log('Response length:', response.length)
        console.log('Response preview:', response.substring(0, 200) + '...')
        
        // Pattern 1: ### MOVE ### format
        let moveMatch = response.match(/### MOVE ###\s*([^\n\r]+)/i)
        if (moveMatch) {
          const move = moveMatch[1].trim()
          const thinking = response.split(/### MOVE ###/i)[0].trim()
          console.log('Found ### MOVE ### pattern')
          console.log('Extracted move:', move)
          console.log('Extracted thinking length:', thinking.length)
          console.log('Thinking preview:', thinking.substring(0, 200))
          return {
            move: move,
            thinking: thinking || "Model provided a move but no analysis was included."
          }
        }
        
        // Pattern 2: [move] format (as seen in logs)
        moveMatch = response.match(/\[([a-h][1-8](?:[a-h][1-8])?[qrbn]?|[KQRBN][a-h][1-8]|O-O(?:-O)?)\]/i)
        if (moveMatch) {
          const move = moveMatch[1].trim()
          const thinking = response.replace(/\[([a-h][1-8](?:[a-h][1-8])?[qrbn]?|[KQRBN][a-h][1-8]|O-O(?:-O)?)\]/i, '').trim()
          console.log('Found [move] pattern')
          console.log('Extracted move:', move)
          console.log('Extracted thinking:', thinking.substring(0, 200))
          return {
            move: move,
            thinking: thinking || "Model provided a move in brackets but no detailed analysis."
          }
        }
        
        // Pattern 3: Look for move at the end after analysis
        const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0)
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i]
          // Check if line contains a chess move pattern
          const chessMove = line.match(/\b([a-h][1-8](?:[a-h][1-8])?[qrbn]?|[KQRBN][a-h][1-8]|O-O(?:-O)?)\b/i)
          if (chessMove && possibleMoves.includes(chessMove[1])) {
            const move = chessMove[1]
            const thinking = lines.slice(0, i).join('\n').trim()
            console.log('Found move at end pattern')
            console.log('Extracted move:', move)
            console.log('Extracted thinking:', thinking.substring(0, 200))
            return {
              move: move,
              thinking: thinking || "Model provided a move at the end but limited analysis was found."
            }
          }
        }
        
        // Pattern 3.5: Look for any valid move in the last few lines (more aggressive)
        const lastLines = lines.slice(-3).join(' ')
        for (const move of possibleMoves) {
          const escapedMove = move.replace(/[+#]$/, '') // Remove check/mate symbols
          if (lastLines.includes(escapedMove)) {
            console.log('Found move in last lines pattern')
            console.log('Extracted move:', move)
            const thinking = response.replace(new RegExp(`\\b${escapedMove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '').trim()
            return {
              move: move,
              thinking: thinking || "Model provided a move but analysis extraction was limited."
            }
          }
        }
        
        // Fallback: Use first valid move found anywhere in response
        for (const move of possibleMoves) {
          const escapedMove = move.replace(/[+#]$/, '')
          if (response.includes(escapedMove)) {
            console.log('Found move anywhere in response (fallback)')
            console.log('Extracted move:', move)
            return {
              move: move,
              thinking: response || "Move found in response but detailed analysis extraction failed."
            }
          }
        }
        
        // No valid move found - return null to trigger retry
        console.log(`No valid move found in response (attempt ${attempt})`)
        return null
      }
      
      const result = extractMoveAndThinking(fullResponse)
      
      // If we successfully extracted a valid move, return it
      if (result && possibleMoves.includes(result.move.replace(/[+#]$/, ''))) {
        console.log(`Successfully extracted move "${result.move}" on attempt ${attempt}`)
        return result
      }
      
      // If move extraction failed and we have more attempts, continue to next attempt
      if (attempt < maxRetries) {
        console.log(`Failed to extract valid move on attempt ${attempt}, retrying...`)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Brief delay before retry
        continue
      }
      
    } catch (error) {
      console.error(`Error calling model ${model} (attempt ${attempt}):`, error)
      if (attempt === maxRetries) {
        // This is the final attempt, proceed to fallback
        break
      }
      // Continue to next attempt
      await new Promise(resolve => setTimeout(resolve, 1000)) // Brief delay before retry
      continue
    }
  }
  
  // If we get here, all attempts failed - use random fallback
  console.log(`All ${maxRetries} attempts failed to extract a valid move. Using random fallback.`)
  const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
  
  return {
    move: randomMove,
    thinking: `Failed to extract valid move from model ${model} after ${maxRetries} attempts. Random fallback move selected. Last response: ${lastResponse.substring(0, 500)}${lastResponse.length > 500 ? '...' : ''}`
  }
}

async function simulateGame(gameId: string, player1: string, player2: string, userApiKey?: string) {
  const chess = new Chess()
  const moveDetails: any[] = []
  
  console.log(`\n🏁 Starting chess game: ${player1} (white) vs ${player2} (black)`)
  console.log(`Game ID: ${gameId}`)
  console.log(`Starting position: ${chess.fen()}\n`)
  
  let moveCount = 0
  const MAX_MOVES = 200 // 100 moves per side (200 total plies)
  
  while (!chess.isGameOver() && moveCount < MAX_MOVES) {
    const isWhiteTurn = chess.turn() === 'w'
    const currentPlayer = isWhiteTurn ? player1 : player2
    const playerName = isWhiteTurn ? 'player1' : 'player2'
    const playerColor = isWhiteTurn ? 'white' : 'black'
    
    console.log(`\n--- Move ${Math.floor(moveCount/2) + 1}${isWhiteTurn ? '' : '...'} (${playerColor}) ---`)
    console.log(`Current position: ${chess.fen()}`)
    console.log(`${currentPlayer} is thinking...`)
    
    try {
      const { move, thinking } = await makeChessMove(currentPlayer, chess, playerColor, Math.floor(moveCount/2) + 1, userApiKey)
      
      if (move === 'resign') {
        console.log(`${currentPlayer} resigned!`)
        // Set winner to the other player
        const winner = isWhiteTurn ? 'player2' : 'player1'
        const finalGame = {
          id: gameId,
          player1,
          player2,
          winner,
          status: 'completed' as const,
          moves: JSON.stringify(chess.history()),
          moveDetails: JSON.stringify(moveDetails),
          gameState: chess.fen(),
          startedAt: activeGames.get(gameId)?.startedAt || new Date().toISOString(),
        }
        activeGames.set(gameId, finalGame)
        console.log(`\n✅ Game ${gameId} completed by resignation. Winner: ${winner}`)
        
        // Save to database
        await saveChessGame(finalGame)
        return
      }
      
      // Make the move
      const moveResult = chess.move(move)
      if (!moveResult) {
        console.log(`Invalid move: ${move}. Game ending due to invalid move.`)
        // Award win to the other player
        const winner = isWhiteTurn ? 'player2' : 'player1'
        const finalGame = {
          id: gameId,
          player1,
          player2,
          winner,
          status: 'abandoned' as const,
          moves: JSON.stringify(chess.history()),
          moveDetails: JSON.stringify(moveDetails),
          gameState: chess.fen(),
          errorReason: `Invalid move: ${move}`,
          startedAt: activeGames.get(gameId)?.startedAt || new Date().toISOString(),
        }
        activeGames.set(gameId, finalGame)
        console.log(`\n✅ Game ${gameId} abandoned due to invalid move. Winner: ${winner}`)
        
        // Save to database
        await saveChessGame(finalGame)
        return
      }
      
      console.log(`Move played: ${moveResult.san}`)
      console.log(`New position: ${chess.fen()}`)
      
      moveDetails.push({
        move: moveResult.san,
        thinking,
        player: currentPlayer,
        playerName
      })
      
      // Update the game in memory with current state
      const updatedGame = {
        id: gameId,
        player1,
        player2,
        moves: JSON.stringify(chess.history()),
        moveDetails: JSON.stringify(moveDetails),
        gameState: chess.fen(),
        status: 'ongoing' as const,
        winner: null,
        startedAt: activeGames.get(gameId)?.startedAt || new Date().toISOString(),
      }
      activeGames.set(gameId, updatedGame)
      
      // Save to database for ongoing games
      await saveChessGame(updatedGame)
      
      moveCount++
      
      // Check if game ended after this move
      if (chess.isGameOver()) {
        break
      }
      
      // Add thinking delay (1-3 seconds to simulate real thinking)
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500))
      
    } catch (error) {
      console.error(`Error processing move for ${currentPlayer}:`, error)
      // Award win to the other player due to error
      const winner = isWhiteTurn ? 'player2' : 'player1'
      const finalGame = {
        id: gameId,
        player1,
        player2,
        winner,
        status: 'abandoned' as const,
        moves: JSON.stringify(chess.history()),
        moveDetails: JSON.stringify(moveDetails),
        gameState: chess.fen(),
        errorReason: `Error in move processing: ${error}`,
        startedAt: activeGames.get(gameId)?.startedAt || new Date().toISOString(),
      }
      activeGames.set(gameId, finalGame)
      console.log(`\n✅ Game ${gameId} abandoned due to error. Winner: ${winner}`)
      
      // Save to database
      await saveChessGame(finalGame)
      return
    }
  }
  
  // Determine game result
  let winner = 'draw'
  if (chess.isCheckmate()) {
    winner = chess.turn() === 'w' ? 'player2' : 'player1' // The player who can't move lost
    console.log(`\n🎉 Checkmate! ${winner === 'player1' ? player1 : player2} wins!`)
  } else if (chess.isStalemate()) {
    console.log(`\n🤝 Stalemate! Game is a draw.`)
    winner = 'draw'
  } else if (chess.isDraw()) {
    console.log(`\n🤝 Draw by insufficient material, threefold repetition, or 50-move rule.`)
    winner = 'draw'
  } else if (moveCount >= MAX_MOVES) {
    console.log(`\n🤝 Draw by move limit! Game reached ${MAX_MOVES/2} moves per side.`)
    winner = 'draw'
  }
  
  // Mark game as completed
  const finalGame = {
    id: gameId,
    player1,
    player2,
    winner,
    status: 'completed' as const,
    moves: JSON.stringify(chess.history()),
    moveDetails: JSON.stringify(moveDetails),
    gameState: chess.fen(),
    startedAt: activeGames.get(gameId)?.startedAt || new Date().toISOString(),
  }
  
  activeGames.set(gameId, finalGame)
  console.log(`\n✅ Game ${gameId} completed. Final result: ${winner}`)
  
  // Save completed game to database
  await saveChessGame(finalGame)
  
  // Persist game data for statistics
  try {
    console.log(`📊 Game statistics updated for ${player1} vs ${player2}`)
  } catch (error) {
    console.error('Failed to persist game statistics:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { player1, player2, userApiKey } = await request.json()

    if (!player1 || !player2) {
      return NextResponse.json({ error: 'Both players are required' }, { status: 400 })
    }

    if (player1 === player2) {
      return NextResponse.json({ error: 'Players must be different' }, { status: 400 })
    }

    // Create new game
    const gameId = Math.random().toString(36).substring(2, 15)
    const newGame = {
      id: gameId,
      player1, // White pieces
      player2, // Black pieces  
      winner: null,
      moves: JSON.stringify([]),
      moveDetails: JSON.stringify([]),
      gameState: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
      status: 'ongoing' as const,
      startedAt: new Date().toISOString(),
    }

    activeGames.set(gameId, newGame)

    // Save initial game to database
    await saveChessGame(newGame)

    // Start the game simulation in the background
    simulateGame(gameId, player1, player2, userApiKey).catch(async error => {
      console.error('Game simulation error:', error)
      // Mark game as error
      const errorGame = { 
        ...activeGames.get(gameId), 
        status: 'error' as const,
        errorReason: `Simulation error: ${error}`,
        startedAt: activeGames.get(gameId)?.startedAt || new Date().toISOString(),
      }
      activeGames.set(gameId, errorGame)
      await saveChessGame(errorGame)
    })

    return NextResponse.json(newGame)
  } catch (error) {
    console.error('Start game API error:', error)
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 })
  }
} 