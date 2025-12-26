# Use Node 20 Slim (Debian-based) for better native module compatibility
FROM node:20-slim

# Install system dependencies required for node-canvas
# Debian uses apt-get
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Install only production dependencies
# node:20-slim is more likely to find prebuilt binaries for canvas
RUN npm ci --only=production

# Copy all application source code and assets
COPY . .

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
