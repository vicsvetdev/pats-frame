# Use specific Node version on Alpine
FROM node:20-alpine

# Install system dependencies required for node-canvas
# cairo, pango, jpeg, giflib are core requirements
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy all application source code and assets
# (The .dockerignore file prevents copying node_modules, .git, etc.)
COPY . .

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
