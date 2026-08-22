# Railway Deployment Guide for charlieai.in

## Quick Start

This guide will help you deploy Charlie's CRM to Railway with your custom domain `https://www.charlieai.in/`.

## Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- GitHub repository access
- Domain `charlieai.in` with DNS access (GoDaddy, Cloudflare, Namecheap, etc.)
- MongoDB Atlas account (recommended) or Railway MongoDB service

## Step-by-Step Deployment

### 1. Railway Account Setup

1. Go to [railway.app](https://railway.app) and sign up (GitHub login recommended)
2. Create a new project: "Charlie's CRM"
3. Click "New" → "GitHub Repo"
4. Select your `Iconic-Smart-CRM` (or `charlies-crm`) repository
5. Railway will automatically detect Node.js and start building

### 2. MongoDB Setup

**Option A: MongoDB Atlas (Recommended - Free Tier Available)**

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (Free M0 tier)
4. Create database user (username/password)
5. Network Access: Add IP `0.0.0.0/0` (allow all IPs for Railway)
6. Get connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/charlies-crm?retryWrites=true&w=majority
   ```

**Option B: Railway MongoDB Service**

1. In Railway project, click "New" → "Database" → "MongoDB"
2. Railway provides connection string automatically
3. Use the `MONGO_URI` from Railway's MongoDB service

### 3. Environment Variables

In Railway dashboard → Your Service → Variables tab, add:

**Required Variables:**
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/charlies-crm?retryWrites=true&w=majority
NODE_ENV=production
PORT=7000
JWT_SECRET=<generate-strong-random-64-char-string>
JWT_EXPIRE=7d
FRONTEND_URL=https://www.charlieai.in
DOMAIN=www.charlieai.in
ALLOWED_ORIGINS=https://www.charlieai.in,https://charlieai.in,https://app.charlieai.in
```

**Email Service (Optional but Recommended):**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Charlie's CRM <noreply@charlieai.in>
EMAIL_SECURE=false
```

**File Upload:**
```
MAX_FILE_SIZE=5242880
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Custom Domain Configuration (charlieai.in)

1. In Railway service → **Settings** → **Domains**
2. Click **"Custom Domain"**
3. Enter: `www.charlieai.in` and `charlieai.in`
4. Railway will provide DNS records (CNAME or A record)
5. Add DNS records in your domain registrar (e.g. Cloudflare / GoDaddy):

   **For CNAME (www subdomain):**
   - Type: `CNAME`
   - Name: `www`
   - Value: Railway-provided CNAME (e.g., `charlies-crm-production.up.railway.app`)
   - TTL: `3600` (or Auto)

   **For Root domain (`charlieai.in`):**
   - Type: `CNAME` or `ALIAS` / `ANAME` (or `A` record with Railway IP if provided)
   - Name: `@`
   - Value: Railway-provided domain target
   - TTL: `3600`

   **For Multi-Tenant Subdomains (`*.charlieai.in`):**
   - Type: `CNAME`
   - Name: `*`
   - Value: Same Railway CNAME
   - TTL: `3600`

6. Wait 5-15 minutes for DNS propagation
7. Railway automatically provisions SSL certificate (Let's Encrypt TLS) and routes all traffic seamlessly to `https://www.charlieai.in/`.

### 5. File Storage Configuration

Railway has ephemeral storage. For production:

**Option A: Railway Volumes (Recommended for small scale)**

1. In Railway service → Settings → Volumes
2. Create volume: `uploads`
3. Mount path: `/app/uploads`
4. Create volume: `logs`
5. Mount path: `/app/logs`

**Option B: Cloud Storage (Better for production)**

Consider using:
- AWS S3
- Cloudinary
- Google Cloud Storage

Update `middleware/upload.js` to use cloud storage SDK.

### 6. Deploy and Verify

1. Railway automatically deploys on git push
2. Check deployment logs in Railway dashboard
3. Verify health endpoint: `https://www.iconicsmart.co.in/api/health`
4. Test login: `https://www.iconicsmart.co.in/login.html`
5. Verify SSL: Browser should show padlock icon

## Testing Checklist

- [ ] Application accessible at https://www.iconicsmart.co.in
- [ ] SSL certificate active (green padlock)
- [ ] API endpoints responding (`/api/health`)
- [ ] Login functionality works
- [ ] File uploads working (if volumes configured)
- [ ] Email notifications sending (if configured)
- [ ] MongoDB connected and accessible
- [ ] Android app can connect to API
- [ ] Real-time notifications (Socket.IO) working
- [ ] Logs directory writable
- [ ] Health check endpoint responding

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGO_URI` | Yes | MongoDB connection string | `mongodb+srv://...` |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Server port | `7000` |
| `JWT_SECRET` | Yes | JWT signing secret | `64-char-random-string` |
| `JWT_EXPIRE` | No | JWT expiration | `7d` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `https://www.iconicsmart.co.in` |
| `EMAIL_HOST` | No | SMTP server | `smtp.gmail.com` |
| `EMAIL_PORT` | No | SMTP port | `587` |
| `EMAIL_USER` | No | SMTP username | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | No | SMTP password | `app-password` |
| `EMAIL_FROM` | No | From address | `Iconic Smart CRM <noreply@charlieai.com>` |
| `MAX_FILE_SIZE` | No | Max upload size (bytes) | `5242880` |

## Troubleshooting

### Build Fails
- Check Railway logs for error messages
- Verify Node.js version compatibility
- Ensure all dependencies are in `package.json`

### MongoDB Connection Error
- Verify `MONGO_URI` is correct
- Check MongoDB network access (whitelist Railway IPs)
- Verify database user credentials

### SSL Not Working
- Wait 10-15 minutes after DNS setup
- Check DNS propagation: `dig iconicsmart.co.in`
- Verify DNS records in domain registrar
- Railway SSL activates automatically after DNS propagation

### File Uploads Fail
- Check if volumes are mounted correctly
- Verify directory permissions
- Consider using cloud storage for production

### CORS Errors
- Verify `FRONTEND_URL` matches actual domain
- Check `allowedOrigins` in `server.js`
- Ensure domain includes `www.` if using www subdomain

### Application Not Starting
- Check Railway logs for errors
- Verify all required environment variables are set
- Check MongoDB connection
- Verify PORT is set correctly

## Cost Estimation

- **Railway Hobby Plan**: $5/month (includes $5 credit)
- **MongoDB Atlas Free Tier**: $0/month (512MB storage)
- **Domain**: ~$10-15/year
- **Total**: ~$5-10/month (if within Railway free credits)

## Monitoring

- Railway provides built-in logs dashboard
- Monitor application logs in Railway dashboard
- Set up alerts for deployment failures
- Monitor MongoDB connection status in Atlas dashboard

## Backup Strategy

- **MongoDB Atlas**: Automatic daily backups (free tier)
- **Railway MongoDB**: Set up manual backup schedule
- Export database regularly: `mongodump` command

## Post-Deployment

1. Set up monitoring alerts
2. Configure automated backups
3. Set up staging environment (optional)
4. Configure CDN for static assets (optional)
5. Set up error tracking (Sentry, etc.)

## Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- MongoDB Atlas Docs: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- Application Issues: Check Railway logs and application logs

## Files Modified for Railway

1. ✅ `middleware/security.js` - Updated CSP for production domain
2. ✅ `server.js` - Enhanced health endpoint and production logging
3. ✅ `railway.json` - Production build configuration
4. ✅ `.railwayignore` - Exclude unnecessary files from deployment
5. ✅ `public/js/config.js` - Already configured for production (auto-detects)

---

**Ready to deploy!** Follow the steps above and your CRM will be live at https://www.iconicsmart.co.in 🚀

