"use client";

import { Zap, ArrowLeft, Beaker, Lightbulb, Cog } from "lucide-react";
import Link from "next/link";

export default function PhotonicPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-cyan-500/20 rounded-2xl">
              <Zap className="w-16 h-16 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent mb-6">
            Co-Design Photonic Experiments
          </h1>
          <p className="text-slate-300 text-xl leading-relaxed max-w-2xl mx-auto">
            AI-assisted collaborative design and optimization of photonic
            experiments
          </p>
        </div>

        {/* Work in Progress Card */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Cog
                className="w-16 h-16 text-cyan-400 animate-spin"
                style={{ animationDuration: "3s" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Beaker className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-100 mb-4">
            Work in Progress
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            This exciting new feature is currently under development. We're
            building an intelligent system to help researchers collaborate on
            designing and optimizing photonic experiments using cutting-edge AI
            methodologies.
          </p>

          {/* Features Coming Soon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 bg-slate-800/60 rounded-xl border border-slate-600">
              <Lightbulb className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                Intelligent Design
              </h3>
              <p className="text-slate-400 text-sm">
                AI-powered suggestions for optimal experimental configurations
              </p>
            </div>

            <div className="p-6 bg-slate-800/60 rounded-xl border border-slate-600">
              <Zap className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                Real-time Optimization
              </h3>
              <p className="text-slate-400 text-sm">
                Dynamic parameter tuning for enhanced experimental outcomes
              </p>
            </div>

            <div className="p-6 bg-slate-800/60 rounded-xl border border-slate-600">
              <Beaker className="w-8 h-8 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                Collaborative Platform
              </h3>
              <p className="text-slate-400 text-sm">
                Seamless collaboration tools for research teams
              </p>
            </div>
          </div>

          <div className="mt-12 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
            <p className="text-cyan-300 text-sm">
              Interested in early access or collaboration? Get in touch to learn
              more about this upcoming feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
