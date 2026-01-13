FROM node:20-slim

WORKDIR /app

# Install dependencies for TensorFlow.js native bindings
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy model files
COPY model/ ./model/

# Copy application
COPY server.js ./

# Set environment variables
ENV MODEL_PATH=/app/model
ENV PORT=8000
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Run the application
CMD ["node", "server.js"]
