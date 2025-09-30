#!/bin/bash

# Pre-deployment Checklist Script
echo "🔍 Social Network Project - Pre-deployment Checklist"
echo "=================================================="

# Check if all required files exist
echo "📂 Checking required files..."
files=(
    "package.json"
    "Dockerfile.prod"
    "backend/package.json"
    "backend/Dockerfile.prod"
    "docker-compose.render.yml"
    "render.yaml"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🔧 Environment Variables Checklist:"
echo "-----------------------------------"
echo "❓ Have you set up MongoDB Atlas? (Y/n)"
echo "❓ Have you set up Redis Cloud? (Y/n)"
echo "❓ Have you configured Cloudinary? (Y/n)"
echo "❓ Have you set up Firebase project? (Y/n)"
echo "❓ Have you generated VAPID keys? (Y/n)"
echo "❓ Do you have a Gmail app password for emails? (Y/n)"

echo ""
echo "🚀 Next Steps:"
echo "1. Push your code to GitHub"
echo "2. Go to render.com and create account"
echo "3. Create new Blueprint with your GitHub repo"
echo "4. Configure environment variables in Render dashboard"
echo "5. Deploy!"

echo ""
echo "📚 For detailed instructions, see: RENDER_DEPLOYMENT_GUIDE.md"