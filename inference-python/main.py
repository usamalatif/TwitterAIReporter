"""
Kitha AI Detection Inference Server v2
FastAPI server using PyTorch DistilBERT model
Trained on short-form AI text (99.33% accuracy)
"""

import os
import time
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification

# Global state
model = None
tokenizer = None
device = None

# HuggingFace model ID (set via env var or use default)
HF_MODEL_ID = os.environ.get("HF_MODEL_ID", "kitha-ai/tweet-detector")


def predict_internal(text: str) -> dict:
    """Run prediction on text"""
    global model, tokenizer, device

    # Tokenize
    encoding = tokenizer(
        text,
        truncation=True,
        max_length=128,
        padding="max_length",
        return_tensors="pt"
    )

    input_ids = encoding["input_ids"].to(device)
    attention_mask = encoding["attention_mask"].to(device)

    # Inference
    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=1)

    # Model outputs: index 0 = Human, index 1 = AI (based on training labels)
    human_prob = probs[0][0].item()
    ai_prob = probs[0][1].item()

    return {
        "aiProb": round(ai_prob, 4),
        "humanProb": round(human_prob, 4)
    }


def load_model_sync():
    """Load model (called during startup)"""
    global model, tokenizer, device

    # Try local path first, then HuggingFace
    local_path = os.environ.get("MODEL_PATH", "./model")

    # Check if local model exists
    if os.path.exists(os.path.join(local_path, "config.json")):
        model_source = local_path
        print(f"Loading model from local path: {local_path}")
    else:
        model_source = HF_MODEL_ID
        print(f"Loading model from HuggingFace: {HF_MODEL_ID}")

    # Set device
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"Using CUDA: {torch.cuda.get_device_name(0)}")
    else:
        device = torch.device("cpu")
        print("Using CPU")

    # Load tokenizer and model
    try:
        tokenizer = DistilBertTokenizer.from_pretrained(model_source)
        model = DistilBertForSequenceClassification.from_pretrained(model_source)
        model.to(device)
        model.eval()
        print("✅ Model loaded successfully")

        # Warmup
        warmup_result = predict_internal("Test text for warmup")
        print(f"✅ Warmup complete: {warmup_result}")

    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    load_model_sync()
    yield


# Initialize FastAPI with lifespan
app = FastAPI(
    title="Kitha AI Detection API",
    description="Detect AI-generated text using fine-tuned DistilBERT",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionRequest(BaseModel):
    text: str


class PredictionResponse(BaseModel):
    aiProb: float
    humanProb: float


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "modelLoaded": model is not None,
        "tokenizerLoaded": tokenizer is not None,
        "device": str(device) if device else None
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Run AI detection on text"""
    start_time = time.time()

    if not model or not tokenizer:
        raise HTTPException(status_code=503, detail="Model not loaded")

    text = request.text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    if len(text) > 1000:
        raise HTTPException(status_code=400, detail="Text too long (max 1000 chars)")

    try:
        result = predict_internal(text)
        elapsed = (time.time() - start_time) * 1000
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Prediction: {len(text)} chars, {elapsed:.1f}ms, AI={result['aiProb']:.2%}")
        return result
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
