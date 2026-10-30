import React from 'react';
import { KnowledgeItem as KnowledgeItemType } from '../services/api';
import { Database, AlignLeft, Hash, Link as LinkIcon, Box } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  item: KnowledgeItemType;
  index: number;
}

const getTypeIcon = (type: KnowledgeItemType['type']) => {
  switch (type) {
    case 'caption': return <AlignLeft className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'triple': return <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'attribute': return <Hash className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'object': return <Box className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'relation': return <Database className="w-4 h-4 sm:w-5 sm:h-5" />;
  }
};

const getTypeColor = (type: KnowledgeItemType['type']) => {
  switch (type) {
    case 'caption': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'triple': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'attribute': return 'bg-pink-100 text-pink-700 border-pink-200';
    case 'object': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'relation': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
};

const getTypeName = (type: KnowledgeItemType['type']) => {
  switch (type) {
    case 'caption': return 'Caption tương tự';
    case 'triple': return 'Bộ ba tri thức';
    case 'attribute': return 'Thuộc tính';
    case 'object': return 'Đối tượng';
    case 'relation': return 'Quan hệ';
  }
};

export const KnowledgeItem: React.FC<Props> = ({ item, index }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="flex items-start p-3 sm:p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-indigo-500"
      tabIndex={0}
      aria-label={`Tri thức loại ${getTypeName(item.type)}: ${item.content}. Điểm: ${(item.score * 100).toFixed(1)}%`}
    >
      <div className={`p-2 sm:p-2.5 rounded-lg mr-3 sm:mr-4 flex-shrink-0 border ${getTypeColor(item.type)}`}>
        {getTypeIcon(item.type)}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-500">
            {getTypeName(item.type)}
          </span>
          <span className="text-xs font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
            {(item.score * 100).toFixed(1)}%
          </span>
        </div>
        <p className="text-sm sm:text-base text-gray-800 break-words font-medium leading-snug mb-2">{item.content}</p>
        <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2 overflow-hidden" aria-hidden="true">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${item.score * 100}%` }}
            transition={{ duration: 0.8, delay: 0.2 + (index * 0.1), ease: "easeOut" }}
            className="bg-indigo-500 h-full rounded-full" 
          />
        </div>
      </div>
    </motion.div>
  );
};
