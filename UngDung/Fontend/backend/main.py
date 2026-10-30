import asyncio
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

app = FastAPI()

# Cấu hình CORS cho phép mọi origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyze")
async def analyze_image(file: UploadFile = File(...)):
    # Đọc dữ liệu nhị phân của file
    contents = await file.read()
    
    try:
        # Sử dụng Pillow để xác thực file có phải là hình ảnh hợp lệ không
        image = Image.open(io.BytesIO(contents))
        image.verify()  # Xác minh (không load toàn bộ image vào RAM)
    except (UnidentifiedImageError, ValueError):
        # Ném lỗi 400 Bad Request nếu không phải ảnh hợp lệ
        raise HTTPException(status_code=400, detail="File tải lên không phải là định dạng ảnh hợp lệ.")
    
    # Giả lập thời gian AI chạy mất 3 giây
    await asyncio.sleep(3)
    
    # Ở đây, trong thực tế bạn có thể đưa `contents` (hoặc image) qua Model Inference
    
    # Trả về kết quả giả lập phù hợp với ngữ cảnh chuẩn đoán
    return {
        "caption": "Phát hiện dấu hiệu bất thường tại vùng A, khả năng cao là đặc điểm B.",
        "knowledgeList": ["Dấu hiệu A", "Đặc điểm B", "Chỉ số C"]
    }
