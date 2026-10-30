import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Loader2, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResultView } from '../components/ResultView';
import { saveHistoryItem, compressImageToBase64 } from '../services/historyStorage';
import toast from 'react-hot-toast';

interface SimpleResult {
  caption: string;
  knowledgeList: string[];
}

export const AppPage = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SimpleResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

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
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn một file định dạng ảnh hợp lệ!");
      return;
    }
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
    processImage(file, url);
  };

  const processImage = async (file: File, url: string) => {
    setIsProcessing(true);
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Lỗi kết nối tới máy chủ AI. Vui lòng kiểm tra lại Backend!');
      }

      const data = await response.json();
      
      setResult(data);
      setIsProcessing(false);
      toast.success("Phân tích thành công!");
      
      const time = (Date.now() - startTime) / 1000;

      compressImageToBase64(file).then(base64 => {
        saveHistoryItem({
          thumbnailBase64: base64,
          result: data,
          processingTime: time
        });
      });
    } catch (err: any) {
      toast.error(err.message || 'Lỗi không xác định.');
      setIsProcessing(false);
      setSelectedImage(null); // Reset để người dùng thử lại
    }
  };

  const resetState = () => {
    setSelectedImage(null);
    setResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="pt-10 pb-20 px-4 sm:px-6">
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
          Hệ thống Chuẩn đoán AI
        </h2>
        <p className="text-base sm:text-lg text-gray-600">
          Tải ảnh lên để hệ thống tự động phân tích các dấu hiệu nhận biết.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selectedImage && !isProcessing && !result && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl mx-auto"
          >
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center p-16 sm:p-24 border-4 border-dashed rounded-3xl cursor-pointer transition-all duration-300
                ${dragActive 
                  ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' 
                  : 'border-gray-300 hover:border-indigo-400 bg-white hover:bg-gray-50'
                }`}
            >
              <input 
                type="file" 
                accept="image/*"
                onChange={handleChange}
                ref={fileInputRef}
                className="hidden" 
              />
              <div className={`p-4 rounded-full mb-6 transition-colors ${dragActive ? 'bg-indigo-100' : 'bg-indigo-50'}`}>
                <UploadCloud className={`w-16 h-16 transition-colors ${dragActive ? 'text-indigo-600' : 'text-indigo-500'}`} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Kéo thả hoặc click để chọn ảnh</h3>
              <p className="text-gray-500">Hỗ trợ các định dạng JPG, PNG, WEBP</p>
            </div>
          </motion.div>
        )}

        {isProcessing && selectedImage && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative mb-8">
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="w-48 h-48 sm:w-64 sm:h-64 object-cover rounded-2xl opacity-40 shadow-inner blur-sm grayscale" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 p-4 rounded-full shadow-xl">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 animate-pulse">
              AI đang phân tích dữ liệu, vui lòng đợi...
            </h3>
          </motion.div>
        )}

        {result && !isProcessing && selectedImage && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <ResultView 
              imageSrc={selectedImage} 
              caption={result.caption} 
              knowledgeList={result.knowledgeList} 
            />
            
            <button
              onClick={resetState}
              className="mt-12 flex items-center gap-2 px-8 py-3 bg-white border-2 border-gray-200 hover:border-indigo-600 hover:text-indigo-600 text-gray-700 font-bold rounded-full transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <RefreshCcw className="w-5 h-5" />
              Thử ảnh khác
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
