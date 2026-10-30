import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onProcess: (file: File) => void;
  isProcessing: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const UploadPanel: React.FC<Props> = ({ onProcess, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Logic validate file
  const validateAndSetFile = (file: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Định dạng không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Kích thước ảnh quá lớn. Tối đa 10MB.');
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onProcess(selectedFile);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all duration-200
          ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-gray-300 hover:border-indigo-400 bg-white'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Khu vực tải ảnh lên. Nhấn Enter hoặc Dấu cách để chọn tệp."
      >
        <input 
          type="file" 
          accept="image/jpeg, image/png, image/webp"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isProcessing}
          ref={fileInputRef}
          aria-hidden="true"
        />
        
        <AnimatePresence mode="wait">
          {previewUrl ? (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="relative w-full max-w-md h-48 sm:h-64 mb-4 rounded-lg overflow-hidden shadow-sm border border-gray-200 group">
                <img src={previewUrl} alt="Ảnh xem trước" className="w-full h-full object-contain bg-gray-50 transition-transform duration-300 group-hover:scale-105" />
              </div>
              <p className="text-sm text-gray-500 mb-2 font-medium truncate max-w-full px-4">{selectedFile?.name}</p>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 sm:py-12 pointer-events-none"
            >
              <div className="p-4 bg-indigo-50 rounded-full mb-4">
                <UploadCloud className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Kéo thả ảnh vào đây</h3>
              <p className="text-sm sm:text-base text-gray-500">hoặc click để chọn file từ máy tính</p>
              <p className="text-xs text-gray-400 mt-4">Hỗ trợ JPG, PNG, WEBP (Tối đa 10MB)</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-3 flex items-center justify-center gap-2 text-red-500 text-sm font-medium"
            role="alert"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex justify-center relative z-20">
        <button
          onClick={handleSubmit}
          disabled={!selectedFile || isProcessing || !!error}
          className={`flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full font-semibold text-white transition-all duration-200
            ${(!selectedFile || isProcessing || !!error)
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
            }`}
          aria-label={isProcessing ? "Đang xử lý mô hình" : "Chạy mô hình sinh chú thích"}
        >
          <ImageIcon className="w-5 h-5" />
          {isProcessing ? 'Đang phân tích...' : 'Bắt đầu xử lý'}
        </button>
      </div>
    </div>
  );
};
