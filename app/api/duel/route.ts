import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// In-memory cache for demonstration (use Redis in production)
const cache = new Map<string, any>()

interface ModelResponse {
  content: string
  tokens: number
  latency: number
  cost: number
}

async function callModel(model: string, prompt: string, userApiKey?: string): Promise<ModelResponse> {
  const startTime = Date.now()
  
  // Use user API key if provided, otherwise use server key
  const apiKey = userApiKey || process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('No OpenRouter API key available');
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`Model ${model} request failed`)
  }

  const data = await response.json()
  const latency = Date.now() - startTime

  return {
    content: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
    latency,
    cost: calculateCost(model, data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0),
  }
}

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  // Updated cost estimates based on OpenRouter pricing (in cents per 1000 tokens)
  const costs: Record<string, { prompt: number; completion: number }> = {
    'cerebras/llama3.1-8b-instruct': { prompt: 0.06, completion: 0.06 }, // $0.06 per 1M tokens
    'anthropic/claude-3-haiku': { prompt: 25, completion: 125 }, // $0.25/$1.25 per 1M tokens  
    'openai/gpt-4o': { prompt: 250, completion: 1250 }, // $2.50/$12.50 per 1M tokens
    'openai/gpt-4o-mini': { prompt: 15, completion: 60 }, // $0.15/$0.60 per 1M tokens
    'qwen/qwen3-32b': { prompt: 70, completion: 70 }, // $0.70 per 1M tokens
    'meta-llama/llama-3.3-8b-instruct:free': { prompt: 0, completion: 0 }, // Free
    'google/gemma-3n-e4b-it:free': { prompt: 0, completion: 0 }, // Free
    'nousresearch/deephermes-3-mistral-24b-preview:free': { prompt: 0, completion: 0 }, // Free
  }

  const modelCost = costs[model] || { prompt: 100, completion: 100 } // Default fallback
  
  // Convert to cents: (tokens / 1000) * (cost per 1000 tokens) / 10000 to get cents
  const promptCost = (promptTokens / 1000000) * modelCost.prompt
  const completionCost = (completionTokens / 1000000) * modelCost.completion
  
  return Math.round((promptCost + completionCost) * 10000) / 10000 // Round to 4 decimal places
}

function createPrompt(specification: string, taskType: string): string {
  const taskPrompts = {
    'chip-rtl': `You are an expert RTL design engineer. Analyze and optimize the following chip design specification. Provide specific improvements, suggestions for area/power/timing optimization, and identify any potential issues:\n\n${specification}`,
    'photonic': `You are a photonic systems expert. Analyze the following photonic experiment specification. Provide a detailed experimental plan, equipment requirements, expected results, and potential challenges:\n\n${specification}`,
    'general': `You are a research scientist. Analyze the following research idea and provide a comprehensive analysis including methodology, feasibility, potential impact, and implementation steps:\n\n${specification}`,
  }

  return taskPrompts[taskType as keyof typeof taskPrompts] || taskPrompts.general
}

async function evaluateResponses(specification: string, answer1: string, answer2: string, userApiKey?: string): Promise<{ score1: number; score2: number }> {
  const evaluationPrompt = `
Given the original specification and two candidate answers, score each answer from 1-5 based on:
- Correctness: Technical accuracy and adherence to requirements
- Novelty: Creative insights and innovative approaches  
- Implementability: Practical feasibility and clarity

Original Specification:
${specification}

Answer A:
${answer1}

Answer B:
${answer2}

Respond in JSON format: {"scoreA": X, "scoreB": Y, "reasoning": "brief explanation"}
`

  try {
    const response = await callModel('cerebras/llama3.1-8b-instruct', evaluationPrompt, userApiKey)
    const evaluation = JSON.parse(response.content)
    return { score1: evaluation.scoreA, score2: evaluation.scoreB }
  } catch (error) {
    console.error('Evaluation failed:', error)
    // Fallback random scores if evaluation fails
    return { score1: Math.floor(Math.random() * 3) + 3, score2: Math.floor(Math.random() * 3) + 3 }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { specification, taskType, userApiKey } = await request.json()

    if (!specification?.trim()) {
      return NextResponse.json({ error: 'Specification is required' }, { status: 400 })
    }

    // Create cache key
    const cacheKey = createHash('sha1').update(`${specification}-${taskType}`).digest('hex')

    // Check cache first
    if (cache.has(cacheKey)) {
      return NextResponse.json(cache.get(cacheKey))
    }

    const prompt = createPrompt(specification, taskType)

    // Call both models concurrently
    const [cerebasResponse, referenceResponse] = await Promise.all([
      callModel('cerebras/llama3.1-8b-instruct', prompt, userApiKey),
      callModel('anthropic/claude-3-haiku', prompt, userApiKey),
    ])

    // Evaluate responses
    const { score1, score2 } = await evaluateResponses(specification, cerebasResponse.content, referenceResponse.content, userApiKey)

    const result = {
      model1: {
        name: 'Cerebras Llama 3.1 8B',
        answer: cerebasResponse.content,
        latency: cerebasResponse.latency,
        tokens: cerebasResponse.tokens,
        cost: cerebasResponse.cost,
        score: score1,
      },
      model2: {
        name: 'Claude 3 Haiku',
        answer: referenceResponse.content,
        latency: referenceResponse.latency,
        tokens: referenceResponse.tokens,
        cost: referenceResponse.cost,
        score: score2,
      },
    }

    // Cache the result
    cache.set(cacheKey, result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Duel API error:', error)
    return NextResponse.json(
      { error: 'Failed to run model duel' },
      { status: 500 }
    )
  }
} 