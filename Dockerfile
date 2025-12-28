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

# Copy only package.json (ignore lock file to regenerate fresh)
COPY package.json ./

# Force npm to use public registry and install only production dependencies
# Delete any existing npm config and regenerate lock file fresh
RUN rm -f /root/.npmrc /usr/local/etc/npmrc && \
    echo "registry=https://registry.npmjs.org/" > /root/.npmrc && \
    npm cache clean --force && \
    npm install --omit=dev

# Copy all application source code and assets
COPY . .

# Expose the default port
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
