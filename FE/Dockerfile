# Use an official Node.js runtime as a parent image
FROM node:18-alpine
# Set the working directory
WORKDIR /app
# Copy the package.json and package-lock.json (if available)
COPY package*.json ./
# Install dependencies
RUN npm install
# Copy the rest of your application files
COPY . .
# Build the Next.js app
RUN npm run build
# Expose the port the app runs on
EXPOSE 3000
# Start the Next.js app
CMD ["npm", "start"]
