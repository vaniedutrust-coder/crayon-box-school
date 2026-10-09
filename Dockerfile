# Multi-stage, ultra-lightweight production container for Crayon Box School
FROM node:22-alpine

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app

# Copy application files
COPY . .

# Ensure storage directories exist with write permissions
RUN mkdir -p uploads/resumes uploads/images backups/pages \
    && chmod -R 755 uploads backups

# Expose HTTP port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start native Node.js engine
CMD ["node", "server.js"]
