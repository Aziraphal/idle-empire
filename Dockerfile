# Use the official Node.js 18 image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Run database migrations during build (instead of runtime)
RUN npx prisma db push --accept-data-loss

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]