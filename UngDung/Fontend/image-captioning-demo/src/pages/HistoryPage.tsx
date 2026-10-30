import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HistoryItem, getHistoryItems, deleteHistoryItem, clearHistory } from '../services/historyStorage';
import { ResultView } from '../components/ResultView';
import { Trash2, Calendar, Database as DatabaseIcon, PlayCircle, AlertCircle } from 'lucide-react';

export const HistoryPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setItems(getHistoryItems());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteHistoryItem(id);
    setItems(getHistoryItems());
  };

  const handleClearAll = () => {
    clearHistory();
    setItems([]);
    setShowConfirm(false);
  };

  if (selectedItem) {
    return (
      <div className="pt-6 pb-20 animate-in fade-in">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
          <button 
            onClick={() => setSelectedItem(null)}
            className="inline-flex items-center gap-2 px-4 py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold rounded-lg transition-colors border border-indigo-200 shadow-sm"
          >
            &larr; Quay lại danh sách
          </button>
        </div>
        <div className="px-4">
          <ResultView 
            imageSrc={selectedItem.thumbnailBase64}
            caption={selectedItem.result.caption}
            knowledgeList={selectedItem.result.knowledgeList}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Lịch sử thực nghiệm</h2>
          <p className="text-gray-600 mt-2">Xem lại kết quả của các lần sinh chú thích trước đó (Tối đa 20 bản ghi).</p>
        </div>
        
        {items.length > 0 && (
          <button 
            onClick={() => setShowConfirm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 font-medium rounded-lg transition-colors border border-red-200"
          >
            <Trash2 className="w-4 h-4" />
            Xoá tất cả
          </button>
        )}
      </div>

      {showConfirm && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 text-red-800 font-medium">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            Bạn có chắc chắn muốn xoá toàn bộ lịch sử? Hành động này không thể hoàn tác.
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Huỷ
            </button>
            <button 
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-sm transition-colors"
            >
              Xoá tất cả
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">Chưa có dữ liệu</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            Bạn chưa thực hiện sinh chú thích nào. Hãy tải lên một bức ảnh ở trang Demo để hệ thống lưu lại kết quả tại đây.
          </p>
          <button 
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full transition-colors shadow-sm"
          >
            <PlayCircle className="w-5 h-5" />
            Đến trang Demo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden group flex flex-col"
              >
                <div className="aspect-video w-full overflow-hidden bg-gray-100 relative border-b border-gray-100">
                  <img 
                    src={item.thumbnailBase64} 
                    alt="Thumbnail" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0"
                    title="Xoá bản ghi này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.timestamp).toLocaleString('vi-VN')}
                  </div>
                  
                  <p className="text-gray-800 font-medium text-sm line-clamp-2 mb-4 flex-grow italic">
                    "{item.result.caption}"
                  </p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                      <DatabaseIcon className="w-3.5 h-3.5" />
                      {item.result.knowledgeList.length} tri thức
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{item.processingTime.toFixed(1)}s</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
