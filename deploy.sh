#!/bin/bash

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the journal-logs root directory"
    exit 1
fi

print_status "Found project directories"

# Deploy backend first
echo "📦 Deploying backend to Cloudflare Workers..."
cd backend
if npm run deploy; then
    print_status "Backend deployed successfully!"
else
    print_error "Backend deployment failed!"
    exit 1
fi
cd ..

# Deploy frontend to Cloudflare Pages
echo "🌐 Deploying frontend to Cloudflare Pages..."
cd frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

# Build the project
print_status "Building frontend..."
npm run build

# Deploy to Cloudflare Pages
print_status "Deploying to Cloudflare Pages..."
npx wrangler pages deploy out --project-name=journal-logs-frontend

if [ $? -eq 0 ]; then
    print_status "Frontend deployed successfully!"
else
    print_error "Frontend deployment failed!"
    exit 1
fi

cd ..

print_status "🎉 Deployment completed successfully!"
print_warning "Don't forget to:"
echo "1. Update your domain DNS to point to Cloudflare Pages"
echo "2. Update Google OAuth settings with your production URLs"
echo "3. Set up environment variables in Cloudflare Pages dashboard"
echo ""
echo "🔗 Your app should be available at:"
echo "   Frontend: https://journal-logs-frontend.pages.dev"
echo "   Backend:  https://journal-logs.akshayamohan-2401.workers.dev"
