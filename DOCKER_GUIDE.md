# 🐳 Docker Guide for Social Network Academic Management System

## 📋 Overview

This guide will help you learn Docker and containerization using your Social Network project. You'll understand how to run your entire application stack (Frontend, Backend, MongoDB, Redis) in isolated containers.

---

## 🎯 What You'll Learn

1. **Docker Basics** - Containers, images, networking
2. **Docker Compose** - Multi-service orchestration
3. **Environment Management** - Development vs Production
4. **Hot Reloading** - Development workflow
5. **Service Communication** - Container networking

---

## 🏗️ Project Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   MongoDB       │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (Database)    │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Cache)       │
                       │   Port: 6379    │
                       └─────────────────┘
```

---

## 📁 Docker Files Explained

### 1. **Dockerfile** (Production)
- **Purpose**: Build optimized production images
- **Features**: 
  - Uses `node:18-alpine` (lightweight)
  - Installs only production dependencies
  - Creates non-root user for security
  - Includes health checks

### 2. **Dockerfile.dev** (Development)
- **Purpose**: Build development images with hot reloading
- **Features**:
  - Installs all dependencies (including dev)
  - Includes nodemon for auto-restart
  - Mounts source code for live changes

### 3. **docker-compose.yml** (Production)
- **Purpose**: Orchestrate all services for production
- **Features**:
  - All services in one network
  - Persistent data volumes
  - Health checks
  - Environment variables

### 4. **docker-compose.dev.yml** (Development)
- **Purpose**: Development environment with hot reloading
- **Features**:
  - Volume mounts for live code changes
  - Development-specific settings
  - Hot reloading enabled

---

## 🚀 Getting Started

### Prerequisites
1. **Install Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. **Verify Installation**:
   ```bash
   docker --version
   docker-compose --version
   ```

### Step 1: Create Environment Files

**Create `.env` in project root:**
```env
# Backend Environment Variables
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend Environment Variables
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Step 2: Start Development Environment

```bash
# Start all services with hot reloading
docker-compose -f docker-compose.dev.yml up --build

# Or start in background
docker-compose -f docker-compose.dev.yml up -d --build
```

### Step 3: Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

---

## 🛠️ Docker Commands You'll Use

### Basic Commands
```bash
# Build images
docker build -t social-network-frontend .
docker build -t social-network-backend ./backend

# Run containers
docker run -p 3000:3000 social-network-frontend
docker run -p 5000:5000 social-network-backend

# View running containers
docker ps

# View logs
docker logs <container-name>

# Stop containers
docker stop <container-name>
```

### Docker Compose Commands
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build

# View logs
docker-compose logs

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend
```

### Development Commands
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# Rebuild specific service
docker-compose -f docker-compose.dev.yml up --build backend
```

---

## 🔧 Understanding Container Networking

### How Services Communicate

**Inside Docker Network:**
- Frontend → Backend: `http://backend:5000`
- Backend → MongoDB: `mongodb://mongo:27017`
- Backend → Redis: `redis://redis:6379`

**From Host Machine:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

### Network Configuration
```yaml
networks:
  social-network-network:
    driver: bridge
```

**What this means:**
- All containers can communicate with each other
- Each container has a hostname (service name)
- Isolated from other Docker networks

---

## 📊 Monitoring & Debugging

### Health Checks
Each service has health checks:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### View Service Status
```bash
# Check health status
docker-compose ps

# View detailed health info
docker inspect <container-name>
```

### Debugging Commands
```bash
# Enter a running container
docker exec -it social-network-backend-dev sh
docker exec -it social-network-frontend-dev sh

# View real-time logs
docker-compose logs -f backend

# Check network connectivity
docker exec social-network-backend-dev ping mongo
docker exec social-network-backend-dev ping redis
```

---

## 🔄 Development Workflow

### 1. **Start Development Environment**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### 2. **Make Code Changes**
- Edit files in your IDE
- Changes are automatically reflected (hot reload)
- No need to restart containers

### 3. **View Logs**
```bash
# Frontend logs
docker-compose -f docker-compose.dev.yml logs -f frontend

# Backend logs
docker-compose -f docker-compose.dev.yml logs -f backend
```

### 4. **Database Access**
```bash
# Connect to MongoDB
docker exec -it social-network-mongo-dev mongosh

# Connect to Redis
docker exec -it social-network-redis-dev redis-cli
```

### 5. **Stop Environment**
```bash
docker-compose -f docker-compose.dev.yml down
```

---

## 🚀 Production Deployment

### Build Production Images
```bash
# Build all services
docker-compose build

# Start production environment
docker-compose up -d
```

### Production Considerations
1. **Environment Variables**: Use proper production values
2. **SSL/TLS**: Configure HTTPS
3. **Database**: Use external MongoDB/Redis services
4. **Monitoring**: Add logging and monitoring
5. **Backup**: Configure data backups

---

## 🧪 Learning Exercises

### Exercise 1: Understanding Containers
```bash
# 1. Start only MongoDB
docker-compose up mongo

# 2. Check what's running
docker ps

# 3. Connect to MongoDB
docker exec -it social-network-mongo-dev mongosh

# 4. Create a test database
use test
db.test.insertOne({message: "Hello Docker!"})
```

### Exercise 2: Service Communication
```bash
# 1. Start backend and MongoDB
docker-compose up backend mongo

# 2. Test API health
curl http://localhost:5000/api/health

# 3. Check backend logs
docker-compose logs backend
```

### Exercise 3: Environment Variables
```bash
# 1. Check environment in container
docker exec social-network-backend-dev env

# 2. Test specific variable
docker exec social-network-backend-dev printenv MONGODB_URI
```

### Exercise 4: Volume Mounts
```bash
# 1. Make a code change
# 2. Check if it's reflected in container
docker exec social-network-backend-dev cat /app/server.js

# 3. Restart service to see changes
docker-compose restart backend
```

---

## 🔍 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Stop conflicting services
sudo systemctl stop <service-name>
```

**2. Permission Issues**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Or run with sudo (not recommended for production)
sudo docker-compose up
```

**3. Container Won't Start**
```bash
# Check logs
docker-compose logs <service-name>

# Check container status
docker-compose ps

# Rebuild container
docker-compose up --build <service-name>
```

**4. Network Issues**
```bash
# Check network
docker network ls

# Inspect network
docker network inspect social-network-network-dev

# Test connectivity
docker exec social-network-backend-dev ping mongo
```

---

## 📚 Next Steps

### Advanced Topics to Learn
1. **Docker Swarm** - Container orchestration
2. **Kubernetes** - Production container management
3. **CI/CD Pipelines** - Automated deployment
4. **Docker Security** - Best practices
5. **Multi-stage Builds** - Optimized images

### Resources
- [Docker Official Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## 🎉 Congratulations!

You now have a fully containerized development environment for your Social Network project. This setup will:

✅ **Solve IP Issues**: No more Redis connection problems  
✅ **Consistent Environment**: Same setup everywhere  
✅ **Easy Sharing**: Share with friends easily  
✅ **Production Ready**: Easy to deploy anywhere  
✅ **Learning Platform**: Great way to learn Docker  

**Happy Containerizing! 🐳** 