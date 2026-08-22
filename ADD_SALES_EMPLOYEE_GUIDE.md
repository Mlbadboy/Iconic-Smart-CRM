# 🚀 Add Sales Employee - Quick Guide

## ✅ **Two Ways to Add Sales Employees**

---

## 🎯 **Method 1: Quick Add Button (Easiest)**

### **Step 1: Open User Management**
```
1. Login as Admin
2. Dashboard → "👥 Manage Users"
3. Opens user management page
```

### **Step 2: Click Quick Add**
```
At top of page:

┌────────────────────────────────────────────┐
│ 🚀 Quick Add: Add sales employee in one   │
│ click!                                      │
│              [➕ Add Sales Employee]       │
└────────────────────────────────────────────┘

Click the green button
```

### **Step 3: Enter Name**
```
Popup appears:
"Enter employee name: ___________"

Type: Shubham Kumar
Click OK
```

### **Step 4: Confirm**
```
Confirmation popup shows:

Create sales employee?

Name: Shubham Kumar
Email: shubham.kumar@charlieai.com
Password: sales123
Role: Sales

Click OK
```

### **Step 5: Done!**
```
✅ Toast shows: "Sales employee Shubham Kumar created! Password: sales123"
✅ Employee appears in table
✅ Can now login and use CRM
✅ Visible in Beat Tracker
```

---

## 💻 **Method 2: Run Seed Script (For Testing)**

### **Create Dummy Employee via Script:**

```bash
# In CRM folder
cd c:\Users\mayur_hlx0x09\Desktop\Iconic-Smart-CRM

# Run seed script
node seedDummyEmployee.js
```

**Output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

✅ Dummy Sales Employee Created Successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Name: Shubham Kumar
📧 Email: shubham@charlieai.com
🔐 Password: shubham123
📱 Phone: 9876543210
👔 Role: Sales
🏢 Department: Sales
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Use these credentials to:
   1. Login to CRM
   2. Test Beat Tracker
   3. Track attendance & visits

📍 Access Beat Tracker at: http://localhost:7000/beat-tracker.html

✅ Script completed successfully!
```

**If already exists:**
```
⚠️  Employee "Shubham Kumar" already exists!
📧 Email: shubham@charlieai.com
🔐 Password: shubham123
👤 Role: sales
```

---

## 🧪 **Test the Employee**

### **Step 1: Login as Shubham**
```
1. Logout of admin account
2. Go to: http://localhost:7000/login.html
3. Enter credentials:
   Email: shubham@charlieai.com
   Password: shubham123
4. Login
5. ✅ Opens dashboard (sales view)
```

### **Step 2: View in Beat Tracker (As Admin)**
```
1. Login as admin
2. Dashboard → "📍 Beat Tracker"
3. Left sidebar → See "Shubham Kumar"
4. Click on name
5. ✅ View employee tracking page
```

---

## 📋 **Employee Details**

### **Created via Quick Add Button:**
```
Name: [Your Input]
Email: [auto-generated]@charlieai.com
Password: sales123 (default)
Role: Sales
Department: Sales
Status: Active
```

### **Created via Seed Script:**
```
Name: Shubham Kumar
Email: shubham@charlieai.com
Password: shubham123
Phone: 9876543210
Role: Sales
Department: Sales
Status: Active
```

---

## ✅ **What Employees Can Do**

### **Sales Employee Access:**
- ✅ Login to CRM
- ✅ View dashboard
- ✅ Create orders
- ✅ View products
- ✅ Manage retailers
- ✅ Track leads
- ❌ Cannot access User Management (admin only)
- ❌ Cannot see Beat Tracker (only managers see it)

### **For Field Work:**
- ✅ Use mobile app to mark attendance
- ✅ Mark store visits
- ✅ Upload selfies
- ✅ Create orders on-site
- ✅ GPS location captured automatically

---

## 🎯 **Adding Multiple Sales Employees**

### **Quick Method:**
```
1. Click "Add Sales Employee" button
2. Enter name: "Rahul Sharma"
3. Confirm
4. ✅ Created!

Repeat for more employees:
- Priya Patel
- Amit Singh
- Neha Gupta
```

### **Manual Method:**
```
Use the full form below:

Name: [Full Name]
Email: [email]
Phone: [number]
Role: Sales
Password: [set password]
Department: Sales
Status: Active

Click "Add User"
```

---

## 📊 **Verify Employee Created**

### **Check in User Management:**
```
1. Manage Users page
2. Scroll to table
3. Find employee row:

┌────────────────────────────────────────────┐
│ Shubham Kumar                              │
│ shubham@charlieai.com | 9876543210       │
│ [Sales] [Sales Dept] [Active]             │
│ Last Login: Never                          │
│ [🗑️ Delete]                               │
└────────────────────────────────────────────┘
```

### **Check in Beat Tracker:**
```
1. Dashboard → Beat Tracker
2. Left sidebar shows:

┌────────────────────────┐
│ 👥 Field Employees     │
├────────────────────────┤
│ Shubham Kumar          │
│ sales | shubham@...    │
└────────────────────────┘

Click to track!
```

---

## 🔐 **Employee Login Credentials**

### **Via Quick Add:**
- Email: [generated from name]
- Password: `sales123` (tell employee to change)

### **Via Seed Script:**
- Email: `shubham@charlieai.com`
- Password: `shubham123`

### **Security Note:**
⚠️ These are default passwords for testing.
In production, employees should change passwords on first login.

---

## ✅ **Summary**

**Quick Add Button:**
- ✅ Easiest method
- ✅ One click + name
- ✅ Auto-generates email
- ✅ Default password: sales123
- ✅ Instant creation

**Seed Script:**
- ✅ Creates "Shubham Kumar"
- ✅ Pre-defined credentials
- ✅ Perfect for testing
- ✅ Can run multiple times (checks if exists)

**Both Methods:**
- ✅ Creates active sales employee
- ✅ Visible in User Management
- ✅ Visible in Beat Tracker
- ✅ Can login immediately
- ✅ Ready for field work

---

**🎉 Now you can quickly add sales employees and track them in Beat Tracker!**

**Test now:**
1. Add employee via Quick Add button
2. View in Beat Tracker
3. Test login with employee credentials
