import os
import io
import time
from PIL import Image
from backend.services.caption_service import get_caption_service
from fastapi.testclient import TestClient
from backend.main import app

def create_test_images():
    os.makedirs("test_images", exist_ok=True)
    
    # 1. JPG (RGB)
    img_jpg = Image.new('RGB', (100, 100), color='red')
    img_jpg.save("test_images/test.jpg")
    
    # 2. PNG (RGB)
    img_png = Image.new('RGB', (100, 100), color='blue')
    img_png.save("test_images/test.png")
    
    # 3. Grayscale
    img_gray = Image.new('L', (100, 100), color=128)
    img_gray.save("test_images/test_gray.png")
    
    # 4. Alpha PNG
    img_alpha = Image.new('RGBA', (100, 100), color=(255, 0, 0, 128))
    img_alpha.save("test_images/test_alpha.png")
    
    # 5. Non-image
    with open("test_images/test.txt", "w") as f:
        f.write("This is not an image.")

def run_tests():
    print("--- STARTING PHASE 1 FINAL VALIDATION TESTS ---")
    
    # Load model
    service = get_caption_service()
    service.load_model()
    print(f"Model loaded: {service.is_ready()} on device: {service.captioner.device}")
    
    client = TestClient(app)
    
    # 1. Health check
    response = client.get("/api/health")
    print(f"Health API: {response.json()}")
    
    create_test_images()
    
    # 2. Test JPG
    with open("test_images/test.jpg", "rb") as f:
        res = client.post("/api/caption", files={"image": ("test.jpg", f, "image/jpeg")})
        print(f"JPG Test: {res.json()}")
        
    # 3. Test PNG
    with open("test_images/test.png", "rb") as f:
        res = client.post("/api/caption", files={"image": ("test.png", f, "image/png")})
        print(f"PNG Test: {res.json()}")
        
    # 4. Test Grayscale
    with open("test_images/test_gray.png", "rb") as f:
        res = client.post("/api/caption", files={"image": ("test_gray.png", f, "image/png")})
        print(f"Grayscale Test: {res.json()}")
        
    # 5. Test Alpha
    with open("test_images/test_alpha.png", "rb") as f:
        res = client.post("/api/caption", files={"image": ("test_alpha.png", f, "image/png")})
        print(f"Alpha PNG Test: {res.json()}")
        
    # 6. Test Non-image
    with open("test_images/test.txt", "rb") as f:
        res = client.post("/api/caption", files={"image": ("test.txt", f, "text/plain")})
        print(f"Invalid File Test: {res.json()}")

if __name__ == '__main__':
    run_tests()
