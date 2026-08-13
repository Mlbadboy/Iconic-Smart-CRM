# 👥 User Management System - Admin Only Feature

## 🎯 **New Feature: Manage CRM Users**

A complete user management system that allows **administrators only** to add and remove CRM users.

---

## 🔐 **Security: Admin Only Access**

### **Visibility:**
- ✅ **Admins:** Can see "Manage Users" card on dashboard
- ❌ **Non-Admins:** Card is hidden, page shows "Access Denied"

### **Protection Layers:**
1. **Frontend:** Card hidden unless user.role === 'admin'
2. **Page Level:** Access check redirects non-admins
3. **API Level:** All routes protected with `adminOnly` middleware
4. **Database Level:** Cannot delete admin users or self

---

## 📊 **Features**

### **1. Dashboard Integration**
**New Card on Dashboard (Admin Only):**
```
┌─────────────────────────────────────┐
│ 👥                                  │
│ Manage Users                        │
│ Add and remove CRM users (Admin Only)│
└─────────────────────────────────────┘
```

- Only visible if user role is **admin**
- Positioned after "Manage Leads" card
- Links to `/manage-users.html`

### **2. User Management Page**

**Features:**
- ✅ Add new users
- ✅ View all users
- ✅ Delete users (except admins)
- ✅ See user details (role, department, status, last login)
- ✅ Protected - non-admins see "Access Denied"

---

## ➕ **Add New User**

### **Form Fields:**

**Required:**
- Full Name
- Email
- Password (min 6 characters)
- Role (User/Admin/Manager/Sales)

**Optional:**
- Phone
- Department
- Status (Active/Inactive)

### **Roles Available:**
1. **Admin** - Full access including user management
2. **Manager** - Department management
3. **Sales** - Sales operations
4. **User** - Basic access

### **Example:**
```
Full Name: John Doe
Email: john@iconicsmart.com
Phone: 9876543210
Role: User
Password: ******
Department: Sales
Status: Active

[➕ Add User]
```

---

## 👥 **View All Users**

### **User Table Shows:**

| Name | Email | Phone | Role | Department | Status | Last Login | Actions |
|------|-------|-------|------|------------|--------|------------|---------|
| John Doe | john@email.com | 9876543210 | User | Sales | Active | 31/10/2025 10:30 AM | 🗑️ Delete |
| Jane Smith | jane@email.com | 9876543211 | Admin | IT | Active | 31/10/2025 11:00 AM | Protected |

**Features:**
- ✅ Color-coded role badges
- ✅ Active/Inactive status badges
- ✅ Last login timestamp
- ✅ Delete button (disabled for admins)
- ✅ Real-time refresh

---

## 🗑️ **Delete Users**

### **Protection Rules:**
1. ✅ Can delete: User, Manager, Sales roles
2. ❌ Cannot delete: Admin users
3. ❌ Cannot delete: Your own account
4. ✅ Confirmation required: "Delete user: [Name]?"

### **Delete Process:**
```
1. Click "🗑️ Delete" button

2. Confirmation popup:
   "Delete user: John Doe?
    This action cannot be undone."

3. Confirm → User deleted

4. Toast: "✅ User John Doe deleted"

5. Table refreshes automatically
```

---

## 🔐 **Access Control**

### **Frontend Protection:**

**Dashboard (dashboard.html):**
```javascript
// Show Users card only for admins
if (userData.user.role === 'admin') {
    document.getElementById('usersCard').style.display = 'flex';
}
```

**User Management Page (manage-users.html):**
```javascript
// Check admin access
async function checkAdminAccess() {
    const user = await fetch('/api/auth/me');
    if (user.role !== 'admin') {
        // Show "Access Denied" page
    }
}
```

### **Backend Protection:**

**API Routes (routes/users.js):**
```javascript
// All routes require auth + adminOnly
router.get('/', auth, adminOnly, async (req, res) => {
    // Only admins can access
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
    // Only admins can delete
    // Cannot delete self or other admins
});
```

---

## 🎯 **Use Cases**

### **1. New Employee Onboarding**
```
Scenario: New sales person joins

Admin Actions:
1. Dashboard → Manage Users
2. Fill form:
   Name: Rahul Sharma
   Email: rahul@iconicsmart.com
   Role: Sales
   Department: Sales
3. Click "Add User"
4. ✅ Rahul can now login

Result: New user added, appears in reports
```

### **2. Employee Departure**
```
Scenario: Employee leaves company

Admin Actions:
1. Dashboard → Manage Users
2. Find user: "Priya Patel"
3. Click "🗑️ Delete"
4. Confirm deletion
5. ✅ User removed

Result: User cannot login, removed from reports
```

### **3. Role Change**
```
Scenario: Promote user to manager

Admin Actions:
1. Dashboard → Manage Users
2. (Future: Edit functionality)
3. Change role: User → Manager
4. ✅ Updated

Result: User gets manager permissions
```

---

## 📊 **Reports Integration**

### **Users Report Export:**
When you download "Users Report" from Dashboard → Reports:

**CSV Shows:**
```csv
Name,Email,Phone,Role,Department,Status,Created Date,Last Login
John Doe,john@email.com,9876543210,User,Sales,Active,31/10/2025,31/10/2025 10:30 AM
Jane Smith,jane@email.com,9876543211,Admin,IT,Active,30/10/2025,31/10/2025 11:00 AM
```

**Users in report = Users in management page!**
- ✅ Same data source (MongoDB User collection)
- ✅ Same fields displayed
- ✅ Always synchronized

---

## 🧪 **Testing**

### **Test 1: Admin Access**
```
1. Login as admin user
2. Go to Dashboard
3. ✅ See "Manage Users" card
4. Click card
5. ✅ Opens user management page
6. ✅ See add form and user table
```

### **Test 2: Non-Admin Access**
```
1. Login as regular user
2. Go to Dashboard
3. ❌ Don't see "Manage Users" card
4. Try direct URL: /manage-users.html
5. ✅ See "Access Denied" page
6. ✅ Cannot access features
```

### **Test 3: Add User**
```
1. Admin → Manage Users
2. Fill form with new user
3. Click "Add User"
4. ✅ Toast: "User added successfully"
5. ✅ User appears in table
6. ✅ User can login
7. Download Users Report
8. ✅ New user appears in CSV
```

### **Test 4: Delete User**
```
1. Admin → Manage Users
2. Click delete on non-admin user
3. Confirm deletion
4. ✅ Toast: "User deleted"
5. ✅ User removed from table
6. Try to login as deleted user
7. ✅ Login fails
8. Download Users Report
9. ✅ User not in CSV
```

### **Test 5: Protected Actions**
```
1. Try to delete admin user
2. ✅ Button shows "Protected"
3. Try to delete your own account
4. ✅ Error: "Cannot delete your own account"
```

---

## 📁 **Files Created/Modified**

### **New Files:**
1. ✅ `public/manage-users.html` - User management page
2. ✅ `routes/users.js` - User API endpoints
3. ✅ `USER_MANAGEMENT_SYSTEM.md` - Documentation

### **Modified Files:**
1. ✅ `public/dashboard.html` - Added Users card with admin check
2. ✅ `routes/auth.js` - Added /me endpoint
3. ✅ `middleware/auth.js` - Added adminOnly export
4. ✅ `server.js` - Registered users route

---

## 🔧 **API Endpoints**

### **GET /api/users** (Admin Only)
Get all users
```
Response: Array of users (without passwords)
```

### **DELETE /api/users/:id** (Admin Only)
Delete a user
```
Protection:
- Cannot delete self
- Cannot delete other admins
- Requires confirmation
```

### **GET /api/auth/me** (Authenticated)
Get current user info
```
Response: { id, name, email, role, phone, department }
```

---

## ✅ **Security Features**

1. ✅ **Role-Based Access Control (RBAC)**
   - Only admins can access user management
   
2. ✅ **Frontend Protection**
   - Card hidden from non-admins
   - Page checks role before showing content
   
3. ✅ **Backend Protection**
   - All API routes require admin auth
   - Middleware validates role on every request
   
4. ✅ **Self-Protection**
   - Cannot delete your own account
   - Cannot delete other admin accounts
   
5. ✅ **Confirmation Required**
   - Delete requires explicit confirmation
   - Shows user name in confirmation

---

## 🎉 **Summary**

**What You Get:**
- ✅ Complete user management system
- ✅ Admin-only access (3-layer protection)
- ✅ Add new CRM users
- ✅ Delete users (with protection)
- ✅ View all users with details
- ✅ Integrated with Reports
- ✅ Dashboard card (admin only)
- ✅ Role-based permissions
- ✅ Cannot delete admins or self
- ✅ Confirmation required for deletion

**Access:**
- Admins: Dashboard → "👥 Manage Users" card
- Direct URL: http://localhost:7000/manage-users.html
- API: /api/users (admin only)

**Protection:**
- Non-admins cannot see the card
- Non-admins cannot access the page
- Non-admins cannot call the API
- Cannot delete admin users
- Cannot delete yourself

---

**🔐 User Management is now live - Admin Only! 👥**

**Test it:** Login as admin → Dashboard → Manage Users card
