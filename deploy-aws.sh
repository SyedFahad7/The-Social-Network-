#!/bin/bash

# AWS Deployment Script for Social Network Project
# This script automates the deployment process to AWS

set -e  # Exit on any error

echo "🚀 Starting AWS Deployment for Social Network Project"
echo "=================================================="

# Configuration
AWS_REGION="ap-south-1"
PROJECT_NAME="social-network"
FRONTEND_REPO="social-network-frontend"
BACKEND_REPO="social-network-backend"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "✅ AWS Account ID: ${AWS_ACCOUNT_ID}"
echo "✅ ECR Base URL: ${ECR_BASE_URL}"

# Step 1: Create ECR Repositories
echo ""
echo "📦 Creating ECR Repositories..."

# Create frontend repository
aws ecr create-repository \
  --repository-name ${FRONTEND_REPO} \
  --region ${AWS_REGION} \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  2>/dev/null || echo "Frontend repository already exists"

# Create backend repository
aws ecr create-repository \
  --repository-name ${BACKEND_REPO} \
  --region ${AWS_REGION} \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  2>/dev/null || echo "Backend repository already exists"

echo "✅ ECR repositories created/verified"

# Step 2: Authenticate Docker to ECR
echo ""
echo "🔐 Authenticating Docker to ECR..."

aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_BASE_URL}

echo "✅ Docker authenticated to ECR"

# Step 3: Build and Tag Images
echo ""
echo "🏗️ Building Docker Images..."

# Build frontend image
echo "Building frontend image..."
docker build -f Dockerfile.prod -t ${PROJECT_NAME}-frontend:latest .

# Build backend image
echo "Building backend image..."
docker build -f backend/Dockerfile.prod -t ${PROJECT_NAME}-backend:latest ./backend

echo "✅ Images built successfully"

# Step 4: Tag Images for ECR
echo ""
echo "🏷️ Tagging Images for ECR..."

# Tag frontend image
docker tag ${PROJECT_NAME}-frontend:latest ${ECR_BASE_URL}/${FRONTEND_REPO}:latest
docker tag ${PROJECT_NAME}-frontend:latest ${ECR_BASE_URL}/${FRONTEND_REPO}:$(date +%Y%m%d-%H%M%S)

# Tag backend image
docker tag ${PROJECT_NAME}-backend:latest ${ECR_BASE_URL}/${BACKEND_REPO}:latest
docker tag ${PROJECT_NAME}-backend:latest ${ECR_BASE_URL}/${BACKEND_REPO}:$(date +%Y%m%d-%H%M%S)

echo "✅ Images tagged for ECR"

# Step 5: Push Images to ECR
echo ""
echo "📤 Pushing Images to ECR..."

# Push frontend images
echo "Pushing frontend images..."
docker push ${ECR_BASE_URL}/${FRONTEND_REPO}:latest
docker push ${ECR_BASE_URL}/${FRONTEND_REPO}:$(date +%Y%m%d-%H%M%S)

# Push backend images
echo "Pushing backend images..."
docker push ${ECR_BASE_URL}/${BACKEND_REPO}:latest
docker push ${ECR_BASE_URL}/${BACKEND_REPO}:$(date +%Y%m%d-%H%M%S)

echo "✅ Images pushed to ECR successfully"

# Step 6: Display ECR Repository URLs
echo ""
echo "📋 ECR Repository URLs:"
echo "Frontend: https://console.aws.amazon.com/ecr/repositories/${FRONTEND_REPO}"
echo "Backend: https://console.aws.amazon.com/ecr/repositories/${BACKEND_REPO}"

# Step 7: Next Steps Instructions
echo ""
echo "🎉 Deployment to ECR Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Set up MongoDB Atlas and get connection string"
echo "2. Set up AWS ElastiCache Redis and get endpoint"
echo "3. Create ECS cluster and task definitions"
echo "4. Deploy to ECS using the ECR images"
echo ""
echo "🔗 Useful AWS Console Links:"
echo "- ECR: https://console.aws.amazon.com/ecr/"
echo "- ECS: https://console.aws.amazon.com/ecs/"
echo "- ElastiCache: https://console.aws.amazon.com/elasticache/"
echo "- MongoDB Atlas: https://cloud.mongodb.com/"
echo ""
echo "📚 Documentation:"
echo "- ECS Task Definition: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html"
echo "- ECS Service: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html"
