FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model and server
COPY model/ ./model/
COPY main.py .

# Set environment
ENV MODEL_PATH=/app/model
ENV PORT=8000

# Expose port
EXPOSE 8000

# Run server
CMD ["python", "main.py"]
