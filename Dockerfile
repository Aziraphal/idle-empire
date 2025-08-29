# Use Node.js 18 with a more compatible base for Prisma
FROM node:18-alpine

# Install OpenSSL and other dependencies needed by Prisma
RUN apk add --no-cache openssl libc6-compat

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

# Expose port
EXPOSE 3000

# Create a startup script that handles DB migration gracefully
COPY <<EOF /app/start.sh
#!/bin/sh
echo "Starting application..."

# Try to run database migration with timeout and retry
echo "Running database migration..."
timeout 30s npx prisma db push --accept-data-loss || {
  echo "Database migration failed or timed out, starting app anyway..."
}

echo "Starting Next.js application..."
exec npm start
EOF

RUN chmod +x /app/start.sh

# Start command
CMD ["/app/start.sh"]