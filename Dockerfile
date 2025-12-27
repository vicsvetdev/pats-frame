# Use Node 20 Alpine for minimal footprint
FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy all application source code and assets
COPY . .

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
