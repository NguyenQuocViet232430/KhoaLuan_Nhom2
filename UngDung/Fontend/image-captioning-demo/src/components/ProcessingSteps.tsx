import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  isProcessing: boolean;
  onComplete: () => void;
}

const STEPS = [
  "Trích xuất đặc trưng ảnh",
  "Truy hồi tri thức (FAISS)",
  "Xếp hạng & lọc tri thức",
  "Sinh chú thích (Transformer Decoder)"
];

export const ProcessingSteps: React.FC<Props> = ({ isProcessing, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    let step = 0;
    const intervalTime = 1000;
    
    // Animate the smooth progress bar
    const totalTime = STEPS.length * intervalTime;
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min((elapsed / totalTime) * 100, 100);
      setProgress(percent);
    }, 50);

    const stepInterval = setInterval(() => {
      step++;
      if (step < STEPS.length) {
        setCurrentStep(step);
      } else {
        clearInterval(stepInterval);
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(onComplete, 600); // Wait a bit before completing
      }
    }, intervalTime); // 1 second per step to match the 4s API mock

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [isProcessing, onComplete]);

  if (!isProcessing) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-4 p-6 sm:p-8 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
      <h3 className="font-bold text-gray-800 mb-6 text-center text-lg">Hệ thống đang xử lý...</h3>
      
      {/* Smooth Progress Bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full mb-8 overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>

      <div className="space-y-5">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div key={index} className="flex items-center gap-3 sm:gap-4 relative">
              {/* Connector Line */}
              {index !== STEPS.length - 1 && (
                <div className={`absolute left-[11px] top-8 w-0.5 h-6 -ml-[1px] transition-colors duration-500 ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
              
              <div className="relative z-10 bg-white">
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500 flex-shrink-0" />
                  </motion.div>
                ) : isActive ? (
                  <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="w-6 h-6 sm:w-7 sm:h-7 text-gray-200 flex-shrink-0" fill="white" />
                )}
              </div>

              <span className={`text-sm sm:text-base font-medium transition-colors duration-300 ${
                isCompleted ? 'text-gray-900' : isActive ? 'text-indigo-700' : 'text-gray-400'
              }`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
