import { NextRequest, NextResponse } from 'next/server'

interface LichessAnalysis {
  evaluation?: {
    cp?: number
    mate?: number
  } | null
  bestMove?: string | null
  depth?: number | null
  nodes?: number | null
  time?: number | null
}

export async function POST(request: NextRequest) {
  try {
    const { fen, moves } = await request.json()

    if (!fen) {
      return NextResponse.json({ error: 'FEN position is required' }, { status: 400 })
    }

    console.log('Analyzing position:', fen)
    console.log('Moves history:', moves)

    // Call Lichess cloud evaluation API (no auth needed for cloud eval)
    const analysisUrl = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`
    
    console.log('Calling Lichess API:', analysisUrl)
    
    const response = await fetch(analysisUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Chess Battle App (Mozilla/5.0)',
      },
    })

    console.log('Lichess API response status:', response.status)
    console.log('Lichess API response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Lichess API error:', response.status, response.statusText, errorText)
      
      // If cloud eval fails, provide a basic response that won't break the UI
      return NextResponse.json({
        evaluation: null,
        bestMove: null,
        depth: 0,
        nodes: null,
        time: null,
        opening: null,
        fen,
        error: `Lichess API unavailable (${response.status}). Analysis disabled.`
      })
    }

    const data = await response.json()
    console.log('Lichess API response data:', JSON.stringify(data, null, 2))
    
    // Format the analysis data based on actual Lichess response structure
    let evaluation = null
    let bestMove = null
    
    if (data.pvs && data.pvs.length > 0) {
      const pv = data.pvs[0]
      evaluation = {
        cp: pv.cp,
        mate: pv.mate
      }
      bestMove = pv.moves ? pv.moves.split(' ')[0] : null
    }
    
    const analysis: LichessAnalysis = {
      evaluation,
      bestMove,
      depth: data.depth || null,
      nodes: data.knodes ? data.knodes * 1000 : null,
      time: null // Not provided by cloud eval
    }

    // Try to get opening information if available and moves exist
    let opening = null
    if (moves && moves.length > 0 && moves.length <= 20) { // Limit to reasonable opening length
      try {
        const openingUrl = `https://explorer.lichess.ovh/lichess?variant=standard&speeds[]=blitz&speeds[]=rapid&speeds[]=classical&ratings[]=1600&ratings[]=1800&ratings[]=2000&ratings[]=2200&ratings[]=2500&moves=${moves.join(',')}`
        console.log('Fetching opening info from:', openingUrl)
        
        const openingResponse = await fetch(openingUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Chess Battle App',
          },
        })
        
        if (openingResponse.ok) {
          const openingData = await openingResponse.json()
          if (openingData.opening) {
            opening = {
              name: openingData.opening.name || null,
              eco: openingData.opening.eco || null
            }
            console.log('Opening data found:', opening)
          }
        } else {
          console.log('Opening API failed:', openingResponse.status)
        }
      } catch (error) {
        console.error('Failed to get opening info:', error)
      }
    }

    const result = {
      ...analysis,
      opening,
      fen
    }

    console.log('Final analysis result:', JSON.stringify(result, null, 2))
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analysis API error:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze position',
      details: error instanceof Error ? error.message : 'Unknown error',
      evaluation: null,
      bestMove: null,
      depth: null,
      nodes: null,
      time: null,
      opening: null,
      fen: null
    }, { status: 500 })
  }
} 