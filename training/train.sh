#!/bin/bash
# Full training pipeline for AI Tweet Detection Model
# Usage: ./train.sh

set -e

echo "=============================================="
echo "🚀 Kitha AI Tweet Detection Model Training"
echo "=============================================="

# Change to training directory
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo ""
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

# Step 1: Download datasets
echo ""
echo "=============================================="
echo "Step 1/3: Downloading datasets"
echo "=============================================="
python scripts/download_datasets.py --output data

# Step 2: Train model
echo ""
echo "=============================================="
echo "Step 2/3: Training model"
echo "=============================================="
python scripts/train_model.py \
    --data data \
    --output models/distilbert-ai-detector \
    --epochs 5 \
    --batch-size 32 \
    --learning-rate 2e-5

# Step 3: Export to TensorFlow.js
echo ""
echo "=============================================="
echo "Step 3/3: Exporting to TensorFlow.js"
echo "=============================================="
python scripts/export_model.py \
    --model models/distilbert-ai-detector/final \
    --output models/tfjs

# Deploy to inference server
echo ""
echo "=============================================="
echo "📦 Deploying to inference server"
echo "=============================================="
if [ -d "../inference/model" ]; then
    echo "Backing up existing model..."
    mv ../inference/model ../inference/model.backup.$(date +%Y%m%d_%H%M%S)
fi

mkdir -p ../inference/model
cp -r models/tfjs/tfjs/* ../inference/model/

echo ""
echo "=============================================="
echo "✅ Training complete!"
echo "=============================================="
echo ""
echo "Model deployed to: ../inference/model/"
echo ""
echo "Next steps:"
echo "  1. Restart the inference server:"
echo "     cd ../inference && npm start"
echo ""
echo "  2. Test the model:"
echo "     curl -X POST http://localhost:8000/predict -H 'Content-Type: application/json' -d '{\"text\": \"This is a test\"}'"
echo ""
