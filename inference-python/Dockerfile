FROM python:3.11-slim

WORKDIR /app

# Install git and git-lfs
RUN apt-get update && apt-get install -y git git-lfs && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (for caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone repo and fetch LFS files for model
RUN git lfs install && \
    git clone --depth 1 https://github.com/usamalatif/TwitterAIReporter.git temp && \
    cd temp && \
    git lfs pull --include="inference-python/model/*" && \
    mv inference-python/model /app/model && \
    cd .. && rm -rf temp

# Copy server code
COPY main.py .

# Set environment
ENV MODEL_PATH=/app/model
ENV PORT=8000

# Expose port
EXPOSE 8000

# Run server
CMD ["python", "main.py"]
