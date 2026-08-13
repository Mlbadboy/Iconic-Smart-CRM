# 🐳 Docker Deployment Guide

Run **Iconic Smart CRM** in containers with Docker and Docker Compose.

---

## 📋 Prerequisites

- **Docker** 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+ (Usually included with Docker Desktop)

---

## 🚀 Quick Start

### Production Deployment

```bash
# 1. Clone the repository
git clone https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM.git
cd Iconic-Smart-CRM

# 2. Start all services
docker-compose up -d

# 3. Seed the database (optional)
docker-compose exec backend npm run seed
```

✅ **Done!** Your CRM is now running at:
- **API**: http://localhost:5000
- **MongoDB Admin**: http://localhost:8081 (admin/admin123)

### Development Mode

```bash
# Start with hot-reload enabled
docker-compose -f docker-compose.dev.yml up

# Your code changes will auto-reload the server
```

---

## 📦 What's Included?

The Docker setup includes:

### Services
1. **Backend API** (Node.js/Express)
   - Port: 5000
   - Auto-restart on failure
   - Health checks enabled

2. **MongoDB Database**
   - Port: 27017
   - Persistent data storage
   - Authentication enabled

3. **Mongo Express** (Web UI)
   - Port: 8081
   - Database management interface
   - Credentials: admin/admin123

---

## 🛠️ Docker Commands

### Basic Operations

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f mongodb

# Restart services
docker-compose restart

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Service Management

```bash
# Start only backend
docker-compose up backend

# Rebuild images
docker-compose build

# Rebuild and start
docker-compose up --build

# Scale services
docker-compose up -d --scale backend=3
```

### Execute Commands in Containers

```bash
# Seed database
docker-compose exec backend npm run seed

# Access backend shell
docker-compose exec backend sh

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p admin123

# View backend environment
docker-compose exec backend env
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env.docker` file for Docker-specific configuration:

```env
# MongoDB
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=secure-password-here

# Backend
NODE_ENV=production
PORT=5000
JWT_SECRET=your-production-secret-key
JWT_EXPIRE=7d

# Mongo Express
MONGO_EXPRESS_USERNAME=admin
MONGO_EXPRESS_PASSWORD=admin123
```

Update `docker-compose.yml` to use the file:

```yaml
services:
  backend:
    env_file:
      - .env.docker
```

### Custom Ports

Edit `docker-compose.yml` to change ports:

```yaml
services:
  backend:
    ports:
      - "8080:5000"  # Change 8080 to your preferred port
  
  mongodb:
    ports:
      - "27018:27017"  # Change 27018 to your preferred port
```

---

## 📊 Database Management

### Seed Demo Data

```bash
# Seed with demo users, orders, leads, etc.
docker-compose exec backend npm run seed
```

### Reset Database

```bash
# Clear and re-seed
docker-compose exec backend npm run reset
```

### Backup Database

```bash
# Create backup
docker-compose exec mongodb mongodump \
  --username admin \
  --password admin123 \
  --authenticationDatabase admin \
  --out /data/backup

# Copy backup to host
docker cp iconic-crm-mongodb:/data/backup ./backup
```

### Restore Database

```bash
# Copy backup to container
docker cp ./backup iconic-crm-mongodb:/data/backup

# Restore
docker-compose exec mongodb mongorestore \
  --username admin \
  --password admin123 \
  --authenticationDatabase admin \
  /data/backup
```

---

## 🔍 Monitoring & Debugging

### Check Service Health

```bash
# View container status
docker-compose ps

# Check health status
docker inspect --format='{{.State.Health.Status}}' iconic-crm-backend
docker inspect --format='{{.State.Health.Status}}' iconic-crm-mongodb
```

### Resource Usage

```bash
# View resource usage
docker stats

# View resource usage for specific service
docker stats iconic-crm-backend
```

### Debug Container Issues

```bash
# View container details
docker inspect iconic-crm-backend

# Access backend logs
docker logs iconic-crm-backend

# Follow logs in real-time
docker logs -f iconic-crm-backend --tail 100

# View MongoDB logs
docker logs iconic-crm-mongodb
```

---

## 🌐 Production Best Practices

### 1. Use Docker Secrets

Instead of environment variables:

```yaml
services:
  backend:
    secrets:
      - jwt_secret
      - mongodb_password

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  mongodb_password:
    file: ./secrets/mongodb_password.txt
```

### 2. Enable HTTPS with Nginx

Add Nginx reverse proxy:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
```

### 3. Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 4. Health Checks

Already configured in `docker-compose.yml`:

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## 🚢 Deployment Platforms

### Deploy to Cloud Services

#### AWS ECS
```bash
# Install AWS CLI and configure
aws configure

# Create ECR repository
aws ecr create-repository --repository-name iconic-crm

# Build and push
docker build -t iconic-crm .
docker tag iconic-crm:latest <account-id>.dkr.ecr.region.amazonaws.com/iconic-crm:latest
docker push <account-id>.dkr.ecr.region.amazonaws.com/iconic-crm:latest
```

#### Google Cloud Run
```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT-ID/iconic-crm

# Deploy
gcloud run deploy iconic-crm \
  --image gcr.io/PROJECT-ID/iconic-crm \
  --platform managed
```

#### DigitalOcean App Platform
```bash
# Use docker-compose.yml directly
# Connect repository in DigitalOcean dashboard
```

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Port already in use
docker-compose down
docker-compose up -d

# 2. MongoDB connection failed
# Increase start_period in healthcheck

# 3. Permission issues
sudo chown -R $USER:$USER uploads logs
```

### Database Connection Error

```bash
# Verify MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec backend node -e "require('mongoose').connect('mongodb://admin:admin123@mongodb:27017/iconic-crm?authSource=admin').then(() => console.log('Connected')).catch(e => console.log(e))"
```

### Cannot Access Services

```bash
# Check if containers are running
docker ps

# Check port mapping
docker port iconic-crm-backend

# Test from host
curl http://localhost:5000/api/health

# Check firewall rules
sudo ufw status
```

---

## 🧹 Cleanup

### Remove Everything

```bash
# Stop and remove containers, networks
docker-compose down

# Also remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker rmi iconic-smart-crm_backend
docker rmi mongo:7.0
docker rmi mongo-express:latest

# Clean up unused resources
docker system prune -a
```

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

<div align="center">
  <strong>🐳 Happy Containerizing! 🐳</strong>
  <br><br>
  <sub>Simplified deployment with Docker</sub>
</div>
