import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  title: string;
  caption: string;
  isEnhanced?: boolean;
}

export const CaptionCard: React.FC<Props> = ({ title, caption, isEnhanced = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative p-5 sm:p-6 rounded-2xl border-2 transition-all duration-300 ${
      isEnhanced 
        ? 'border-indigo-400 bg-gradient-to-br from-indigo-50/80 to-purple-50/30 shadow-md hover:shadow-lg' 
        : 'border-gray-200 bg-white shadow-sm hover:border-gray-300'
    }`}>
      {isEnhanced && (
        <div className="absolute -top-3 -right-2 sm:-right-4 px-3 sm:px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-md transform rotate-2">
          Có tri thức hỗ trợ
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 sm:p-2 rounded-lg ${isEnhanced ? 'bg-indigo-100' : 'bg-gray-100'}`}>
            {isEnhanced ? (
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            ) : (
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            )}
          </div>
          <h3 className={`font-bold text-base sm:text-lg ${isEnhanced ? 'text-indigo-900' : 'text-gray-800'}`}>
            {title}
          </h3>
        </div>

        <button 
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            copied 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:ring-gray-300'
          }`}
          aria-label={copied ? "Đã sao chép" : "Sao chép chú thích"}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Đã copy' : 'Copy'}
        </button>
      </div>

      <motion.p 
        key={caption}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-gray-800 leading-relaxed text-base sm:text-lg font-medium bg-white/50 p-4 rounded-xl border border-gray-100/50 backdrop-blur-sm"
      >
        "{caption}"
      </motion.p>
    </div>
  );
};
