# 🔄 Server Restart Required - Beat Tracker Not Loading

## ⚠️ **Issue: Beat Tracker Not Showing Employees**

**Cause:** Server needs to be restarted to load the new Beat Tracker routes.

---

## ✅ **Quick Fix: Restart Server**

### **Step 1: Stop Current Server**
```
In your terminal where server is running:
Press: Ctrl + C

You'll see:
^C
Server stopped
```

### **Step 2: Start Server Again**
```bash
npm start
```

**Or:**
```bash
node server.js
```

### **Step 3: Wait for Startup**
```
You should see:
🔌 Attempting MongoDB connection...
✅ MongoDB connected successfully!
📊 Database: iconic-crm

🚀 Server running on http://localhost:7000
📱 Access the CRM at: http://localhost:7000
🔐 Login page: http://localhost:7000/login.html
```

### **Step 4: Test Beat Tracker**
```
1. Open: http://localhost:7000/beat-tracker.html
2. Login as admin
3. ✅ See Shubham Kumar in left sidebar!
```

---

## 🧪 **Verify API is Working**

### **After Restart, Test API:**

Open browser console (F12) or use curl:

```bash
# Test if API responds (after login)
curl http://localhost:7000/api/beat-tracker/employees
```

**Expected Response:**
```json
[{
  "_id": "6904fcf0a254947361617bb8",
  "name": "Shubham Kumar",
  "email": "shubham@iconicsmart.com",
  "phone": "9876543210",
  "role": "sales",
  "department": "Sales"
}]
```

---

## 🔍 **If Still Not Working**

### **Check 1: Browser Console**
```
1. Open Beat Tracker page
2. Press F12
3. Go to Console tab
4. Look for errors

Common issues:
- "401 Unauthorized" → Login expired, login again
- "404 Not Found" → Server not restarted
- "CORS error" → Server issue
```

### **Check 2: Network Tab**
```
1. F12 → Network tab
2. Refresh page
3. Look for: /api/beat-tracker/employees

Status should be: 200 OK
If 404: Server needs restart
If 401: Need to login
```

### **Check 3: Server Logs**
```
Look at terminal where server is running:

Should see:
✅ Connected to MongoDB
👥 Field employees retrieved: 1

If you see errors, read them
```

---

## 📋 **Complete Restart Procedure**

### **For Windows (PowerShell):**

```powershell
# 1. Stop server
Ctrl + C

# 2. Check if port is free
netstat -ano | findstr :7000

# 3. If port is still in use, kill process
# Note the PID from above command, then:
taskkill /PID <PID> /F

# 4. Start server
npm start
```

### **Verify Services:**

```powershell
# Check MongoDB is running
docker ps
# OR
net start | findstr MongoDB

# Check Node server
curl http://localhost:7000/api/health
```

---

## ✅ **Expected Behavior After Restart**

### **Beat Tracker Page:**
```
1. Left sidebar:
   ┌────────────────────────┐
   │ 👥 Field Employees     │
   ├────────────────────────┤
   │ Shubham Kumar          │
   │ sales | shubham@...    │
   └────────────────────────┘

2. Click name → Shows tracking page

3. Stats cards show (even if zeros):
   - Today's Check-in
   - Month Attendance
   - Store Visits
   - Orders Generated
```

### **Browser Console (No Errors):**
```
🌐 CRM Config Loaded
Environment: Development
API URL: http://localhost:7000/api
Base URL: http://localhost:7000
```

---

## 🎯 **Quick Checklist**

- [ ] Server stopped (Ctrl+C)
- [ ] MongoDB is running
- [ ] Server restarted (npm start)
- [ ] See startup messages
- [ ] No errors in console
- [ ] Beat Tracker page loads
- [ ] Login as admin
- [ ] Employee visible in sidebar

---

## 💡 **Why Restart is Needed**

**When you add new routes:**
- Beat Tracker routes were added
- Server was already running
- Old code was in memory
- New routes not loaded

**After restart:**
- ✅ New routes loaded
- ✅ Beat Tracker API works
- ✅ Employees appear

---

## ✅ **Summary**

**The Fix:**
```bash
# Stop server
Ctrl + C

# Start server
npm start

# Wait 5 seconds

# Test Beat Tracker
http://localhost:7000/beat-tracker.html
```

**Expected Result:**
- ✅ Page loads
- ✅ Shubham Kumar visible
- ✅ Can click and view details
- ✅ No errors in console

---

**🔄 Restart the server now and Beat Tracker will work!**

**Quick Command:** Stop (Ctrl+C) → `npm start` → Test!
