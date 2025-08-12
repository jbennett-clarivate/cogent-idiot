#!/bin/bash

# Deployment packaging script for cogent-idiot
set -e

# Parse command line arguments
FULL_INSTALL=false
for arg in "$@"; do
    case $arg in
        --full|-f)
            FULL_INSTALL=true
            shift
            ;;
    esac
done

echo "Starting deployment package creation..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/ public_html/
rm -f cogent-idiot-deploy.zip

# Install dependencies (optional)
if [ "$FULL_INSTALL" = true ]; then
    echo "Installing dependencies..."
    npm ci
else
    echo "Skipping dependency installation (use --full or -f to install)"
fi

# Build Angular application for production
echo "Building Angular application..."
ng build --configuration production --output-path public_html

# Create deployment directory structure
echo "Creating deployment package..."
mkdir -p deploy-temp

# Copy server files
cp server.js deploy-temp/
cp package.json deploy-temp/
cp package-lock.json deploy-temp/

# Copy environment file if exists
if [ -f .env ]; then
    cp .env deploy-temp/
fi

# Copy built frontend files
cp -r public_html/ deploy-temp/

# Create zip archive
echo "Creating zip archive..."
cd deploy-temp
zip -r ../cogent-idiot-deploy.zip .
cd ..

# Cleanup
rm -rf deploy-temp

echo "Deployment package created: cogent-idiot-deploy.zip"
echo "Package contents:"
echo "- server.js (Express server)"
echo "- package.json (Dependencies)"
echo "- package-lock.json (Exact versions)"
echo "- public_html/ (Built Angular app)"
echo "- .env (Environment variables, if present)"

echo "To deploy:"
echo "1. Upload cogent-idiot-deploy.zip to server"
echo "2. Extract: unzip cogent-idiot-deploy.zip"
echo "3. Install: npm ci --only=production"
echo "4. Start: node server.js"
