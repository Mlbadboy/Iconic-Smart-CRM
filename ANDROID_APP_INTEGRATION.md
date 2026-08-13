# 📱 Android App Integration - Complete Guide

## 🎯 **System Architecture**

```
┌──────────────────────────────────────────────────────┐
│                    ICONIC SMART CRM                  │
│                  (Admin Dashboard)                    │
│                                                       │
│  ✅ Admin adds Sales Employees                       │
│  ✅ Sets targets & assigns territories               │
│  ✅ Monitors through Beat Tracker                    │
│  ✅ Views reports & analytics                        │
└───────────────────┬──────────────────────────────────┘
                    │
                    │ API Calls (REST)
                    │ http://localhost:7000/api
                    │
┌───────────────────▼──────────────────────────────────┐
│              ANDROID APP (Field Staff)                │
│                                                       │
│  ✅ Sales employee logs in                           │
│  ✅ Marks attendance (GPS + Time)                    │
│  ✅ Visits stores (GPS + Selfie)                     │
│  ✅ Creates orders on-site                           │
│  ✅ Tracks daily activities                          │
└──────────────────────────────────────────────────────┘
```

---

## 🔐 **Authentication Flow**

### **Step 1: Admin Creates Employee in CRM**
```
Admin Dashboard:
1. Login to CRM (http://localhost:7000)
2. Go to "Manage Users"
3. Click "Add Sales Employee"
4. Enter: Shubham Kumar
5. ✅ Created!

Generated Credentials:
Email: shubham.kumar@iconicsmart.com
Password: sales123
Role: sales
```

### **Step 2: Employee Logs in Android App**
```
Android App Login Screen:
┌────────────────────────────┐
│  ICONIC SMART CRM         │
│  Field Employee Login      │
│                           │
│  Email:                   │
│  [shubham.kumar@...      ]│
│                           │
│  Password:                │
│  [sales123              ]│
│                           │
│      [Login Button]       │
└────────────────────────────┘

App sends:
POST http://localhost:7000/api/auth/login
{
  "email": "shubham.kumar@iconicsmart.com",
  "password": "sales123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "6904fcf0a254947361617bb8",
    "name": "Shubham Kumar",
    "email": "shubham.kumar@iconicsmart.com",
    "role": "sales"
  }
}

✅ App saves token for future API calls
```

### **Step 3: Only CRM-Created Employees Can Login**
```
✅ Employee exists in CRM database → Login succeeds
❌ Random person tries to login → Login fails
❌ Employee deleted from CRM → Login fails
❌ Employee deactivated → Login fails

Security:
- Only admin can create employees
- Only active employees can login
- Token expires after 24 hours
- Must re-login daily
```

---

## 📍 **Android App Features & API Integration**

### **Feature 1: Mark Attendance**

**Android App Screen:**
```
┌────────────────────────────┐
│  Good Morning!            │
│  Shubham Kumar            │
│                           │
│  📍 Current Location:     │
│  Connaught Place, Delhi   │
│                           │
│  🕐 09:30 AM             │
│                           │
│  [Mark Attendance]        │
└────────────────────────────┘

When clicked:
1. App gets GPS location
2. Gets current time
3. Takes optional photo
4. Sends to CRM
```

**API Call:**
```javascript
POST /api/beat-tracker/attendance
Headers: {
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
}

Body: {
  "employeeId": "6904fcf0a254947361617bb8",
  "employeeName": "Shubham Kumar",
  "employeeEmail": "shubham.kumar@iconicsmart.com",
  "checkInTime": "2025-10-31T09:30:00Z",
  "location": {
    "latitude": 28.6328,
    "longitude": 77.2197,
    "address": "Connaught Place",
    "city": "Delhi",
    "state": "Delhi"
  }
}

Response: {
  "message": "Attendance recorded",
  "attendance": { ... }
}
```

**Result in CRM:**
```
Admin opens Beat Tracker:
✅ See: Shubham Kumar checked in at 09:30 AM
✅ Location: Connaught Place, Delhi
✅ Can click "View on Map" (Google Maps)
```

---

### **Feature 2: Store Visit**

**Android App Screen:**
```
┌────────────────────────────┐
│  Visit Store              │
│                           │
│  Retailer:                │
│  [ABC Electronics      ▼] │
│                           │
│  Purpose:                 │
│  [Product Demo         ▼] │
│                           │
│  📷 [Take Selfie]         │
│  [photo_preview.jpg]      │
│                           │
│  Order Placed? ☑ Yes     │
│  Order Value: ₹45,000     │
│                           │
│  Feedback:                │
│  [Great response from... ]│
│                           │
│  [Submit Visit]           │
└────────────────────────────┘

When submitted:
1. Captures GPS location
2. Uploads selfie photo
3. Records visit details
4. Sends to CRM
```

**API Call:**
```javascript
POST /api/beat-tracker/visit
Headers: {
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
}

Body: {
  "employeeId": "6904fcf0a254947361617bb8",
  "employeeName": "Shubham Kumar",
  "retailerId": "507f1f77bcf86cd799439011",
  "retailerName": "ABC Electronics",
  "retailerPhone": "9876543210",
  "visitDate": "2025-10-31",
  "visitTime": "2025-10-31T10:30:00Z",
  "location": {
    "latitude": 28.6328,
    "longitude": 77.2197,
    "address": "Connaught Place",
    "city": "Delhi",
    "state": "Delhi"
  },
  "selfieImage": "/uploads/selfie_shubham_20251031_103000.jpg",
  "visitPurpose": "Product Demo",
  "orderPlaced": true,
  "orderValue": 45000,
  "feedback": "Great response, planning bulk order"
}

Response: {
  "message": "Store visit recorded",
  "visit": { ... }
}
```

**Result in CRM:**
```
Admin opens Beat Tracker → Click Shubham Kumar:
✅ See store visit card with:
   - Retailer: ABC Electronics
   - Time: 10:30 AM
   - Location: Connaught Place (with map link)
   - Selfie photo (click to view)
   - Order value: ₹45,000
   - Feedback
```

---

### **Feature 3: Create Order**

**Android App Screen:**
```
┌────────────────────────────┐
│  Create Order             │
│                           │
│  Retailer:                │
│  [ABC Electronics      ▼] │
│                           │
│  Products:                │
│  ☑ Samsung TV (2) ₹51,998│
│  ☑ LG Fridge (1)  ₹14,990│
│  ☐ Whirlpool AC          │
│                           │
│  Subtotal:  ₹66,988       │
│  GST (18%): ₹12,058       │
│  Total:     ₹79,046       │
│                           │
│  Payment: [Pending     ▼] │
│                           │
│  [Generate Order]         │
└────────────────────────────┘
```

**API Call:**
```javascript
POST /api/orders
Headers: {
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
}

Body: {
  "retailerId": "507f1f77bcf86cd799439011",
  "retailerName": "ABC Electronics",
  "items": [
    {
      "productId": "prod123",
      "name": "Samsung 43\" TV",
      "quantity": 2,
      "price": 25999,
      "total": 51998
    },
    {
      "productId": "prod124",
      "name": "LG Refrigerator",
      "quantity": 1,
      "price": 14990,
      "total": 14990
    }
  ],
  "subtotal": 66988,
  "gstAmount": 12058,
  "amount": 79046,
  "paymentStatus": "pending",
  "userId": "6904fcf0a254947361617bb8"
}

Response: {
  "message": "Order created successfully",
  "order": { ... },
  "invoicePath": "/invoices/INV-2025-001.pdf"
}
```

**Result in CRM:**
```
✅ Order appears in View Orders
✅ Order counted in Beat Tracker stats
✅ Revenue added to employee achievement
✅ Invoice generated automatically
```

---

## 📊 **Data Flow: Android App → CRM Dashboard**

### **Morning Routine:**
```
09:00 AM - Employee opens app
09:15 AM - Marks attendance
         → CRM instantly shows check-in time & location

10:00 AM - Visits Store A
         → CRM shows visit in Beat Tracker

10:30 AM - Creates order at Store A
         → Order appears in CRM
         → Revenue added to employee stats

11:30 AM - Visits Store B
         → Second visit logged

12:00 PM - Creates order at Store B
         → Second order added

End of Day:
✅ All activities visible in Beat Tracker
✅ Manager can review entire day
✅ Performance metrics updated
```

### **Manager View in CRM:**
```
Beat Tracker → Shubham Kumar:

Today's Stats:
- Check-in: 09:15 AM (Connaught Place)
- Store Visits: 2
- Orders Created: 2
- Revenue Generated: ₹1,24,046
- Last Activity: 12:00 PM

Monthly Stats:
- Attendance: 24/30 days
- Store Visits: 45
- Orders: 18
- Revenue: ₹8,50,000
- Target: ₹10,00,000
- Achievement: 85%
```

---

## 🔑 **API Endpoints for Android App**

### **Authentication:**
```
POST /api/auth/login
- Login with email/password
- Get token for API calls

POST /api/auth/logout
- Logout (optional)

GET /api/auth/me
- Get current user info
```

### **Attendance:**
```
POST /api/beat-tracker/attendance
- Mark daily attendance
- Include GPS location

GET /api/beat-tracker/attendance/:employeeId
- Get attendance history (for app to show)
```

### **Store Visits:**
```
POST /api/beat-tracker/visit
- Mark store visit with selfie
- Include GPS location, order details

GET /api/beat-tracker/visits/:employeeId
- Get visit history
```

### **Orders:**
```
POST /api/orders
- Create order on-site
- Generate invoice

GET /api/orders
- View employee's orders

GET /api/orders/:id
- View specific order
```

### **Retailers:**
```
GET /api/retailers
- Get list of retailers for dropdown
- Filter by city/area

GET /api/retailers/:id
- Get retailer details
```

### **Products:**
```
GET /api/products
- Get products list
- For creating orders

GET /api/products/:id
- Get product details
```

### **Performance:**
```
GET /api/beat-tracker/performance/:employeeId
- Get targets & achievements
- Show in app dashboard

GET /api/beat-tracker/summary/:employeeId
- Get daily/monthly summary
```

---

## 🔐 **Security & Access Control**

### **What Sales Employees CAN Do:**
```
✅ Login to Android app
✅ Mark attendance
✅ Mark store visits
✅ Create orders
✅ View their own data
✅ View products & retailers
✅ View their targets & achievements
```

### **What Sales Employees CANNOT Do:**
```
❌ Access CRM dashboard
❌ View other employees' data
❌ Create/delete employees
❌ Access Beat Tracker (manager view)
❌ Modify targets
❌ Delete orders
❌ Access admin features
```

### **Authentication:**
```javascript
// Every API call from app includes:
Headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...',
  'Content-Type': 'application/json'
}

// Server validates:
1. Token is valid
2. Token not expired
3. User is active
4. User has correct role
```

---

## 📱 **Android App Requirements**

### **Permissions Needed:**
```
✅ Location (GPS) - For attendance & visits
✅ Camera - For selfies at stores
✅ Internet - For API calls
✅ Storage - For caching data
```

### **Features to Implement:**
```
1. Login Screen
   - Email/password fields
   - Remember me option
   - Auto-logout after 24 hours

2. Dashboard
   - Today's stats
   - Quick actions (Mark Attendance, Visit Store)
   - Pending tasks

3. Attendance Module
   - One-tap attendance marking
   - Shows GPS location
   - History view

4. Store Visit Module
   - Retailer selector
   - Camera for selfie
   - GPS auto-capture
   - Order integration

5. Order Creation
   - Retailer selector
   - Product catalog
   - Cart & checkout
   - Invoice generation

6. Performance Dashboard
   - Monthly stats
   - Target vs Achievement
   - Visit history
   - Order history
```

---

## 🧪 **Testing the Integration**

### **Test 1: Employee Creation to Login**
```
1. CRM: Admin creates employee "Test User"
2. Generated: test.user@iconicsmart.com / sales123
3. Android App: Login with these credentials
4. ✅ Should login successfully
5. ✅ Token received
```

### **Test 2: Mark Attendance**
```
1. Android App: Click "Mark Attendance"
2. GPS location captured
3. API call sent to /api/beat-tracker/attendance
4. ✅ Response: "Attendance recorded"
5. CRM: Check Beat Tracker → Employee
6. ✅ See attendance with time & location
```

### **Test 3: Store Visit**
```
1. Android App: Mark visit to ABC Electronics
2. Take selfie
3. Enter details
4. Submit
5. ✅ API call succeeds
6. CRM: Check Beat Tracker
7. ✅ See visit with selfie & location
```

### **Test 4: Create Order**
```
1. Android App: Select retailer
2. Add products
3. Generate order
4. ✅ Order created
5. CRM: Check View Orders
6. ✅ Order appears
7. CRM: Beat Tracker shows order in stats
```

---

## ✅ **Complete System Flow**

```
┌─────────────────────────────────────────────────┐
│              DAY IN THE LIFE                     │
└─────────────────────────────────────────────────┘

ADMIN (CRM Dashboard):
├─ 08:00 AM: Login to CRM
├─ 08:15 AM: Add new employee "Rahul Sharma"
├─ 08:20 AM: Set monthly targets
├─ 08:30 AM: Open Beat Tracker
└─ Wait for employees to start...

EMPLOYEE (Android App):
├─ 09:00 AM: Open app, login
├─ 09:15 AM: Mark attendance
│            → Appears in Beat Tracker instantly
├─ 10:00 AM: Visit Store A
│            → GPS + Selfie captured
│            → Visible in CRM
├─ 10:30 AM: Create order (₹45,000)
│            → Order in CRM
│            → Stats updated
├─ 11:30 AM: Visit Store B
│            → Second visit logged
├─ 12:00 PM: Create order (₹38,000)
│            → Second order added
└─ End of day

ADMIN (CRM Dashboard):
├─ Check Beat Tracker throughout day
├─ See real-time updates:
│  ├─ Attendance marked
│  ├─ 2 stores visited
│  ├─ 2 orders created
│  └─ ₹83,000 revenue generated
├─ View selfies from stores
├─ Check GPS locations
├─ Monitor targets
└─ Generate reports

✅ Complete visibility & control!
```

---

## 📊 **Summary**

**System Design:**
- ✅ CRM = Backend + Admin Dashboard
- ✅ Android App = Field Employee Frontend
- ✅ Same database, same authentication
- ✅ Real-time data sync

**User Flow:**
1. ✅ Admin creates employee in CRM
2. ✅ Employee downloads Android app
3. ✅ Employee logs in with CRM credentials
4. ✅ Employee performs field activities
5. ✅ Data sent to CRM via API
6. ✅ Admin monitors via Beat Tracker
7. ✅ Complete tracking & analytics

**Benefits:**
- ✅ Centralized employee management
- ✅ Real-time field tracking
- ✅ GPS-verified attendance
- ✅ Photo-verified store visits
- ✅ On-site order creation
- ✅ Complete performance monitoring
- ✅ Target vs achievement tracking

---

**🎯 The CRM is the master system. Android app is just the mobile interface for field staff!**

**API Base URL:** `http://localhost:7000/api` (or `https://www.iconicsmart.co.in/api` in production)
**Auth Required:** Yes, token from login
**Employee Creation:** Only via CRM admin
