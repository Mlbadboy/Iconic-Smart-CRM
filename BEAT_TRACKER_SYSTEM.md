# 📍 Beat Tracker System - Field Employee Monitoring

## 🎯 **Complete Field Force Tracking Solution**

A comprehensive system to track field employees, their attendance, store visits, locations, performance, and business achievements.

---

## ✅ **Features**

### **📍 Live Location Tracking**
- GPS coordinates (latitude, longitude)
- Address with city and state
- Google Maps integration
- Real-time attendance marking

### **⏰ Attendance Monitoring**
- Daily check-in/check-out times
- Location at time of attendance
- Monthly attendance calendar
- Present/Absent status tracking
- Working hours calculation

### **🏪 Store Visit Tracking**
- Retailer visit logs
- Visit time and location
- Store selfie uploads
- Order placed status
- Visit purpose and feedback
- Business generated per visit

### **🎯 Performance Management**
- Target vs Achievement tracking
- Monthly sales targets
- Revenue tracking
- Orders count
- Visit count targets
- Achievement percentage

### **📊 Business Analytics**
- Total orders generated
- Revenue per employee
- Store visit statistics
- Monthly performance reports
- Manager dashboard for team tracking

---

## 📁 **Files Created**

### **Database Models:**
1. ✅ `models/Attendance.js` - Attendance records with location
2. ✅ `models/StoreVisit.js` - Store visit tracking with selfies
3. ✅ `models/EmployeeTarget.js` - Target & achievement tracking

### **API Routes:**
1. ✅ `routes/beatTracker.js` - Complete API for beat tracking

### **Frontend:**
1. ✅ `public/beat-tracker.html` - Full monitoring dashboard

### **Integration:**
1. ✅ `server.js` - Route registered
2. ✅ `dashboard.html` - Beat Tracker card added

---

## 🎯 **How It Works**

### **For Field Employees (Mobile App):**

**Step 1: Mark Attendance**
```
Employee opens mobile app
Clicks "Mark Attendance"
App captures:
- Current time
- GPS location (lat/long)
- City and address
Sends to CRM database
```

**Step 2: Visit Store**
```
Employee visits retailer store
Opens "Mark Visit" in app
Fills:
- Retailer name
- Visit purpose
- Takes selfie at store
App captures GPS location
Sends to CRM
```

**Step 3: Place Order** (Optional)
```
If order placed:
- Order value captured
- Linked to store visit
- Updates achievement stats
```

### **For Managers (CRM Dashboard):**

**Step 1: Open Beat Tracker**
```
Login to CRM → Dashboard
Click "📍 Beat Tracker" card
Opens monitoring page
```

**Step 2: Select Employee**
```
Left sidebar shows all field employees
Click on employee name
View complete tracking data
```

**Step 3: View Data**
```
See:
- Today's check-in time & location
- Monthly attendance (30 days)
- All store visits with selfies
- Target vs Achievement
- Revenue generated
- Orders placed
```

---

## 📊 **Dashboard Sections**

### **1. Stats Cards (Top)**
```
┌─────────────────────────────────────────────────────┐
│ Today's Check-in | Month Attendance | Store Visits  │
│     10:30 AM     |     24 days      |      45       │
│                  |                  |               │
│                   Orders Generated                   │
│                        18                            │
└─────────────────────────────────────────────────────┘
```

### **2. Target vs Achievement**
```
┌─────────────────────────────────────────────────────┐
│ 🎯 SALES Target                  85% Achieved       │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░              850K / 1M        │
│                                                      │
│ 🎯 VISITS Target                 120% Achieved      │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓               60 / 50         │
└─────────────────────────────────────────────────────┘
```

### **3. Attendance Calendar**
```
Month: November 2025

┌────┬────┬────┬────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │
│✅  │✅  │✅  │✅  │✅  │❌  │❌  │
│9:30│9:45│9:15│9:20│10:00│   │   │
│Delhi│Mumbai│Delhi│Delhi│Noida│  │  │
├────┼────┼────┼────┼────┼────┼────┤
│ 8  │ 9  │ 10 │ 11 │ 12 │... │30  │
│✅  │✅  │✅  │✅  │✅  │   │✅  │
└────┴────┴────┴────┴────┴────┴────┘
```

### **4. Store Visits List**
```
┌────────────────────────────────────────────────────┐
│ 🏪 ABC Electronics                    ✅ Order Placed│
│ 📅 31/10/2025 | ⏰ 10:30 AM                        │
│                                                     │
│ 📍 Connaught Place, Delhi                          │
│    28.6328, 77.2197 (View Map)                     │
│ 💰 Order Value: ₹45,000                            │
│ 🎯 Purpose: Product demo & order                   │
│                                                     │
│ 📸 [Store Selfie Image]                            │
│ Feedback: Great response, bulk order planned       │
└────────────────────────────────────────────────────┘
```

---

## 🔌 **API Endpoints**

### **GET /api/beat-tracker/employees**
Get all field employees
```json
[{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Rajesh Kumar",
  "email": "rajesh@iconicsmart.com",
  "role": "sales",
  "phone": "9876543210"
}]
```

### **GET /api/beat-tracker/attendance/:employeeId**
Get employee attendance for a month
```
Query: ?month=11&year=2025
```

### **GET /api/beat-tracker/visits/:employeeId**
Get employee store visits
```
Query: ?month=11&year=2025
```

### **GET /api/beat-tracker/performance/:employeeId**
Get target vs achievement
```json
{
  "targets": [{
    "targetType": "sales",
    "targetValue": 1000000,
    "achievedValue": 850000
  }],
  "achievements": {
    "revenue": 850000,
    "orders": 18,
    "visits": 45
  }
}
```

### **POST /api/beat-tracker/attendance**
Mark attendance (from mobile app)
```json
{
  "employeeId": "507f1f77bcf86cd799439011",
  "employeeName": "Rajesh Kumar",
  "checkInTime": "2025-10-31T09:30:00Z",
  "location": {
    "latitude": 28.6328,
    "longitude": 77.2197,
    "address": "Connaught Place",
    "city": "Delhi"
  }
}
```

### **POST /api/beat-tracker/visit**
Mark store visit (from mobile app)
```json
{
  "employeeId": "507f1f77bcf86cd799439011",
  "employeeName": "Rajesh Kumar",
  "retailerName": "ABC Electronics",
  "visitDate": "2025-10-31",
  "visitTime": "2025-10-31T10:30:00Z",
  "location": {
    "latitude": 28.6328,
    "longitude": 77.2197,
    "city": "Delhi"
  },
  "selfieImage": "/uploads/selfie_123.jpg",
  "visitPurpose": "Product demo",
  "orderValue": 45000,
  "orderPlaced": true,
  "feedback": "Great response"
}
```

---

## 🧪 **Testing**

### **Test 1: Open Beat Tracker**
```
1. Login to CRM
2. Dashboard → Click "📍 Beat Tracker"
3. ✅ Opens beat-tracker.html
4. ✅ Shows field employees list
```

### **Test 2: View Employee Data**
```
1. Click employee name
2. ✅ Shows today's check-in
3. ✅ Shows monthly stats
4. ✅ Shows attendance calendar
5. ✅ Shows store visits
6. ✅ Shows performance
```

### **Test 3: Month Selection**
```
1. Select different month from dropdown
2. ✅ Attendance updates
3. ✅ Visits update
4. ✅ Performance updates
```

---

## 📱 **Mobile App Integration**

Your mobile app needs to send data to these endpoints:

### **Mark Attendance:**
```javascript
POST /api/beat-tracker/attendance
{
  employeeId: "user_id_from_login",
  employeeName: "name",
  checkInTime: new Date(),
  location: {
    latitude: getCurrentLat(),
    longitude: getCurrentLong(),
    city: getCity(),
    address: getAddress()
  }
}
```

### **Mark Store Visit:**
```javascript
POST /api/beat-tracker/visit
{
  employeeId: "user_id",
  retailerName: "store_name",
  visitTime: new Date(),
  location: getCurrentLocation(),
  selfieImage: uploadedImagePath,
  orderPlaced: true/false,
  orderValue: amount
}
```

---

## 🎯 **Use Cases**

### **Use Case 1: Daily Attendance Tracking**
```
Manager wants to see who marked attendance today

1. Open Beat Tracker
2. See all employees
3. Green card = Present
4. See check-in time & location
5. Verify employee is at correct location
```

### **Use Case 2: Store Visit Verification**
```
Manager wants to verify store visit

1. Select employee
2. Click on store visit
3. View selfie at store
4. Check GPS location
5. See order value
6. Verify visit is legitimate
```

### **Use Case 3: Monthly Performance Review**
```
Manager doing monthly review

1. Select employee
2. Select month
3. View:
   - Attendance: 24/30 days
   - Store visits: 45 visits
   - Orders: 18 orders
   - Revenue: ₹850,000
   - Target: ₹1,000,000
   - Achievement: 85%
```

### **Use Case 4: Sales Team Meeting**
```
Weekly sales team meeting

1. Open each employee
2. Compare performance
3. Identify top performers
4. Help underperformers
5. Set new targets
```

---

## ✅ **Summary**

**What's Built:**
- ✅ Complete field force tracking system
- ✅ Attendance monitoring with location
- ✅ Store visit tracking with selfies
- ✅ Target vs Achievement dashboard
- ✅ Monthly performance reports
- ✅ GPS location tracking
- ✅ Google Maps integration
- ✅ Real-time data updates
- ✅ Manager monitoring dashboard
- ✅ Mobile app integration ready

**Access:**
- Dashboard → "📍 Beat Tracker" card
- URL: http://localhost:7000/beat-tracker.html
- API: /api/beat-tracker/*

**Features:**
- Track attendance with location
- Monitor store visits
- View selfies at stores
- Check GPS coordinates
- Monitor performance
- Track targets
- View monthly reports
- Select any month/year

---

**🎉 Beat Tracker is ready! Your managers can now monitor field employees in real-time!** 📍👥
