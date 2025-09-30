#!/bin/bash

# AWS Infrastructure Setup Script for Social Network Project
# This script creates all necessary AWS resources for deployment

set -e  # Exit on any error

echo "🏗️ Setting up AWS Infrastructure for Social Network Project"
echo "=========================================================="

# Configuration
AWS_REGION="ap-south-1"
PROJECT_NAME="social-network"
CLUSTER_NAME="social-network-cluster"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "✅ AWS Account ID: ${AWS_ACCOUNT_ID}"
echo "✅ AWS Region: ${AWS_REGION}"

# Step 1: Create IAM Roles
echo ""
echo "🔐 Creating IAM Roles..."

# Create ECS Task Execution Role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' \
  2>/dev/null || echo "ECS Task Execution Role already exists"

# Attach policies to ECS Task Execution Role
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess

# Create ECS Task Role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' \
  2>/dev/null || echo "ECS Task Role already exists"

echo "✅ IAM roles created/verified"

# Step 2: Create ECS Cluster
echo ""
echo "🚢 Creating ECS Cluster..."

aws ecs create-cluster \
  --cluster-name ${CLUSTER_NAME} \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --region ${AWS_REGION} \
  2>/dev/null || echo "ECS Cluster already exists"

echo "✅ ECS cluster created/verified"
 
# Step 3: Create CloudWatch Log Groups
echo ""
echo "📊 Creating CloudWatch Log Groups..."

aws logs create-log-group \
  --log-group-name /ecs/social-network-backend \
  --region ${AWS_REGION} \
  2>/dev/null || echo "Backend log group already exists"

aws logs create-log-group \
  --log-group-name /ecs/social-network-frontend \
  --region ${AWS_REGION} \
  2>/dev/null || echo "Frontend log group already exists"

echo "✅ CloudWatch log groups created/verified"

# Step 4: Create VPC and Security Groups (if needed)
echo ""
echo "🌐 Setting up VPC and Security Groups..."

# Get default VPC
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)

# Create security group for ECS tasks
aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-ecs-sg \
  --description "Security group for ${PROJECT_NAME} ECS tasks" \
  --vpc-id ${VPC_ID} \
  --region ${AWS_REGION} \
  2>/dev/null || echo "Security group already exists"

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${PROJECT_NAME}-ecs-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Add inbound rules
aws ec2 authorize-security-group-ingress \
  --group-id ${SG_ID} \
  --protocol tcp \
  --port 5000 \
  --cidr 0.0.0.0/0 \
  --region ${AWS_REGION} \
  2>/dev/null || echo "Backend port rule already exists"

aws ec2 authorize-security-group-ingress \
  --group-id ${SG_ID} \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0 \
  --region ${AWS_REGION} \
  2>/dev/null || echo "Frontend port rule already exists"

echo "✅ VPC and security groups configured"

# Step 5: Create Application Load Balancer
echo ""
echo "⚖️ Creating Application Load Balancer..."

# Get subnets
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${VPC_ID}" \
  --query 'Subnets[0:2].SubnetId' \
  --output text)

# Create ALB
aws elbv2 create-load-balancer \
  --name ${PROJECT_NAME}-alb \
  --subnets ${SUBNET_IDS} \
  --security-groups ${SG_ID} \
  --region ${AWS_REGION} \
  2>/dev/null || echo "Load balancer already exists"

echo "✅ Application Load Balancer created/verified"

# Step 6: Display Next Steps
echo ""
echo "🎉 AWS Infrastructure Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Set up MongoDB Atlas and get connection string"
echo "2. Set up AWS ElastiCache Redis and get endpoint"
echo "3. Store secrets in AWS Systems Manager Parameter Store"
echo "4. Update task definition files with your Account ID"
echo "5. Register task definitions and create ECS services"
echo ""
echo "🔗 Useful AWS Console Links:"
echo "- ECS: https://console.aws.amazon.com/ecs/"
echo "- IAM: https://console.aws.amazon.com/iam/"
echo "- CloudWatch: https://console.aws.amazon.com/cloudwatch/"
echo "- Systems Manager: https://console.aws.amazon.com/systems-manager/"
echo ""
echo "📋 Important Information:"
echo "- Account ID: ${AWS_ACCOUNT_ID}"
echo "- Cluster Name: ${CLUSTER_NAME}"
echo "- Security Group ID: ${SG_ID}"
echo "- VPC ID: ${VPC_ID}"
echo ""
echo "📚 Next Commands:"
echo "- Run: ./deploy-aws.sh (to push Docker images to ECR)"
echo "- Update task definition files with Account ID: ${AWS_ACCOUNT_ID}"
echo "- Store secrets in Parameter Store"
echo "- Deploy to ECS"
