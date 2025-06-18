# # Use Node.js 18 LTS
# FROM node:18-alpine

# # Set working directory
# WORKDIR /app

# # Copy package files
# COPY package*.json ./

# # Install dependencies
# RUN npm ci --only=production

# # Copy source code
# COPY . .

# # Build the application
# RUN npm run build

# # Expose the port
# EXPOSE 8000

# # Set environment to production
# ENV NODE_ENV=production

# # Start the HTTP server
# CMD ["npm", "start"] 

### STAGE 1: build ###
FROM node:18-alpine AS builder
WORKDIR /app

# 1. Copy package.json & lockfile, install ALL deps (including dev)
COPY package*.json ./
RUN npm ci

# 2. Copy source & compile
COPY . .
RUN npm run build


### STAGE 2: runtime ###
FROM node:18-alpine
WORKDIR /app

# 3. Copy only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# 4. Copy compiled output
COPY --from=builder /app/dist ./dist

# 5. Expose port & launch
EXPOSE 8000
ENV NODE_ENV=production
CMD ["npm", "start"]
