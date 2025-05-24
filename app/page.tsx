"use client";

import { Crown, Zap, Github, Mail, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent mb-6">
            Cerebras Hackathon Demo
          </h1>
          <p className="text-slate-300 text-xl leading-relaxed mb-8">
            5 hours of fun 😎
          </p>
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Chess Arena */}
          <Link href="/chess">
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-8 hover:border-blue-500/50 transition-all duration-300 cursor-pointer group">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                  <Crown className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100">
                  LLM Chess Arena
                </h2>
              </div>
              <p className="text-slate-300 mb-4">
                Compare different large language models through strategic chess
                gameplay. Test long-term planning and agentic reasoning
                capabilities.
              </p>
              <div className="flex items-center gap-2 text-blue-400 font-medium">
                <span>Enter Arena</span>
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Photonic Experiments */}
          <Link href="/photonic">
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-8 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer group">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-cyan-500/20 rounded-xl group-hover:bg-cyan-500/30 transition-colors">
                  <Zap className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100">
                  Co-Design Photonic Experiments
                </h2>
              </div>
              <p className="text-slate-300 mb-4">
                Collaborative design and optimization of photonic experiments
                using AI-assisted methodologies.
              </p>
              <div className="flex items-center gap-2 text-cyan-400 font-medium">
                <span>Work in Progress</span>
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Featured Project: LLM Chess Arena */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-slate-100 mb-6">
            Featured Project: LLM Chess Arena
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Live Demo
              </h4>
              <a
                href="https://chess.alex.ad/chess"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                chess.alex.ad
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Code
              </h4>
              <a
                href="#"
                className="text-blue-400 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                GitHub Repository
              </a>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                Contact
              </h4>
              <a
                href="mailto:alex@al-fegha.li"
                className="text-blue-400 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Alexander Al-Feghali
              </a>
            </div>
          </div>

          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              I built a web portal to compare different large language models
              (LLMs) and providers using a standardized task: playing chess.
              This site is built with next.js for the frontend and backend,
              chess.js for move logic and openrouter for flexible LLM selection.
            </p>
            <p>
              Since many LLMs perform similarly across general benchmarks due to
              wide-distribution training, chess offers a focused and
              interpretable proxy for evaluating long-term planning and agentic
              reasoning. The system reveals how small, quantized models tend to
              blunder by midgame, and highlights instruction-following
              inconsistencies. Recent work like{" "}
              <a
                href="https://arxiv.org/abs/2505.15811"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-cyan-400 transition-colors"
              >
                arXiv:2505.15811
              </a>{" "}
              highlights the hierarchical and nonlocal structure of skills,
              reinforcing the difficulty of reliably eliciting narrow
              capabilities from small models.
            </p>
            <p>
              Future improvements include enhanced board history tracking,
              varied text encodings of board states to test how representation
              affects LLM performance, as well as exploring SAE-based
              interpretability and intervention, taking inspiration from Adam
              Karvonen's work on Chess-GPT.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
