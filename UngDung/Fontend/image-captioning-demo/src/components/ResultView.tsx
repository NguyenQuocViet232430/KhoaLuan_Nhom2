import React from 'react';
import { CheckCircle2, Activity } from 'lucide-react';

interface Props {
  imageSrc: string;
  caption: string;
  knowledgeList: string[];
}

export const ResultView: React.FC<Props> = ({ imageSrc, caption, knowledgeList }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full">
        <img 
          src={imageSrc} 
          alt="Kết quả ảnh" 
          className="w-full rounded-xl shadow-lg object-cover max-h-[500px] border border-gray-100 bg-gray-50" 
        />
      </div>
      
      <div className="flex flex-col justify-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-600" />
          Kết quả Chuẩn đoán
        </h2>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8 shadow-sm relative">
          <CheckCircle2 className="absolute top-6 right-6 w-6 h-6 text-blue-300 opacity-50" />
          <p className="text-xl sm:text-2xl text-blue-900 font-medium leading-relaxed pr-8">
            "{caption}"
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Dấu hiệu nhận biết</h3>
          <div className="flex flex-wrap gap-2.5">
            {knowledgeList.map((k, idx) => (
              <span 
                key={idx} 
                className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
