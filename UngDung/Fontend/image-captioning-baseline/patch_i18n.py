with open('frontend/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('lblNoErrors: "Run a dataset evaluation to generate error analysis.",', 'lblNoErrors: "Run a dataset evaluation to generate error analysis.",\n        lblQualitative: "QUALITATIVE RESULTS",\n        lblNoQualitative: "Run a dataset evaluation to see sample predictions.",\n        lblDataset: "Dataset",')

content = content.replace('lblNoErrors: "Chạy đánh giá tập dữ liệu để phân tích lỗi.",', 'lblNoErrors: "Chạy đánh giá tập dữ liệu để phân tích lỗi.",\n        lblQualitative: "KẾT QUẢ ĐỊNH TÍNH",\n        lblNoQualitative: "Chạy đánh giá tập dữ liệu để xem các dự đoán mẫu.",\n        lblDataset: "Tập Dữ Liệu",')

with open('frontend/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
