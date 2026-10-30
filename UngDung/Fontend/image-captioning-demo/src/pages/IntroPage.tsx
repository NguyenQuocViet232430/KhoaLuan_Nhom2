import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayCircle, Database, Layout, FileSearch, ImageUp } from 'lucide-react';

export const IntroPage = () => {
  const navigate = useNavigate();

  const steps = [
    { icon: <ImageUp className="w-6 h-6" />, title: "Tải ảnh", desc: "Người dùng tải lên một hình ảnh đầu vào." },
    { icon: <FileSearch className="w-6 h-6" />, title: "Phân tích", desc: "Sử dụng mô hình để trích xuất đặc trưng của ảnh." },
    { icon: <Database className="w-6 h-6" />, title: "Truy xuất", desc: "Tìm kiếm các tri thức ngữ nghĩa liên quan từ cơ sở dữ liệu." },
    { icon: <Layout className="w-6 h-6" />, title: "Sinh Caption", desc: "Kết hợp đặc trưng và tri thức để sinh câu mô tả hoàn chỉnh." },
  ];

  const highlights = [
    {
      title: "Độ chính xác cao",
      desc: "Sinh ra chú thích chi tiết và sát với ngữ cảnh thực tế của bức ảnh nhờ việc bổ sung thông tin từ kho tri thức khổng lồ."
    },
    {
      title: "Tốc độ phản hồi",
      desc: "Quy trình tối ưu hoá từ việc trích xuất đặc trưng đến truy hồi FAISS, đảm bảo thời gian xử lý nhanh chóng."
    },
    {
      title: "Bảo mật dữ liệu",
      desc: "Hình ảnh tải lên được xử lý cục bộ hoặc qua kênh mã hóa an toàn, không lưu trữ trái phép dữ liệu người dùng."
    }
  ];

  return (
    <div className="overflow-hidden pb-20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 sm:pt-32 sm:pb-32 px-4 bg-gradient-to-b from-indigo-50/50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm mb-6 border border-indigo-200">
              Prototype Nghiên Cứu
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
              Phát triển mô hình chú thích ảnh <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                tăng cường truy hồi tri thức
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Mô hình kết hợp kỹ thuật truy hồi ngữ nghĩa để bổ sung thông tin nền, giúp quá trình sinh chú thích (Image Captioning) trở nên phong phú, chi tiết và chính xác hơn phương pháp truyền thống.
            </p>
            
            <button 
              onClick={() => navigate('/app')}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-full transition-all shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1"
            >
              <PlayCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
              Trải nghiệm demo ngay
            </button>
          </motion.div>
        </div>
      </section>

      {/* Pipeline Section */}
      <section className="py-20 px-4 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Quy trình xử lý</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Cấu trúc 4 bước của mô hình giúp xử lý từ hình ảnh thô đến câu mô tả hoàn chỉnh có tính ngữ nghĩa cao.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-12 left-1/8 right-1/8 h-0.5 bg-gradient-to-r from-indigo-100 via-indigo-200 to-indigo-100 z-0"></div>
            
            {steps.map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.5 }}
                className="relative z-10 flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 rotate-3 hover:rotate-0 transition-transform">
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {idx + 1}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Điểm Nổi Bật</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {highlights.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-indigo-300 shadow-sm transition-colors"
              >
                <h3 className="text-xl font-bold text-indigo-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
