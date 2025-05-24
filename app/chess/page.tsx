"use client";

import { useState, useEffect, useRef } from "react";
import {
  Crown,
  Swords,
  Home,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";

interface ChessGame {
  id: string;
  player1: string;
  player2: string;
  winner: string | null;
  moves: string;
  moveDetails?: string;
  gameState: string;
  status: "ongoing" | "completed" | "error" | "abandoned";
  pgn?: string;
  lichessUrl?: string;
  startedAt: string;
  completedAt?: string;
  lastMoveAt?: string;
  totalMoves: number;
  isAbandoned: boolean;
  errorReason?: string;
}

interface ModelStats {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  ongoing: number;
  abandoned: number;
}

interface Scoreboard {
  [key: string]: ModelStats;
}

export default function ChessBattle() {
  const [currentGame, setCurrentGame] = useState<ChessGame | null>(null);
  const [scoreboard, setScoreboard] = useState<Scoreboard>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameHistory, setGameHistory] = useState<ChessGame[]>([]);
  const [selectedModels, setSelectedModels] = useState({
    player1: "qwen/qwen3-32b:cerebras",
    player2: "qwen/qwen3-32b:sambanova",
  });
  const [copiedPGN, setCopiedPGN] = useState(false);
  const [expandedMoves, setExpandedMoves] = useState<Set<string>>(new Set());
  // Analysis functionality removed to prevent 404 errors with Lichess API
  const [userApiKey, setUserApiKey] = useState("");

  // Refs for auto-scrolling
  const player1ScrollRef = useRef<HTMLDivElement>(null);
  const player2ScrollRef = useRef<HTMLDivElement>(null);

  const availableModels = [
    {
      value: "meta-llama/llama-3.1-8b-instruct:cerebras",
      label: "Meta Llama 3.1 8B (Cerebras)",
      model: "meta-llama/llama-3.1-8b-instruct:cerebras",
    },
    {
      value: "meta-llama/llama-4-scout:cerebras",
      label: "Meta Llama 4 Scout (Cerebras)",
      model: "meta-llama/llama-4-scout:cerebras",
    },
    {
      value: "meta-llama/llama-3.3-70b-instruct",
      label: "Meta Llama 3.3 70B (Cerebras)",
      model: "meta-llama/llama-3.3-70b-instruct",
    },
    {
      value: "qwen/qwen3-32b:cerebras",
      label: "Qwen 3 32B (Cerebras)",
      model: "qwen/qwen3-32b",
    },
    {
      value: "qwen/qwen3-32b:deepinfra",
      label: "Qwen 3 32B (DeepInfra)",
      model: "qwen/qwen3-32b",
      provider: "deepinfra",
    },
    {
      value: "qwen/qwen3-32b:nebius",
      label: "Qwen 3 32B (Nebius)",
      model: "qwen/qwen3-32b",
      provider: "nebius",
    },
    {
      value: "qwen/qwen3-32b:lambda",
      label: "Qwen 3 32B (Lambda)",
      model: "qwen/qwen3-32b",
      provider: "lambda",
    },
    {
      value: "qwen/qwen3-32b:novita",
      label: "Qwen 3 32B (Novita)",
      model: "qwen/qwen3-32b",
      provider: "novita",
    },
    {
      value: "qwen/qwen3-32b:sambanova",
      label: "Qwen 3 32B (SambaNova)",
      model: "qwen/qwen3-32b",
      provider: "sambanova",
    },
    {
      value: "qwen/qwen3-32b:gmicloud",
      label: "Qwen 3 32B (GMI Cloud)",
      model: "qwen/qwen3-32b",
      provider: "gmicloud",
    },
    {
      value: "meta-llama/llama-3.3-8b-instruct:free",
      label: "Meta Llama 3.3 8B (Free)",
      model: "meta-llama/llama-3.3-8b-instruct:free",
    },
    {
      value: "anthropic/claude-3-haiku",
      label: "Claude 3 Haiku",
      model: "anthropic/claude-3-haiku",
    },
    {
      value: "openai/gpt-4o-mini",
      label: "GPT-4o Mini",
      model: "openai/gpt-4o-mini",
    },
    {
      value: "google/gemma-3n-e4b-it:free",
      label: "Google Gemma 3 (Free)",
      model: "google/gemma-3n-e4b-it:free",
    },
    {
      value: "nousresearch/deephermes-3-mistral-24b-preview:free",
      label: "DeepHermes 3 Mistral 24B (Free)",
      model: "nousresearch/deephermes-3-mistral-24b-preview:free",
    },
  ];

  useEffect(() => {
    fetchScoreboard();
    fetchGameHistory();
  }, []);

  // Auto-scroll to latest moves
  useEffect(() => {
    if (currentGame && getMoveDetails().length > 0) {
      // Scroll both player panels to bottom
      if (player1ScrollRef.current) {
        player1ScrollRef.current.scrollTop =
          player1ScrollRef.current.scrollHeight;
      }
      if (player2ScrollRef.current) {
        player2ScrollRef.current.scrollTop =
          player2ScrollRef.current.scrollHeight;
      }
    }
  }, [currentGame?.moveDetails]);

  const fetchScoreboard = async () => {
    try {
      const response = await fetch("/api/chess/scoreboard");
      if (response.ok) {
        const data = await response.json();
        setScoreboard(data);
      }
    } catch (error) {
      console.error("Failed to fetch scoreboard:", error);
    }
  };

  const fetchGameHistory = async () => {
    try {
      // Fetch all games (no limit) including ongoing and abandoned games
      const response = await fetch(
        "/api/chess/games?includeOngoing=true&includeAbandoned=true"
      );
      if (response.ok) {
        const data = await response.json();
        setGameHistory(data); // Show all games, not just 10
      }
    } catch (error) {
      console.error("Failed to fetch game history:", error);
    }
  };

  const startNewGame = async () => {
    setIsPlaying(true);
    try {
      const response = await fetch("/api/chess/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...selectedModels,
          userApiKey: userApiKey.trim() || undefined,
        }),
      });

      if (response.ok) {
        const game = await response.json();
        setCurrentGame(game);
        // Start polling for game updates
        pollGameStatus(game.id);
      }
    } catch (error) {
      console.error("Failed to start game:", error);
      setIsPlaying(false);
    }
  };

  const pollGameStatus = async (gameId: string) => {
    let pollCount = 0;
    const poll = async () => {
      pollCount++;
      console.log(`Polling attempt ${pollCount} for game ${gameId}`);
      try {
        const response = await fetch(`/api/chess/game/${gameId}`);
        if (response.ok) {
          const game = await response.json();
          console.log("Fetched game data:", game);
          setCurrentGame(game);

          if (game.status === "completed" || game.status === "error") {
            console.log("Game finished, stopping polling");
            setIsPlaying(false);
            fetchScoreboard();
            fetchGameHistory();
            return;
          }

          // Continue polling for ongoing games
          setTimeout(poll, 1000);
        } else {
          console.error("Failed to fetch game status:", response.status);
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error("Polling error:", error);
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  // Generate PGN from game moves
  const generatePGN = () => {
    if (!currentGame) return "";

    const moves = JSON.parse(currentGame.moves || "[]");
    const player1Label =
      availableModels.find((m) => m.value === selectedModels.player1)?.label ||
      "White";
    const player2Label =
      availableModels.find((m) => m.value === selectedModels.player2)?.label ||
      "Black";

    let pgn = `[Event "AI Chess Battle"]\n`;
    pgn += `[Site "Model-Match Platform"]\n`;
    pgn += `[Date "${new Date(currentGame.startedAt)
      .toISOString()
      .slice(0, 10)}"]\n`;
    pgn += `[Round "1"]\n`;
    pgn += `[White "${player1Label}"]\n`;
    pgn += `[Black "${player2Label}"]\n`;

    if (currentGame.status === "completed") {
      let result = "1/2-1/2";
      if (currentGame.winner === "player1") result = "1-0";
      else if (currentGame.winner === "player2") result = "0-1";
      pgn += `[Result "${result}"]\n`;
    } else {
      pgn += `[Result "*"]\n`;
    }

    pgn += `\n`;

    // Format moves in standard PGN notation
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];

      if (blackMove) {
        pgn += `${moveNum}. ${whiteMove} ${blackMove} `;
      } else {
        pgn += `${moveNum}. ${whiteMove} `;
      }

      if (moveNum % 6 === 0) pgn += `\n`;
    }

    if (currentGame.status === "completed") {
      let result = "1/2-1/2";
      if (currentGame.winner === "player1") result = "1-0";
      else if (currentGame.winner === "player2") result = "0-1";
      pgn += ` ${result}`;
    }

    return pgn.trim();
  };

  const copyPGNToClipboard = async () => {
    const pgn = generatePGN();
    try {
      await navigator.clipboard.writeText(pgn);
      setCopiedPGN(true);
      setTimeout(() => setCopiedPGN(false), 2000);
    } catch (error) {
      console.error("Failed to copy PGN:", error);
    }
  };

  const renderChessBoard = () => {
    if (!currentGame) {
      return (
        <div className="w-80 h-80 bg-slate-900/80 backdrop-blur-sm border border-slate-600 rounded-lg flex items-center justify-center">
          <div className="text-center text-slate-300">
            <Crown className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p className="text-lg font-medium">No Active Game</p>
            <p className="text-sm text-slate-400">
              Start a battle to see the board
            </p>
          </div>
        </div>
      );
    }

    // Chess piece symbols for Unicode display with better contrast
    const pieces = {
      // Black pieces (top)
      r: "♜",
      n: "♞",
      b: "♝",
      q: "♛",
      k: "♚",
      p: "♟",
      // White pieces (bottom)
      R: "♖",
      N: "♘",
      B: "♗",
      Q: "♕",
      K: "♔",
      P: "♙",
    };

    // Parse FEN to get piece positions
    const parsePosition = (fen: string) => {
      const parts = fen.split(" ");
      const boardPart = parts[0];
      const ranks = boardPart.split("/");
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(""));

      ranks.forEach((rank, rankIndex) => {
        let fileIndex = 0;
        for (let char of rank) {
          if (char >= "1" && char <= "8") {
            fileIndex += parseInt(char);
          } else {
            board[rankIndex][fileIndex] = char;
            fileIndex++;
          }
        }
      });

      return board;
    };

    const boardPosition = parsePosition(currentGame.gameState);

    const squares = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const isLight = (rank + file) % 2 === 0;
        const piece = boardPosition[rank][file];
        const pieceSymbol = pieces[piece as keyof typeof pieces] || "";
        const fileLabel = String.fromCharCode(97 + file);
        const rankLabel = (8 - rank).toString();

        squares.push(
          <div
            key={`${rank}-${file}`}
            className={`w-10 h-10 flex items-center justify-center text-2xl font-bold relative ${
              isLight ? "bg-amber-100" : "bg-amber-700"
            }`}
          >
            {file === 0 && (
              <div className="absolute -left-4 text-xs text-gray-600 font-semibold">
                {rankLabel}
              </div>
            )}
            {rank === 7 && (
              <div className="absolute -bottom-4 text-xs text-gray-600 font-semibold">
                {fileLabel}
              </div>
            )}
            <span
              className={`select-none ${
                piece && piece === piece.toLowerCase()
                  ? "text-gray-800"
                  : "text-gray-100"
              }`}
              style={{
                textShadow:
                  piece && piece === piece.toLowerCase()
                    ? // Black pieces - white outline for contrast on both light and dark squares
                      "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, -2px 0 0 #fff, 2px 0 0 #fff, 0 -2px 0 #fff, 0 2px 0 #fff"
                    : // White pieces - black outline for contrast
                      "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000",
              }}
            >
              {pieceSymbol}
            </span>
          </div>
        );
      }
    }

    return (
      <div className="w-96 h-96 border-4 border-amber-800 rounded-lg overflow-hidden relative">
        <div className="grid grid-cols-8 w-full h-full p-4">{squares}</div>
      </div>
    );
  };

  const getModelStats = (modelName: string) => {
    return scoreboard[modelName] || { wins: 0, losses: 0, draws: 0, total: 0 };
  };

  const getWinRate = (stats: any) => {
    if (stats.total === 0) return 0;
    return Math.round((stats.wins / stats.total) * 100);
  };

  const getMoveDetails = () => {
    if (!currentGame?.moveDetails) {
      return [];
    }
    try {
      const parsed = JSON.parse(currentGame.moveDetails);
      return parsed;
    } catch (error) {
      console.error("Error parsing moveDetails:", error);
      return [];
    }
  };

  const getPlayerName = (playerKey: "player1" | "player2") => {
    return (
      availableModels.find((m) => m.value === selectedModels[playerKey])
        ?.label || playerKey
    );
  };

  const formatEvaluation = (evaluation: any) => {
    if (!evaluation) return "No evaluation";

    if (evaluation.mate !== undefined) {
      const mateIn = evaluation.mate;
      if (mateIn > 0) {
        return `+M${mateIn}`;
      } else if (mateIn < 0) {
        return `-M${Math.abs(mateIn)}`;
      }
      return "Mate";
    }

    if (evaluation.cp !== undefined) {
      const pawns = evaluation.cp / 100;
      if (pawns > 0) {
        return `+${pawns.toFixed(1)}`;
      } else if (pawns < 0) {
        return pawns.toFixed(1);
      }
      return "0.0";
    }

    return "No eval";
  };

  const getEvaluationColor = (evaluation: any) => {
    if (!evaluation) return "text-slate-400";

    if (evaluation.mate !== undefined) {
      return evaluation.mate > 0 ? "text-green-400" : "text-red-400";
    }

    if (evaluation.cp !== undefined) {
      const pawns = evaluation.cp / 100;
      if (pawns > 2) return "text-green-400";
      if (pawns > 0.5) return "text-green-300";
      if (pawns > -0.5) return "text-slate-300";
      if (pawns > -2) return "text-orange-400";
      return "text-red-400";
    }

    return "text-slate-400";
  };

  const toggleMoveExpansion = (moveId: string) => {
    const newExpanded = new Set(expandedMoves);
    if (newExpanded.has(moveId)) {
      newExpanded.delete(moveId);
    } else {
      newExpanded.add(moveId);
    }
    setExpandedMoves(newExpanded);
  };

  // Function to calculate captured pieces
  const getCapturedPieces = () => {
    if (!currentGame) return { whiteCaptured: [], blackCaptured: [] };

    const initialPieces = {
      white: { P: 8, R: 2, N: 2, B: 2, Q: 1, K: 1 },
      black: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 },
    };

    const currentPieces = {
      white: { P: 0, R: 0, N: 0, B: 0, Q: 0, K: 0 },
      black: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 },
    };

    // Parse FEN to count current pieces
    const fen = currentGame.gameState;
    const parts = fen.split(" ");
    const boardPart = parts[0];

    for (let char of boardPart) {
      if (char >= "A" && char <= "Z") {
        // White pieces
        if (
          currentPieces.white[char as keyof typeof currentPieces.white] !==
          undefined
        ) {
          currentPieces.white[char as keyof typeof currentPieces.white]++;
        }
      } else if (char >= "a" && char <= "z") {
        // Black pieces
        if (
          currentPieces.black[char as keyof typeof currentPieces.black] !==
          undefined
        ) {
          currentPieces.black[char as keyof typeof currentPieces.black]++;
        }
      }
    }

    // Calculate captured pieces
    const whiteCaptured = [];
    const blackCaptured = [];

    // White pieces captured by black
    for (const [piece, count] of Object.entries(initialPieces.white)) {
      const remaining =
        currentPieces.white[piece as keyof typeof currentPieces.white];
      const captured = count - remaining;
      for (let i = 0; i < captured; i++) {
        whiteCaptured.push(piece);
      }
    }

    // Black pieces captured by white
    for (const [piece, count] of Object.entries(initialPieces.black)) {
      const remaining =
        currentPieces.black[piece as keyof typeof currentPieces.black];
      const captured = count - remaining;
      for (let i = 0; i < captured; i++) {
        blackCaptured.push(piece);
      }
    }

    return { whiteCaptured, blackCaptured };
  };

  const renderCapturedPieces = (capturedPieces: string[]) => {
    const pieces = {
      // White pieces
      R: "♖",
      N: "♘",
      B: "♗",
      Q: "♕",
      K: "♔",
      P: "♙",
      // Black pieces
      r: "♜",
      n: "♞",
      b: "♝",
      q: "♛",
      k: "♚",
      p: "♟",
    };

    return (
      <div className="flex flex-wrap gap-1">
        {capturedPieces.length > 0 ? (
          capturedPieces.map((piece, index) => (
            <span
              key={index}
              className="text-lg opacity-75"
              style={{
                textShadow:
                  piece === piece.toLowerCase()
                    ? "-0.5px -0.5px 0 #fff, 0.5px -0.5px 0 #fff, -0.5px 0.5px 0 #fff, 0.5px 0.5px 0 #fff"
                    : "-0.5px -0.5px 0 #000, 0.5px -0.5px 0 #000, -0.5px 0.5px 0 #000, 0.5px 0.5px 0 #000",
              }}
            >
              {pieces[piece as keyof typeof pieces]}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">None</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold pt-8 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent mb-4">
            Model Chess Battle
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-lg leading-relaxed">
            Watch different AI models battle it out on the chessboard.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Control */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-100">
              <Swords className="w-5 h-5 text-blue-400" />
              Battle Setup
            </h2>

            <div className="space-y-6">
              {/* API Key Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  🔑 OpenRouter API Key (Optional)
                </label>
                <input
                  type="password"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder="sk-or-v1-... (leave empty to use server key)"
                  disabled={isPlaying}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-all text-sm"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Provide your own OpenRouter API key to use your credits, or
                  leave empty to use server resources
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Player 1 (White)
                </label>
                <select
                  value={selectedModels.player1}
                  onChange={(e) =>
                    setSelectedModels((prev) => ({
                      ...prev,
                      player1: e.target.value,
                    }))
                  }
                  disabled={isPlaying}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-all"
                >
                  {availableModels.map((model) => (
                    <option
                      key={model.value}
                      value={model.value}
                      className="bg-slate-800"
                    >
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center py-3">
                <div className="text-2xl font-bold text-blue-400">VS</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Player 2 (Black)
                </label>
                <select
                  value={selectedModels.player2}
                  onChange={(e) =>
                    setSelectedModels((prev) => ({
                      ...prev,
                      player2: e.target.value,
                    }))
                  }
                  disabled={isPlaying}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-all"
                >
                  {availableModels.map((model) => (
                    <option
                      key={model.value}
                      value={model.value}
                      className="bg-slate-800"
                    >
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={startNewGame}
                disabled={
                  isPlaying || selectedModels.player1 === selectedModels.player2
                }
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
              >
                {isPlaying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Battle in Progress...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Battle
                  </>
                )}
              </button>
            </div>

            {/* PGN Export */}
            {currentGame && (
              <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-600">
                <h3 className="font-medium text-blue-300 mb-3 flex items-center gap-2">
                  📄 Export & Analysis
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={copyPGNToClipboard}
                    className="w-full bg-blue-600 text-white py-2 px-3 rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2 transition-all"
                  >
                    {copiedPGN ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy PGN
                      </>
                    )}
                  </button>

                  <a
                    href={`https://lichess.org/paste?pgn=${encodeURIComponent(
                      generatePGN()
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-orange-600 text-white py-2 px-3 rounded-xl font-medium hover:bg-orange-700 flex items-center justify-center gap-2 transition-all"
                  >
                    🔗 Analyze on Lichess
                  </a>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Export PGN or open full analysis on Lichess
                </p>
              </div>
            )}

            {/* Current Game Status */}
            {currentGame && (
              <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-600">
                <h3 className="font-medium text-blue-300 mb-3 flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  Battle Status
                </h3>
                <div className="text-sm text-slate-300 space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span
                      className={`font-semibold ${
                        currentGame.status === "ongoing"
                          ? "text-green-400"
                          : currentGame.status === "completed"
                          ? "text-blue-400"
                          : "text-red-400"
                      }`}
                    >
                      {currentGame.status === "ongoing"
                        ? "⚔️ Active"
                        : currentGame.status === "completed"
                        ? "🏁 Complete"
                        : "❌ Error"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Moves:</span>
                    <span className="text-blue-300">
                      {JSON.parse(currentGame.moves || "[]").length}
                    </span>
                  </div>

                  {currentGame.status === "ongoing" && (
                    <div className="flex justify-between">
                      <span>Turn:</span>
                      <span className="text-cyan-300">
                        {currentGame.gameState?.includes(" w ")
                          ? `⚪ ${getPlayerName("player1")}`
                          : `⚫ ${getPlayerName("player2")}`}
                      </span>
                    </div>
                  )}

                  {currentGame.winner && (
                    <div className="flex justify-between">
                      <span>Winner:</span>
                      <span className="font-bold text-green-400">
                        {currentGame.winner === "draw"
                          ? "🤝 Draw"
                          : currentGame.winner === "player1"
                          ? `🏆 ${getPlayerName("player1")}`
                          : `🏆 ${getPlayerName("player2")}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Battle Area - Bot vs Bot Layout */}
          <div className="lg:col-span-3 space-y-6">
            {/* Player 2 (Black - Top) */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Player Info */}
                <div className="flex items-center justify-between lg:justify-start">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all duration-300 ${
                        currentGame &&
                        currentGame.gameState?.includes(" b ") &&
                        currentGame.status === "ongoing"
                          ? "ring-4 ring-cyan-400 ring-opacity-75 shadow-cyan-400/50 animate-slow-pulse"
                          : ""
                      }`}
                    >
                      ⚫
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-100">
                        {getPlayerName("player2")}
                      </h3>
                      <p className="text-slate-400">Black Pieces</p>
                      <div className="text-sm text-blue-400">
                        Win Rate:{" "}
                        {getWinRate(getModelStats(selectedModels.player2))}%
                      </div>
                      {currentGame && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">
                            Captured pieces:
                          </p>
                          {renderCapturedPieces(
                            getCapturedPieces().whiteCaptured
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {currentGame &&
                    currentGame.gameState?.includes(" b ") &&
                    currentGame.status === "ongoing" && (
                      <div className="flex items-center gap-2 text-cyan-400 lg:hidden">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent" />
                        <span className="text-sm font-medium">Thinking...</span>
                      </div>
                    )}
                </div>

                {/* Player 2 Output Display */}
                <div className="lg:col-span-2">
                  {currentGame && getMoveDetails().length > 0 ? (
                    <div className="bg-slate-800/60 rounded-xl border border-slate-600 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-slate-200 font-medium">
                          Latest Moves & Analysis
                        </h4>
                        {currentGame &&
                          currentGame.gameState?.includes(" b ") &&
                          currentGame.status === "ongoing" && (
                            <div className="hidden lg:flex items-center gap-2 text-cyan-400">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent" />
                              <span className="text-sm font-medium">
                                Thinking...
                              </span>
                            </div>
                          )}
                      </div>
                      <div
                        ref={player2ScrollRef}
                        className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 space-y-3"
                      >
                        {getMoveDetails()
                          .filter((move: any) => move.playerName === "player2")
                          .map((move: any, index: number) => {
                            // Calculate actual move number for this player (Black moves)
                            const moveNumber = index + 1;
                            const moveId = `player2-${index}`;
                            const isExpanded = expandedMoves.has(moveId);
                            return (
                              <div
                                key={moveId}
                                className="bg-slate-900/60 rounded-lg border border-slate-700 overflow-hidden"
                              >
                                <div
                                  className="p-3 cursor-pointer hover:bg-slate-900/80 transition-colors"
                                  onClick={() => toggleMoveExpansion(moveId)}
                                >
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-slate-700 text-slate-100 px-3 py-1 rounded-lg font-mono font-bold text-lg flex-shrink-0">
                                      {move.move}
                                    </div>
                                    <div className="text-xs text-slate-400 flex-shrink-0">
                                      Move #{moveNumber}
                                    </div>
                                    <div className="flex-1" />
                                    <div className="text-slate-400 text-xs">
                                      {isExpanded ? "▼" : "▶"}
                                    </div>
                                  </div>
                                  {!isExpanded && (
                                    <div className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                      💭{" "}
                                      {move.thinking
                                        ? move.thinking.substring(0, 100) +
                                          "..."
                                        : "No analysis recorded"}
                                    </div>
                                  )}
                                </div>
                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-0">
                                    <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                                      💭{" "}
                                      {move.thinking || "No analysis recorded"}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/30 rounded-xl border border-slate-600 p-4 text-center">
                      <p className="text-slate-400 text-sm">
                        {currentGame && currentGame.status === "ongoing"
                          ? "Waiting for first move..."
                          : "No moves yet"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chess Board */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-6">
              <div className="flex justify-center">{renderChessBoard()}</div>
            </div>

            {/* Player 1 (White - Bottom) */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Player Info */}
                <div className="flex items-center justify-between lg:justify-start">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all duration-300 ${
                        currentGame &&
                        currentGame.gameState?.includes(" w ") &&
                        currentGame.status === "ongoing"
                          ? "ring-4 ring-cyan-400 ring-opacity-75 shadow-cyan-400/50 animate-slow-pulse"
                          : ""
                      }`}
                    >
                      ⚪
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-100">
                        {getPlayerName("player1")}
                      </h3>
                      <p className="text-blue-300">White Pieces</p>
                      <div className="text-sm text-blue-400">
                        Win Rate:{" "}
                        {getWinRate(getModelStats(selectedModels.player1))}%
                      </div>
                      {currentGame && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">
                            Captured pieces:
                          </p>
                          {renderCapturedPieces(
                            getCapturedPieces().blackCaptured
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {currentGame &&
                    currentGame.gameState?.includes(" w ") &&
                    currentGame.status === "ongoing" && (
                      <div className="flex items-center gap-2 text-cyan-400 lg:hidden">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent" />
                        <span className="text-sm font-medium">Thinking...</span>
                      </div>
                    )}
                </div>

                {/* Player 1 Output Display */}
                <div className="lg:col-span-2">
                  {currentGame && getMoveDetails().length > 0 ? (
                    <div className="bg-blue-900/40 rounded-xl border border-blue-700 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-blue-200 font-medium">
                          Latest Moves & Analysis
                        </h4>
                        {currentGame &&
                          currentGame.gameState?.includes(" w ") &&
                          currentGame.status === "ongoing" && (
                            <div className="hidden lg:flex items-center gap-2 text-cyan-400">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent" />
                              <span className="text-sm font-medium">
                                Thinking...
                              </span>
                            </div>
                          )}
                      </div>
                      <div
                        ref={player1ScrollRef}
                        className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-900 space-y-3"
                      >
                        {getMoveDetails()
                          .filter((move: any) => move.playerName === "player1")
                          .map((move: any, index: number) => {
                            // Calculate actual move number for this player (White moves)
                            const moveNumber = index + 1;
                            const moveId = `player1-${index}`;
                            const isExpanded = expandedMoves.has(moveId);
                            return (
                              <div
                                key={moveId}
                                className="bg-blue-800/60 rounded-lg border border-blue-600 overflow-hidden"
                              >
                                <div
                                  className="p-3 cursor-pointer hover:bg-blue-800/80 transition-colors"
                                  onClick={() => toggleMoveExpansion(moveId)}
                                >
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-blue-700 text-blue-100 px-3 py-1 rounded-lg font-mono font-bold text-lg flex-shrink-0">
                                      {move.move}
                                    </div>
                                    <div className="text-xs text-blue-300 flex-shrink-0">
                                      Move #{moveNumber}
                                    </div>
                                    <div className="flex-1" />
                                    <div className="text-blue-300 text-xs">
                                      {isExpanded ? "▼" : "▶"}
                                    </div>
                                  </div>
                                  {!isExpanded && (
                                    <div className="text-xs text-blue-200 leading-relaxed line-clamp-2">
                                      💭{" "}
                                      {move.thinking
                                        ? move.thinking.substring(0, 100) +
                                          "..."
                                        : "No analysis recorded"}
                                    </div>
                                  )}
                                </div>
                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-0">
                                    <div className="text-xs text-blue-200 leading-relaxed whitespace-pre-wrap">
                                      💭{" "}
                                      {move.thinking || "No analysis recorded"}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-900/20 rounded-xl border border-blue-700 p-4 text-center">
                      <p className="text-blue-300 text-sm">
                        {currentGame && currentGame.status === "ongoing"
                          ? "Waiting for first move..."
                          : "No moves yet"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scoreboard Section */}
        <div className="mt-8 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-100">
            <Crown className="w-5 h-5 text-blue-400" />
            Leaderboard & Recent Battles
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Scoreboard */}
            <div>
              <h3 className="font-semibold text-slate-200 mb-4 text-lg">
                Model Performance
              </h3>
              <div className="space-y-4">
                {Object.entries(scoreboard).map(([model, stats]) => (
                  <div
                    key={model}
                    className="p-4 bg-slate-800/60 rounded-xl border border-slate-600 hover:bg-slate-800/80 transition-all"
                  >
                    <div className="font-semibold text-slate-100 mb-2">
                      {availableModels.find((m) => m.value === model)?.label ||
                        model}
                    </div>
                    <div className="flex justify-between text-sm text-slate-300 mb-3">
                      <span className="text-green-400">W: {stats.wins}</span>
                      <span className="text-red-400">L: {stats.losses}</span>
                      <span className="text-blue-400">D: {stats.draws}</span>
                      <span className="text-orange-400">
                        O: {stats.ongoing || 0}
                      </span>
                      <span className="text-yellow-400">
                        A: {stats.abandoned || 0}
                      </span>
                      <span className="text-cyan-400 font-semibold">
                        {getWinRate(stats)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${getWinRate(stats)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Games */}
            <div>
              <h3 className="font-semibold text-slate-200 mb-4 text-lg">
                All Games History
              </h3>
              <div className="space-y-3">
                {gameHistory.map((game) => (
                  <div
                    key={game.id}
                    className="p-4 bg-slate-800/60 rounded-xl border border-slate-600 hover:bg-slate-800/80 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm">
                        <span className="text-slate-200 font-medium">
                          {availableModels.find((m) => m.value === game.player1)
                            ?.label || "Unknown"}
                        </span>
                        <span className="text-slate-400 mx-2">vs</span>
                        <span className="text-slate-200 font-medium">
                          {availableModels.find((m) => m.value === game.player2)
                            ?.label || "Unknown"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(game.startedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          game.status === "completed" && game.winner === "draw"
                            ? "bg-blue-500/20 text-blue-400"
                            : game.status === "completed" &&
                              game.winner === "player1"
                            ? "bg-green-500/20 text-green-400"
                            : game.status === "completed" &&
                              game.winner === "player2"
                            ? "bg-green-500/20 text-green-400"
                            : game.status === "ongoing"
                            ? "bg-orange-500/20 text-orange-400"
                            : game.status === "abandoned"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {game.status === "completed" && game.winner === "draw"
                          ? "🤝 Draw"
                          : game.status === "completed" &&
                            game.winner === "player1"
                          ? "⚪ White Wins"
                          : game.status === "completed" &&
                            game.winner === "player2"
                          ? "⚫ Black Wins"
                          : game.status === "ongoing"
                          ? "⏳ Ongoing"
                          : game.status === "abandoned"
                          ? "🚫 Abandoned"
                          : "❌ Error"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {game.totalMoves ||
                          JSON.parse(game.moves || "[]").length}{" "}
                        moves
                      </span>
                    </div>

                    {/* Game Actions */}
                    {(game.pgn || game.moves) && (
                      <div className="flex gap-2 mt-3">
                        {game.pgn && (
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(game.pgn!)
                            }
                            className="flex-1 bg-blue-600/80 text-white py-1 px-2 rounded-lg text-xs font-medium hover:bg-blue-700/80 transition-all"
                          >
                            📄 Copy PGN
                          </button>
                        )}
                        {game.lichessUrl && (
                          <a
                            href={game.lichessUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-orange-600/80 text-white py-1 px-2 rounded-lg text-xs font-medium hover:bg-orange-700/80 transition-all text-center"
                          >
                            🔗 Analyze
                          </a>
                        )}
                        {!game.pgn && game.moves && (
                          <button
                            onClick={() => {
                              // Generate PGN on the fly for older games
                              const pgn = generatePGN();
                              navigator.clipboard.writeText(pgn);
                            }}
                            className="flex-1 bg-slate-600/80 text-white py-1 px-2 rounded-lg text-xs font-medium hover:bg-slate-700/80 transition-all"
                          >
                            📄 Get PGN
                          </button>
                        )}
                      </div>
                    )}

                    {/* Error reason for failed/abandoned games */}
                    {(game.status === "error" || game.status === "abandoned") &&
                      game.errorReason && (
                        <div className="mt-2 p-2 bg-red-900/20 border border-red-800/30 rounded-lg">
                          <div className="text-xs text-red-400 font-medium">
                            Reason:
                          </div>
                          <div className="text-xs text-red-300">
                            {game.errorReason}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
