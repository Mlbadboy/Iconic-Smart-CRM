# 🚀 How to Start Your CRM

## ⚠️ Current Issue

**Error**: `Operation users.findOne() buffering timed out after 10000ms`

**Cause**: MongoDB is not running

---

## ✅ Solution - Start MongoDB

### **Option 1: Using Docker (Recommended)**

#### **Step 1: Start Docker Desktop**
1. Open Docker Desktop application
2. Wait for it to fully start (green icon in system tray)

#### **Step 2: Start MongoDB**
```bash
cd C:\Users\mayur_hlx0x09\Desktop\Iconic-Smart-CRM
docker-compose up -d mongodb
```

#### **Step 3: Wait for MongoDB to be Ready**
```bash
# Check if MongoDB is running
docker ps

# You should see: iconic-crm-mongodb
```

#### **Step 4: Start the CRM**
```bash
npm start
```

#### **Step 5: Open Browser**
Visit: http://localhost:7000

---

### **Option 2: Quick Start (All Services)**

```bash
# Start Docker Desktop first, then:
cd C:\Users\mayur_hlx0x09\Desktop\Iconic-Smart-CRM

# Start MongoDB only
docker-compose up -d mongodb

# Wait 10 seconds for MongoDB to initialize
timeout /t 10

# Start the CRM server
npm start
```

---

### **Option 3: Using the Setup Script**

```bash
# Run the automated setup
npm run setup
```

This will:
- Check if MongoDB is running
- Create database and collections
- Seed demo data
- Start the server

---

## 🔧 Troubleshooting

### **Issue: Docker Desktop not installed**

**Solution**: Install Docker Desktop
1. Download from: https://www.docker.com/products/docker-desktop
2. Install and restart your computer
3. Start Docker Desktop
4. Run the commands above

---

### **Issue: Docker Desktop not starting**

**Solution**: 
1. Restart Docker Desktop
2. Check Windows Services (services.msc)
3. Ensure "Docker Desktop Service" is running
4. Restart your computer if needed

---

### **Issue: Port 27017 already in use**

**Solution**: Stop other MongoDB instances
```bash
# Stop all Docker containers
docker-compose down

# Or stop specific container
docker stop iconic-crm-mongodb
docker rm iconic-crm-mongodb

# Then start again
docker-compose up -d mongodb
```

---

### **Issue: Still getting timeout errors**

**Solution**: Increase buffer timeout
1. Open `server.js`
2. Add after mongoose.connect():
```javascript
mongoose.set('bufferTimeoutMS', 30000); // 30 seconds
```

---

## 📊 Verify Everything is Working

### **Check MongoDB**
```bash
# Check if container is running
docker ps

# Check MongoDB logs
docker logs iconic-crm-mongodb

# Should see: "Waiting for connections on port 27017"
```

### **Check CRM Server**
```bash
# In another terminal
curl http://localhost:7000/api/health

# Should return: {"status":"OK"}
```

### **Check Database**
```bash
# Connect to MongoDB
docker exec -it iconic-crm-mongodb mongosh -u admin -p admin123

# In MongoDB shell:
use iconic-crm
show collections
db.users.countDocuments()

# Should show collections and user count
```

---

## ✅ Complete Startup Checklist

- [ ] Docker Desktop is installed
- [ ] Docker Desktop is running (green icon)
- [ ] MongoDB container is started (`docker-compose up -d mongodb`)
- [ ] MongoDB is healthy (wait 10-15 seconds)
- [ ] CRM server is started (`npm start`)
- [ ] Browser opened to http://localhost:7000
- [ ] Login page loads successfully
- [ ] Can login with demo credentials

---

## 🎯 Quick Commands Reference

```bash
# Start MongoDB
docker-compose up -d mongodb

# Check MongoDB status
docker ps | findstr mongodb

# View MongoDB logs
docker logs iconic-crm-mongodb -f

# Stop MongoDB
docker-compose down

# Restart MongoDB
docker-compose restart mongodb

# Start CRM server
npm start

# Run setup (creates DB + seeds data)
npm run setup

# Reset database
npm run reset
```

---

## 🌟 Recommended Workflow

### **Daily Startup**
```bash
# 1. Start Docker Desktop (if not running)
# 2. Start MongoDB
docker-compose up -d mongodb

# 3. Wait 10 seconds
timeout /t 10

# 4. Start CRM
npm start

# 5. Open browser
start http://localhost:7000
```

### **First Time Setup**
```bash
# 1. Start Docker Desktop
# 2. Run complete setup
npm run setup

# This will:
# - Start MongoDB
# - Create database
# - Seed demo data
# - Start server
```

---

## 💡 Pro Tips

1. **Keep Docker Desktop Running**: Set it to start with Windows
2. **Use MongoDB Compass**: Visual tool to view database
   - Connection: `mongodb://admin:admin123@localhost:27017`
3. **Check Logs**: Always check logs if something fails
4. **Port Conflicts**: Make sure ports 7000 and 27017 are free

---

## 🆘 Still Having Issues?

### **Complete Reset**
```bash
# Stop everything
docker-compose down -v

# Remove all containers and volumes
docker system prune -a --volumes

# Start fresh
docker-compose up -d mongodb
timeout /t 15
npm run setup
```

### **Alternative: Use MongoDB Atlas (Cloud)**
If Docker continues to have issues, use MongoDB Atlas:

1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `.env`:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/iconic-crm
   ```
5. Run `npm start`

---

## ✅ Success Indicators

When everything is working, you should see:

**Terminal Output**:
```
> node server.js
MongoDB connected
Server running on port 7000
```

**Browser**:
- Beautiful login page loads
- No errors in console
- Can login successfully
- Dashboard loads with data

---

**🎉 Once MongoDB is running, your CRM will work perfectly!**
