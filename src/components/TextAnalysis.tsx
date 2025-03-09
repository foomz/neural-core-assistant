import React from 'react';
import { BarChart, Brain, Clock, FileText, Hash, Heart, Users } from 'lucide-react';
import type { TextAnalysis } from '../lib/nlp';

interface TextAnalysisProps {
  analysis: TextAnalysis;
}

export function TextAnalysisPanel({ analysis }: TextAnalysisProps) {
  const sentimentColor = 
    analysis.sentiment.label === 'positive' ? 'text-green-400' :
    analysis.sentiment.label === 'negative' ? 'text-red-400' :
    'text-gray-400';

  return (
    <div className="bg-black/30 rounded-lg border border-white/10 p-4 space-y-4">
      {/* Sentiment */}
      <div className="flex items-center gap-2">
        <Heart className={`w-5 h-5 ${sentimentColor}`} />
        <span className="text-sm text-gray-300">Sentiment:</span>
        <span className={`font-medium capitalize ${sentimentColor}`}>
          {analysis.sentiment.label}
        </span>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-indigo-400" />
          <div>
            <div className="text-sm text-gray-400">Words</div>
            <div className="font-medium text-white">{analysis.stats.wordCount}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-sm text-gray-400">Sentences</div>
            <div className="font-medium text-white">{analysis.stats.sentenceCount}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          <div>
            <div className="text-sm text-gray-400">Reading Time</div>
            <div className="font-medium text-white">{analysis.stats.readingTime} min</div>
          </div>
        </div>
      </div>

      {/* Entities */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <span className="text-sm text-gray-300">Named Entities</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(analysis.entities).map(([type, items]) => (
            items.length > 0 && (
              <div key={type} className="bg-white/5 rounded p-2">
                <div className="text-gray-400 capitalize mb-1">{type}</div>
                <div className="space-y-1">
                  {items.map((item, index) => (
                    <div key={index} className="text-white">{item}</div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-emerald-400" />
          <span className="text-sm text-gray-300">Key Topics</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {analysis.topics.map((topic, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BarChart className="w-5 h-5 text-amber-400" />
          <span className="text-sm text-gray-300">Summary</span>
        </div>
        <p className="text-white text-sm">{analysis.summary}</p>
      </div>
    </div>
  );
}