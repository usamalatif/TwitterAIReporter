#!/bin/bash
# TweetGuard AI - Local Training Setup for macOS (Apple Silicon)

echo "=========================================="
echo "🤖 TweetGuard AI - Local Training Setup"
echo "=========================================="

cd "$(dirname "$0")"

# Remove old venv if exists
if [ -d "venv" ]; then
    echo "🗑️ Removing old virtual environment..."
    rm -rf venv
fi

# Try to install Python 3.11 via pyenv (recommended)
echo ""
echo "Checking for Python 3.11..."

if command -v pyenv &> /dev/null; then
    # Check if 3.11 is available
    if pyenv versions | grep -q "3.11"; then
        echo "✅ Python 3.11 found in pyenv"
        PYTHON_CMD="pyenv exec python3.11"
    else
        echo "📦 Installing Python 3.11 via pyenv..."
        echo "   (This may take a few minutes)"

        # Install dependencies for lzma support
        brew install xz 2>/dev/null || true

        # Install Python 3.11
        CFLAGS="-I$(brew --prefix xz)/include" \
        LDFLAGS="-L$(brew --prefix xz)/lib" \
        pyenv install 3.11.7

        PYTHON_CMD="$HOME/.pyenv/versions/3.11.7/bin/python3"
    fi
else
    # Use system Python or install via brew
    if command -v /opt/homebrew/bin/python3.11 &> /dev/null; then
        PYTHON_CMD="/opt/homebrew/bin/python3.11"
    elif command -v /usr/local/bin/python3.11 &> /dev/null; then
        PYTHON_CMD="/usr/local/bin/python3.11"
    else
        echo "📦 Installing Python 3.11 via Homebrew..."
        brew install python@3.11
        PYTHON_CMD="/opt/homebrew/bin/python3.11"
    fi
fi

echo "Using: $PYTHON_CMD"

# Create virtual environment
echo ""
echo "📦 Creating virtual environment..."
$PYTHON_CMD -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo ""
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install PyTorch with MPS support (Apple Silicon)
echo ""
echo "🔥 Installing PyTorch with MPS support..."
pip install torch torchvision torchaudio

# Install other requirements
echo ""
echo "📚 Installing other dependencies..."
pip install transformers datasets accelerate
pip install tensorflow-macos tensorflow-metal 2>/dev/null || pip install tensorflow
pip install tensorflowjs
pip install scikit-learn numpy pandas
pip install matplotlib seaborn tqdm

echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo "=========================================="
echo ""
echo "To start training, run:"
echo ""
echo "  cd $(pwd)"
echo "  source venv/bin/activate"
echo "  python train_local.py"
echo ""
echo "Estimated training time: 1-2 hours on Apple Silicon"
echo "=========================================="
