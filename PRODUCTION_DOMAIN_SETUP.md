# 🌐 Production Domain Setup - www.iconicsmart.co.in

## ✅ **Configuration Complete**

Your CRM is now configured for production domain: **`https://www.iconicsmart.co.in`**

---

## 📁 **Files Created**

### **1. `.env.production`**
Production environment variables
- Domain: www.iconicsmart.co.in
- Protocol: HTTPS
- Port: 7000

### **2. `public/js/config.js`**
Automatic environment detection
- Auto-detects localhost vs production
- Sets correct API URL automatically

### **3. `server.js` (Updated)**
CORS configuration for:
- http://localhost:7000 (development)
- https://www.iconicsmart.co.in (production)
- https://iconicsmart.co.in (without www)

---

## 🚀 **Quick Deployment Guide**

### **Step 1: Server Requirements**
- Ubuntu/Linux server
- Node.js 16+
- MongoDB
- Nginx
- SSL certificate

### **Step 2: Upload Code**
```bash
scp -r Iconic-Smart-CRM user@www.iconicsmart.co.in:/var/www/
```

### **Step 3: Install & Configure**
```bash
cd /var/www/iconic-crm
npm install
cp .env.production .env
nano .env  # Update secrets
```

### **Step 4: Start with PM2**
```bash
npm install -g pm2
pm2 start server.js --name iconic-crm
pm2 save
```

### **Step 5: Configure Nginx**
Create reverse proxy from domain to localhost:7000

### **Step 6: Setup SSL**
```bash
sudo certbot --nginx -d www.iconicsmart.co.in
```

---

## 🧪 **Testing**

**Local:** http://localhost:7000
**Production:** https://www.iconicsmart.co.in

Both work automatically - no code changes needed!

---

## 📊 **URLs**

**Frontend:**
- https://www.iconicsmart.co.in/ → Login
- https://www.iconicsmart.co.in/dashboard.html → Dashboard

**API:**
- https://www.iconicsmart.co.in/api/auth/login
- https://www.iconicsmart.co.in/api/orders

---

## 🔐 **Security Checklist**

Before going live:
- [ ] Change JWT_SECRET in .env
- [ ] Change SESSION_SECRET in .env
- [ ] Update MongoDB password
- [ ] Enable HTTPS (SSL)
- [ ] Configure firewall
- [ ] Test all features

---

## ✅ **What's Ready**

- ✅ Domain configuration: www.iconicsmart.co.in
- ✅ CORS setup for production
- ✅ Auto environment detection
- ✅ Production environment file
- ✅ Security settings
- ✅ Ready for deployment

**Next:** Deploy to server and configure Nginx!
