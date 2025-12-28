# Use Node 20 Alpine for minimal footprint
FROM node:20-alpine

WORKDIR /app

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROMIUM_PATH=/usr/bin/chromium-browser

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy all application source code and assets
COPY . .

# Expose the default port
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
