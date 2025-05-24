# 🎯 Model-Match Chess Arena

An epic AI chess battle platform where different large language models compete on the chessboard! Watch Cerebras models duke it out against heavyweight competitors like Claude and GPT-4o in strategic gameplay.

## 🚀 Why It's Cool

- **Strategic AI evaluation** – Test long-term planning and reasoning through chess gameplay
- **Real-time battles** – Watch AI models think and play against each other live
- **Comprehensive tracking** – Full game history, move analysis, and performance statistics
- **Multiple providers** – Compare models from Cerebras, OpenAI, Anthropic, and more
- **Flexible API keys** – Use your own OpenRouter API key or server-provided keys
- **Export & analyze** – Get PGN files and analyze games on Lichess

## 🎮 Features

### ♟️ Chess Battle Arena (Primary Feature)
- **AI vs AI chess matches** with live gameplay visualization
- **Real-time move analysis** with detailed AI reasoning for each move
- **Running scoreboard** tracking wins/losses/draws across all models
- **Model selection** from 15+ available AI models and providers
- **Game history** with full move tracking, PGN export, and analysis links
- **Live updates** during gameplay with thinking indicators
- **Optional user API keys** for personal credits and rate limits

### 🥊 Model Comparison (Secondary Feature)
- **Text-based challenges** for design/experiment specifications
- **Task types**: Chip-RTL Optimize, General Research Ideas
- **Side-by-side comparison** with real-time metrics
- **Auto-evaluation** using AI-powered rubric scoring
- **Cost and latency analysis** for different models

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes with real-time polling
- **Database**: SQLite + Prisma (chess games, statistics, history)
- **AI Models**: OpenRouter API (Cerebras, Claude, GPT-4o, Qwen, Llama, etc.)
- **Chess Engine**: chess.js for move validation and game logic
- **Deployment**: Ready for Vercel/Railway/fly.io

## 📦 Quick Setup

### 1. Clone & Install

```bash
git clone <repository-url>
cd cerebras-demo
npm install
```

### 2. Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:

```bash
# Database URL for Prisma (SQLite for local development)
DATABASE_URL="file:./dev.db"

# OpenRouter API key for accessing AI models
# Get your key from: https://openrouter.ai/keys
# This is optional - users can provide their own keys in the frontend
OPENROUTER_API_KEY="sk-or-v1-your-openrouter-api-key-here"
```

### 3. Database Setup with Prisma

The application uses Prisma with SQLite for data persistence. Set up the database:

```bash
# Generate Prisma client
npx prisma generate

# Push database schema to create tables
npx prisma db push

# Optional: View your database in Prisma Studio
npx prisma studio
```

**Database Schema Overview:**
- `ChessGame`: Stores chess match data, moves, analysis, and results
- `ModelMatch`: Stores model comparison results from text challenges

**Available Prisma Commands:**
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Apply schema changes to database
npx prisma db push

# Reset database (warning: deletes all data)
npx prisma db reset

# View and edit data in browser
npx prisma studio

# Create and apply migrations (for production)
npx prisma migrate dev --name init
```

### 4. Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

## 🔑 API Key Options

The application supports flexible API key management:

### Option 1: Server-Side Keys (Default)
Set `OPENROUTER_API_KEY` in your `.env.local` file. All users will use this server key.

### Option 2: User-Provided Keys (Recommended)
Users can provide their own OpenRouter API keys in the frontend:
- Navigate to `/chess` 
- Enter your OpenRouter API key in the "API Key" field
- The application will use your personal credits instead of server resources
- Leave empty to fall back to server key

**Benefits of User Keys:**
- ✅ Users control their own costs and rate limits
- ✅ Access to premium models with your subscription
- ✅ Better privacy (your API calls don't go through server)
- ✅ No impact on server quotas

## 🎯 How to Use

### Chess Battle (Main Feature)
1. **Navigate to /chess** (or click "LLM Chess Arena" on homepage)
2. **Optionally enter your OpenRouter API key** for personal billing
3. **Select two different AI models** from the dropdown menus
4. **Click "Start Battle"** and watch the AI models play chess
5. **Observe real-time gameplay** with move analysis and thinking process
6. **Check the leaderboard** for running statistics and win rates
7. **Export PGN files** or analyze completed games on Lichess

### Model Text Challenges
1. **Paste your specification** (code, research idea, etc.)
2. **Select task type** (Chip-RTL, General Research)
3. **Optionally provide your OpenRouter API key**
4. **Hit "Run Duel"** and compare model responses
5. **Analyze results**: latency, cost, quality scores side-by-side

## 🔧 API Endpoints

### Chess Battle APIs
- `POST /api/chess/start` - Start new chess game
  - Body: `{ player1, player2, userApiKey? }`
- `GET /api/chess/game/[id]` - Get specific game status and moves
- `GET /api/chess/games` - Get game history with filters
- `GET /api/chess/scoreboard` - Get model performance statistics

### Comparison APIs  
- `POST /api/duel` - Run model text comparison
  - Body: `{ specification, taskType, userApiKey? }`

## 🗄️ Database Management

### Local Development (SQLite)
- Database file: `prisma/dev.db`
- Automatically created when you run `npx prisma db push`
- Use Prisma Studio to view/edit data: `npx prisma studio`

### Production Deployment
For production, consider upgrading from SQLite:

**PostgreSQL (Recommended):**
```bash
# Update DATABASE_URL in your production environment
DATABASE_URL="postgresql://user:password@host:port/database"

# Run migrations
npx prisma migrate deploy
```

**MySQL:**
```bash
DATABASE_URL="mysql://user:password@host:port/database"
npx prisma migrate deploy
```

**PlanetScale:**
```bash
DATABASE_URL="mysql://user:password@host:port/database?sslaccept=strict"
npx prisma db push
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

**Environment Variables to Set:**
- `DATABASE_URL` - Your production database URL
- `OPENROUTER_API_KEY` - Your OpenRouter API key (optional)

### Railway
```bash
railway login
railway new
railway up
```

### Docker
```bash
docker build -t model-match .
docker run -p 3000:3000 -e DATABASE_URL="file:./dev.db" -e OPENROUTER_API_KEY="your-key" model-match
```

## 🎨 Available AI Models

The chess arena supports 15+ different AI models across multiple providers:

**Cerebras Models:**
- Llama 3.1 8B Instruct
- Llama 4 Scout
- Llama 3.3 70B Instruct
- Qwen 3 32B

**Other Providers:**
- OpenAI: GPT-4o Mini
- Anthropic: Claude 3 Haiku  
- Various Qwen 3 32B providers (DeepInfra, Nebius, Lambda, SambaNova, etc.)
- Free models: Llama 3.3 8B, Gemma 3, DeepHermes 3

## 📊 Cost Estimates

| Model | Prompt Cost | Completion Cost | Typical Chess Game |
|-------|-------------|-----------------|-------------------|
| Cerebras Llama 3.1 8B | $0.00006/1K | $0.00006/1K | ~$0.05 |
| Claude 3 Haiku | $0.025/1K | $0.125/1K | ~$0.50 |
| GPT-4o Mini | $0.015/1K | $0.06/1K | ~$0.20 |
| Qwen 3 32B | $0.07/1K | $0.07/1K | ~$0.15 |

*Chess games typically involve 40-80 moves with detailed analysis. Costs may vary by provider. Using your own API key gives you direct control over billing.*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🎮 What's Next?

- [ ] Advanced chess visualization with board animations
- [ ] Tournament brackets with multiple AI models
- [ ] Real-time multiplayer chess observation
- [ ] Chess opening book analysis and statistics
- [ ] Model fine-tuning based on chess performance
- [ ] Advanced position evaluation and move suggestions
- [ ] Custom time controls and game variants
- [ ] Integration with chess engines for position analysis

---

**Made with ⚡ for the Cerebras Hackathon**

*Watch AI models battle it out on the ultimate strategy game!*
