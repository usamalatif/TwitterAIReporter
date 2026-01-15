FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model files directly (Railway will pull LFS files if configured)
# If model files are missing, the server will try to download from HuggingFace
COPY model/ ./model/
COPY main.py .

# Set environment
ENV MODEL_PATH=/app/model
ENV PORT=8000

# Expose port
EXPOSE 8000

# Run server
CMD ["python", "main.py"]
