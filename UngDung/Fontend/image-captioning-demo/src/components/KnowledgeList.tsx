import React from 'react';
import { KnowledgeItem as KnowledgeItemType } from '../services/api';
import { Database, AlignLeft, Hash, Link as LinkIcon, Box, SearchX } from 'lucide-react';
import { KnowledgeItem } from './KnowledgeItem';

interface Props {
  items: KnowledgeItemType[];
}

export const KnowledgeList: React.FC<Props> = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
        <SearchX className="w-10 h-10 text-gray-400 mb-3" />
        <h4 className="text-gray-700 font-medium mb-1">Không tìm thấy tri thức</h4>
        <p className="text-sm text-gray-500">
          Mô hình không truy hồi được tri thức liên quan nào cho hình ảnh này.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar focus:outline-none" tabIndex={0} aria-label="Danh sách tri thức đã truy hồi">
      {items.sort((a, b) => b.score - a.score).map((item, idx) => (
        <KnowledgeItem key={item.id} item={item} index={idx} />
      ))}
    </div>
  );
};
