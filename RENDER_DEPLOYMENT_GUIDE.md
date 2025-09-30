# 🚀 Render Deployment Guide for Social Network Project

## Overview
This guide will help you deploy your Social Network project to Render using Docker containers. Render will provide you with URLs for both frontend and backend services.

## Prerequisites
1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **External Services**: MongoDB Atlas, Redis Cloud, Cloudinary account

## 📋 Pre-Deployment Checklist

### 1. Set up External Services

#### MongoDB Atlas (Database)
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a cluster (free tier available)
3. Create a database user
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/social-network-prod`

#### Redis Cloud (Caching)
1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Create a free database
3. Get connection string: `redis://username:password@hostname:port`

#### Cloudinary (File Storage)
1. Go to [Cloudinary](https://cloudinary.com)
2. Sign up for free account
3. Get your cloud name, API key, and API secret from dashboard

#### Firebase (Push Notifications)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project
3. Enable Firestore and Authentication
4. Get your Firebase config values

### 2. Generate VAPID Keys
Run this command locally to generate VAPID keys for push notifications:

```bash
cd backend
node generate-vapid-keys.js
```

## 🎯 Deployment Options

### Option 1: Automatic Deployment with render.yaml (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production deployment setup"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

3. **Configure Environment Variables**
   In Render dashboard, set these environment variables for the backend service:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/social-network-prod
   REDIS_URL=redis://username:password@hostname:port
   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   VAPID_PUBLIC_KEY=your-vapid-public-key
   VAPID_PRIVATE_KEY=your-vapid-private-key
   ```

   For the frontend service:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
   ```

4. **Deploy**
   - Click "Deploy Blueprint"
   - Wait for both services to build and deploy

### Option 2: Manual Service Creation

1. **Create Backend Service**
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Set:
     - Name: `social-network-backend`
     - Environment: `Docker`
     - Dockerfile Path: `./backend/Dockerfile.prod`
     - Docker Context: `./backend`
   - Add all backend environment variables

2. **Create Frontend Service**
   - Click "New" → "Web Service"
   - Connect same repository
   - Set:
     - Name: `social-network-frontend`
     - Environment: `Docker`
     - Dockerfile Path: `./Dockerfile.prod`
   - Add all frontend environment variables
   - Set `NEXT_PUBLIC_API_URL` to your backend URL

## 🔗 Service URLs

After deployment, you'll get URLs like:
- **Frontend**: `https://social-network-frontend.onrender.com`
- **Backend**: `https://social-network-backend.onrender.com`

## 🧪 Testing Deployment

1. **Health Checks**
   - Backend: `https://your-backend-url.onrender.com/api/health`
   - Frontend: `https://your-frontend-url.onrender.com`

2. **Test Features**
   - User registration/login
   - Certificate upload
   - Feed functionality
   - Push notifications

## 🔧 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Dockerfile syntax
   - Ensure all dependencies are in package.json
   - Check build logs in Render dashboard

2. **Connection Issues**
   - Verify environment variables
   - Check MongoDB/Redis connection strings
   - Ensure services are running

3. **Frontend API Calls Failing**
   - Verify NEXT_PUBLIC_API_URL points to correct backend URL
   - Check CORS settings in backend

### Monitoring

- Use Render dashboard to monitor service health
- Check logs for errors
- Monitor resource usage

## 💰 Cost Considerations

- **Free Tier**: Both services can run on Render's free tier initially
- **Upgrade**: Consider upgrading to paid plans for production traffic
- **Database**: MongoDB Atlas and Redis Cloud offer free tiers

## 🔄 Updates and Redeployment

To update your deployment:
1. Push changes to GitHub
2. Render will automatically redeploy (if auto-deploy is enabled)
3. Or manually trigger deployment from Render dashboard

## 📞 Support

- Render Documentation: [docs.render.com](https://docs.render.com)
- MongoDB Atlas Support: [MongoDB Support](https://support.mongodb.com)
- Firebase Support: [Firebase Support](https://support.google.com/firebase)

---

🎉 **Congratulations!** Your Social Network project is now live on Render with professional URLs for both frontend and backend services!