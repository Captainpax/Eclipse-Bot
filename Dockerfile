# Eclipse-Bot Dockerfile
FROM node:24-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for caching
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Create docker group safely and add bot user
RUN addgroup -S docker 2>/dev/null || true \
    && addgroup -S bot \
    && adduser -S bot -G bot \
    && adduser bot docker || true

# Set environment variables
ENV NODE_ENV=production

# Start the bot
CMD ["npm", "start"]
