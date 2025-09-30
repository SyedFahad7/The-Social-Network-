# 🚀 Quick Deployment Commands for Render

## Your VAPID Keys (Save these!)
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAs5KfR6KrWHadvYBWUqSm_ozyCugbSkwr-GZb933q_RZ8ajVvpWY8oK_qYebxWcSeG466qhadky_-lq_eeLTac
VAPID_PRIVATE_KEY=pgexo0_oXsUyM86I-RFlgjSHxvUEeHqiDcKznpVybLk
```

## Step-by-Step Deployment Commands

### 1. Push to GitHub
```bash
git add .
git commit -m "Production deployment setup with Render configuration"
git push origin main
```

### 2. Set up External Services
Before deploying, you need these accounts:

#### MongoDB Atlas (Free)
- Go to: https://cloud.mongodb.com
- Create cluster → Get connection string
- Format: `mongodb+srv://username:password@cluster.mongodb.net/social-network-prod`

#### Redis Cloud (Free)
- Go to: https://redis.com/try-free/
- Create database → Get connection string
- Format: `redis://username:password@hostname:port`

#### Cloudinary (Free)
- Go to: https://cloudinary.com
- Sign up → Get: Cloud Name, API Key, API Secret

### 3. Deploy on Render
1. Go to: https://render.com
2. Sign up/Login
3. Click "New" → "Blueprint" 
4. Connect your GitHub repository
5. Render will detect `render.yaml` automatically

### 4. Configure Environment Variables in Render

#### Backend Service Environment Variables:
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/social-network-prod
REDIS_URL=redis://username:password@hostname:port
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
VAPID_PUBLIC_KEY=BAs5KfR6KrWHadvYBWUqSm_ozyCugbSkwr-GZb933q_RZ8ajVvpWY8oK_qYebxWcSeG466qhadky_-lq_eeLTac
VAPID_PRIVATE_KEY=pgexo0_oXsUyM86I-RFlgjSHxvUEeHqiDcKznpVybLk
```

#### Frontend Service Environment Variables:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://social-network-backend.onrender.com/api
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAs5KfR6KrWHadvYBWUqSm_ozyCugbSkwr-GZb933q_RZ8ajVvpWY8oK_qYebxWcSeG466qhadky_-lq_eeLTac
```

### 5. After Deployment
You'll get URLs like:
- **Frontend**: `https://social-network-frontend.onrender.com`
- **Backend**: `https://social-network-backend.onrender.com`

### 6. Test Your Deployment
- Visit your frontend URL
- Test user registration/login
- Upload a certificate
- Check the feed functionality

## 🔧 Troubleshooting
If something goes wrong:
1. Check Render service logs
2. Verify environment variables
3. Test database connections
4. Check Docker build logs

## 💡 Pro Tips
- Render free tier may sleep after 15 minutes of inactivity
- Upgrade to paid plan for production traffic
- Set up custom domains in Render dashboard
- Monitor service health and logs

---
**Note**: Replace all placeholder values with your actual credentials before deploying!