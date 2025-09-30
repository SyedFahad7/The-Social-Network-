# 🚀 AWS Deployment Guide for Social Network Project

## 📋 Overview

This guide will walk you through deploying your Social Network project to AWS using:
- **ECS Fargate** for container orchestration
- **ECR** for Docker image storage
- **MongoDB Atlas** for cloud database
- **AWS ElastiCache** for Redis
- **Application Load Balancer** for traffic routing

---

## 🎯 Prerequisites

- ✅ AWS Account (with billing alerts set up)
- ✅ AWS CLI installed and configured
- ✅ Docker Desktop running
- ✅ Your project running locally with Docker

---

## 🏗️ Step-by-Step Deployment

### **Step 1: Set Up AWS Infrastructure**

```bash
# Make the script executable
chmod +x setup-aws-infrastructure.sh

# Run the infrastructure setup
./setup-aws-infrastructure.sh
```

**What this creates:**
- IAM roles for ECS
- ECS cluster
- CloudWatch log groups
- VPC and security groups
- Application Load Balancer

### **Step 2: Set Up Cloud Services**

#### **A. MongoDB Atlas Setup**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free account
3. Create a new cluster (Shared, AWS region)
4. Create a database user
5. Whitelist your IP (or 0.0.0.0/0 for development)
6. Get your connection string

#### **B. AWS ElastiCache Redis Setup**
1. Go to [AWS ElastiCache Console](https://console.aws.amazon.com/elasticache/)
2. Click "Create"
3. Choose "Redis"
4. Select "Cluster Mode Disabled"
5. Choose "t3.micro" (cheapest)
6. Set number of nodes = 1
7. Create cluster and wait for it to be available
8. Copy the primary endpoint

### **Step 3: Store Secrets in AWS Systems Manager**

```bash
# Get your AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Store MongoDB URI
aws ssm put-parameter \
  --name "/social-network/mongodb-uri" \
  --value "mongodb+srv://username:password@cluster.mongodb.net/social-network" \
  --type "SecureString" \
  --region us-east-1

# Store Redis URL
aws ssm put-parameter \
  --name "/social-network/redis-url" \
  --value "redis://your-elasticache-endpoint:6379" \
  --type "SecureString" \
  --region us-east-1

# Store JWT Secret
aws ssm put-parameter \
  --name "/social-network/jwt-secret" \
  --value "your-super-secure-jwt-secret" \
  --type "SecureString" \
  --region us-east-1

# Store Cloudinary credentials
aws ssm put-parameter \
  --name "/social-network/cloudinary-cloud-name" \
  --value "your-cloud-name" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/social-network/cloudinary-api-key" \
  --value "your-api-key" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/social-network/cloudinary-api-secret" \
  --value "your-api-secret" \
  --type "SecureString" \
  --region us-east-1

# Store email credentials
aws ssm put-parameter \
  --name "/social-network/email-host" \
  --value "smtp.gmail.com" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/social-network/email-user" \
  --value "your-email@gmail.com" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/social-network/email-pass" \
  --value "your-app-password" \
  --type "SecureString" \
  --region us-east-1

# Store Firebase credentials
aws ssm put-parameter \
  --name "/social-network/firebase-api-key" \
  --value "your-firebase-api-key" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/social-network/firebase-auth-domain" \
  --value "your-project.firebaseapp.com" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/social-network/firebase-project-id" \
  --value "your-project-id" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/social-network/firebase-storage-bucket" \
  --value "your-project.appspot.com" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/social-network/firebase-messaging-sender-id" \
  --value "your-sender-id" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/social-network/firebase-app-id" \
  --value "your-app-id" \
  --type "SecureString" \
  --region us-east-1

# Store API URL (will be updated after deployment)
aws ssm put-parameter \
  --name "/social-network/api-url" \
  --value "https://your-alb-dns-name.com/api" \
  --type "SecureString" \
  --region us-east-1
```

### **Step 4: Update Task Definition Files**

1. **Get your AWS Account ID:**
   ```bash
   aws sts get-caller-identity --query Account --output text
   ```

2. **Update the task definition files:**
   - Replace `ACCOUNT_ID` with your actual account ID in:
     - `aws/backend-task-definition.json`
     - `aws/frontend-task-definition.json`

### **Step 5: Deploy Docker Images to ECR**

```bash
# Make the script executable
chmod +x deploy-aws.sh

# Run the deployment script
./deploy-aws.sh
```

**What this does:**
- Creates ECR repositories
- Builds production Docker images
- Pushes images to ECR

### **Step 6: Register Task Definitions**

```bash
# Register backend task definition
aws ecs register-task-definition \
  --cli-input-json file://aws/backend-task-definition.json \
  --region us-east-1

# Register frontend task definition
aws ecs register-task-definition \
  --cli-input-json file://aws/frontend-task-definition.json \
  --region us-east-1
```

### **Step 7: Create ECS Services**

```bash
# Get your AWS Account ID and other details
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CLUSTER_NAME="social-network-cluster"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[0:2].SubnetId' --output text)
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=social-network-ecs-sg" --query 'SecurityGroups[0].GroupId' --output text)

# Create backend service
aws ecs create-service \
  --cluster ${CLUSTER_NAME} \
  --service-name social-network-backend \
  --task-definition social-network-backend:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
  --region us-east-1

# Create frontend service
aws ecs create-service \
  --cluster ${CLUSTER_NAME} \
  --service-name social-network-frontend \
  --task-definition social-network-frontend:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
  --region us-east-1
```

---

## 🔍 Monitoring and Troubleshooting

### **Check Service Status**
```bash
# Check ECS services
aws ecs describe-services \
  --cluster social-network-cluster \
  --services social-network-backend social-network-frontend \
  --region us-east-1

# Check task status
aws ecs list-tasks \
  --cluster social-network-cluster \
  --region us-east-1
```

### **View Logs**
```bash
# View backend logs
aws logs tail /ecs/social-network-backend --follow --region us-east-1

# View frontend logs
aws logs tail /ecs/social-network-frontend --follow --region us-east-1
```

### **Check Load Balancer**
```bash
# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --names social-network-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region us-east-1
```

---

## 💰 Cost Optimization

### **Free Tier Usage**
- **ECS Fargate**: 750 hours/month free
- **ECR**: 500MB storage free
- **CloudWatch**: 5GB logs free
- **ElastiCache**: No free tier (use Render Redis instead for free)

### **Cost-Saving Tips**
1. **Use t3.micro** instances (cheapest)
2. **Set desired count to 0** when not in use
3. **Monitor usage** with CloudWatch
4. **Set up billing alerts**

---

## 🔄 CI/CD Pipeline (Optional)

### **GitHub Actions Workflow**
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to ECR
        run: ./deploy-aws.sh
      
      - name: Update ECS services
        run: |
          aws ecs update-service \
            --cluster social-network-cluster \
            --service social-network-backend \
            --force-new-deployment \
            --region us-east-1
```

---

## 🎉 Success!

After completing all steps, your application will be:
- **Frontend**: Running on ECS Fargate
- **Backend**: Running on ECS Fargate
- **Database**: MongoDB Atlas (cloud)
- **Cache**: AWS ElastiCache Redis
- **Load Balancer**: AWS ALB

**Access your application** using the ALB DNS name!

---

## 📚 Useful Commands

```bash
# Scale services
aws ecs update-service --cluster social-network-cluster --service social-network-backend --desired-count 2

# Stop services (save money)
aws ecs update-service --cluster social-network-cluster --service social-network-backend --desired-count 0

# Delete everything (cleanup)
aws ecs delete-service --cluster social-network-cluster --service social-network-backend --force
aws ecs delete-service --cluster social-network-cluster --service social-network-frontend --force
aws ecs delete-cluster --cluster social-network-cluster
```

---

## 🆘 Troubleshooting

### **Common Issues:**
1. **Task fails to start**: Check IAM roles and permissions
2. **Can't connect to database**: Check security groups and MongoDB Atlas whitelist
3. **High costs**: Scale down services when not in use
4. **Images not found**: Check ECR repository and image tags

### **Get Help:**
- AWS Documentation: [ECS](https://docs.aws.amazon.com/AmazonECS/)
- AWS Support: Available in AWS Console
- Community: Stack Overflow, AWS Forums

---

**Happy Deploying! 🚀**
