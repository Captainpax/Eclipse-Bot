# ==========================================
# Eclipse-Bot Dockerfile
# ==========================================
FROM node:24-alpine

# Set working directory (ensures relative imports work)
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the entire application
COPY . .

# (Optional) If you want to include .env, uncomment this line
# COPY .env .
# Alternatively, mount your .env file at runtime with:
#   docker run --env-file .env ...

# Create groups and bot user
RUN addgroup -S docker 2>/dev/null || true \
    && addgroup -S bot \
    && adduser -S bot -G bot \
    && adduser bot docker || true

# Fix permissions
RUN chown -R bot:bot /usr/src/app

# Expose bot network ports
EXPOSE 5000-5100

# Set environment
ENV NODE_ENV=production

# Start the bot
CMD ["npm", "start"]
