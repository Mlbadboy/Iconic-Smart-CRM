# 🚀 Deployment Guide - Iconic Smart CRM

Deploy your CRM to production in minutes with our one-click deployment options.

---

## 📋 Pre-Deployment Checklist

- [ ] MongoDB database ready (Atlas, local, or cloud provider)
- [ ] Environment variables configured
- [ ] JWT secret generated
- [ ] Code tested locally
- [ ] .env file NOT committed to repository

---

## ☁️ Cloud Platform Deployments

### 1. Heroku (Recommended for Beginners)

#### One-Click Deploy

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM)

#### Manual Deployment

```bash
# 1. Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# 2. Login to Heroku
heroku login

# 3. Create new app
heroku create iconic-crm-app

# 4. Add MongoDB addon
heroku addons:create mongolab:sandbox

# 5. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 64)
heroku config:set JWT_EXPIRE=7d

# 6. Deploy
git push heroku main

# 7. Seed database (optional)
heroku run npm run seed

# 8. Open app
heroku open
```

#### View Logs
```bash
heroku logs --tail
```

---

### 2. Railway (Fastest Deployment)

#### One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM)

#### Manual Deployment

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add MongoDB
railway add -d mongodb

# 5. Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 64)

# 6. Deploy
railway up

# 7. Get deployment URL
railway domain
```

---

### 3. Render (Free Tier Available)

#### One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM)

#### Manual Deployment

1. **Create Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment**: Node

2. **Add Environment Variables**
   ```
   NODE_ENV=production
   MONGO_URI=your-mongodb-uri
   JWT_SECRET=your-secret-key
   JWT_EXPIRE=7d
   PORT=5000
   ```

3. **Create MongoDB Database**
   - Click "New +" → "PostgreSQL" (or use MongoDB Atlas)
   - Copy connection string to MONGO_URI

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment

---

### 4. DigitalOcean App Platform

```bash
# 1. Install doctl CLI
# Download from: https://docs.digitalocean.com/reference/doctl/how-to/install/

# 2. Authenticate
doctl auth init

# 3. Create app spec (app.yaml)
doctl apps create --spec app.yaml

# 4. Monitor deployment
doctl apps list
```

**app.yaml**:
```yaml
name: iconic-smart-crm
services:
  - name: web
    source:
      repo: https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM
      branch: main
    build_command: npm install
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    http_port: 5000
    routes:
      - path: /
    envs:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        type: SECRET
      - key: MONGO_URI
        type: SECRET

databases:
  - name: mongodb
    engine: MONGODB
    version: "5"
```

---

### 5. AWS (Advanced)

#### Using AWS Elastic Beanstalk

```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize EB application
eb init -p node.js iconic-crm

# 3. Create environment
eb create iconic-crm-env

# 4. Set environment variables
eb setenv NODE_ENV=production MONGO_URI=your-uri JWT_SECRET=your-secret

# 5. Deploy
eb deploy

# 6. Open application
eb open
```

#### Using AWS ECS (Docker)

```bash
# 1. Build and tag image
docker build -t iconic-crm .

# 2. Create ECR repository
aws ecr create-repository --repository-name iconic-crm

# 3. Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# 4. Tag and push
docker tag iconic-crm:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/iconic-crm:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/iconic-crm:latest

# 5. Create ECS cluster and service via AWS Console
```

---

### 6. Google Cloud Platform

#### Using Cloud Run

```bash
# 1. Install gcloud CLI
# Download from: https://cloud.google.com/sdk/docs/install

# 2. Initialize
gcloud init

# 3. Build and submit
gcloud builds submit --tag gcr.io/PROJECT-ID/iconic-crm

# 4. Deploy
gcloud run deploy iconic-crm \
  --image gcr.io/PROJECT-ID/iconic-crm \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,JWT_SECRET=your-secret,MONGO_URI=your-uri
```

#### Using App Engine

```bash
# 1. Create app.yaml
cat > app.yaml << EOF
runtime: nodejs18
env: standard
instance_class: F1

env_variables:
  NODE_ENV: production
  MONGO_URI: your-mongodb-uri
  JWT_SECRET: your-secret
EOF

# 2. Deploy
gcloud app deploy
```

---

### 7. Vercel (Frontend + Serverless)

While Vercel is optimized for frontend, you can deploy the backend as serverless functions:

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Set environment variables
vercel env add MONGO_URI
vercel env add JWT_SECRET
```

**vercel.json**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 🗄️ Database Hosting Options

### MongoDB Atlas (Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (512MB)
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for all IPs)
5. Get connection string
6. Update MONGO_URI in your deployment

**Connection String Format**:
```
mongodb+srv://username:password@cluster.mongodb.net/iconic-crm?retryWrites=true&w=majority
```

### Alternative Database Providers

- **Railway MongoDB**: Included with Railway deployment
- **DigitalOcean Managed MongoDB**: $15/month
- **AWS DocumentDB**: MongoDB-compatible
- **Azure Cosmos DB**: MongoDB API available

---

## 🔐 Environment Variables Reference

Required for all deployments:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://...
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

Optional:

```env
FRONTEND_URL=https://your-frontend.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-password
MAX_FILE_SIZE=5242880
```

---

## 🔒 Security Best Practices

### 1. JWT Secret
```bash
# Generate secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. MongoDB Security
- Enable authentication
- Use strong passwords
- Whitelist IP addresses
- Enable SSL/TLS

### 3. CORS Configuration
```javascript
// In server.js
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

### 4. Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
```

---

## 📊 Post-Deployment

### Health Check
```bash
curl https://your-app.herokuapp.com/api/health
```

### Seed Database
```bash
# Heroku
heroku run npm run seed

# Railway
railway run npm run seed

# SSH into server
ssh user@server
cd /app
npm run seed
```

### View Logs
```bash
# Heroku
heroku logs --tail

# Railway
railway logs

# Render
# View in dashboard

# Docker
docker logs -f container-name
```

---

## 🔄 Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "iconic-crm-app"
          heroku_email: "your-email@example.com"
```

---

## 🐛 Troubleshooting

### Application Crashes

```bash
# Check logs
heroku logs --tail

# Common issues:
# 1. Missing environment variables
# 2. MongoDB connection failed
# 3. Port binding issue (use process.env.PORT)
```

### MongoDB Connection Issues

```bash
# Test connection locally
node -e "require('mongoose').connect('your-mongo-uri').then(() => console.log('Connected')).catch(e => console.log(e))"

# Check IP whitelist in MongoDB Atlas
# Ensure correct username/password
# Verify connection string format
```

### Build Failures

```bash
# Check Node.js version
node --version

# Clear cache and rebuild
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 📈 Monitoring & Maintenance

### Application Performance Monitoring

- **New Relic**: `heroku addons:create newrelic`
- **Datadog**: Full-stack monitoring
- **Sentry**: Error tracking

### Database Monitoring

- MongoDB Atlas built-in monitoring
- Set up alerts for high CPU/memory usage
- Regular backup schedule

### Uptime Monitoring

- **UptimeRobot**: Free tier available
- **Pingdom**: Comprehensive monitoring
- **StatusCake**: Multi-location checks

---

## 💰 Cost Estimates

| Platform | Free Tier | Paid Plans |
|----------|-----------|------------|
| **Heroku** | 550 dyno hours/month | $7/month (Basic) |
| **Railway** | $5 credit/month | $20/month |
| **Render** | 750 hours/month | $7/month |
| **DigitalOcean** | None | $12/month |
| **MongoDB Atlas** | 512MB free | $9/month (2GB) |

---

<div align="center">
  <strong>🚀 Ready to Deploy! 🚀</strong>
  <br><br>
  <sub>Choose your platform and go live in minutes</sub>
</div>
