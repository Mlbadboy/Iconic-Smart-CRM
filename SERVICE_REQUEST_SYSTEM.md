# 🎫 Complete Service Request System

## 🎉 Overview

A complete service request management system with Service Center management, product-based service requests, and email notifications.

---

## 📋 Features

### **1. Service Center Management** 🏢
- Add/Manage Service Centers
- Store center details (Name, Email, Address, GST, Phone)
- Define services offered (Installation, Repair)
- Active/Inactive status management

### **2. Service Request Creation** ➕
- 4-step guided form
- Select Service Center
- Choose Service Type (Installation/Repair)
- Select Product Type (LED TV, Washing Machine, etc.)
- Enter Product Serial Number
- Priority levels
- Issue description

### **3. Email Notifications** 📧
- Automatic email to service center on request creation
- Includes all request details
- Tracks email sent status

### **4. Dashboard Integration** 📊
- Real-time pending requests count
- Status tracking (Open, In Progress, Resolved, Closed)

---

## 🚀 Complete Workflow

### **Step 1: Add Service Centers**

```
1. Login to CRM
2. Go to: Service Requests page
3. Click "🏢 Service Centers"
4. Click "➕ Add Service Center"
5. Fill in details:
   - Center Name
   - Email (for notifications)
   - GST Number
   - Phone
   - Address
   - Services Offered (✓ Installation, ✓ Repair)
6. Click "Save Service Center"
```

**URL**: http://localhost:7000/service-centers.html

---

### **Step 2: Create Service Request**

```
1. Go to: Service Requests page
2. Click "➕ Create Request"
3. Follow the 4-step form:

   STEP 1: Select Service Center
   - Choose from dropdown
   - See center details

   STEP 2: Select Service Type
   - Installation or Repair
   - Only services offered by selected center

   STEP 3: Select Product Type
   - LED TV
   - Washing Machine
   - Refrigerator
   - Audio System
   - Air Cooler

   STEP 4: Product Details
   - Enter Serial Number
   - Describe issue
   - Set priority (Low/Medium/High/Urgent)

4. Click "✅ Submit Service Request"
```

**URL**: http://localhost:7000/create-service-request.html

---

### **Step 3: After Submission**

**What Happens:**
1. ✅ Request saved to database
2. ✅ Unique Service ID generated (e.g., SR000001)
3. ✅ Email sent to Service Center
4. ✅ Dashboard counter updated
5. ✅ Status set to "Open"

**Email Contains:**
- Request ID
- Service Type
- Product Type
- Serial Number
- Priority
- Issue Description

---

## 📊 Data Structure

### **Service Center**
```json
{
  "name": "Quick Fix Service Center",
  "email": "quickfix@example.com",
  "phone": "+1234567890",
  "address": "123 Main St, City",
  "gstNumber": "GST123456789",
  "servicesOffered": ["installation", "repair"],
  "active": true
}
```

### **Service Request**
```json
{
  "serviceId": "SR000001",
  "serviceCenterId": "64f...",
  "serviceCenterName": "Quick Fix Service Center",
  "serviceCenterEmail": "quickfix@example.com",
  "serviceType": "repair",
  "productType": "LED TV",
  "serialNumber": "TV123456789",
  "description": "Screen not turning on",
  "priority": "high",
  "status": "open",
  "emailSent": true,
  "emailSentAt": "2025-01-30T10:00:00Z"
}
```

---

## 🔗 API Endpoints

### **Service Centers**

```
GET    /api/service-centers          - Get all centers
GET    /api/service-centers/active   - Get active centers
POST   /api/service-centers          - Create center
PUT    /api/service-centers/:id      - Update center
DELETE /api/service-centers/:id      - Deactivate center
```

### **Service Requests**

```
GET    /api/service-requests                    - Get all requests
GET    /api/service-requests/status/:status     - Filter by status
GET    /api/service-requests/center/:centerId   - By service center
GET    /api/service-requests/serial/:serial     - By serial number
GET    /api/service-requests/stats/summary      - Get statistics
POST   /api/service-requests                    - Create request
PUT    /api/service-requests/:id                - Update request
PATCH  /api/service-requests/:id/status         - Update status
```

---

## 📱 Pages

### **1. Service Centers Management**
**URL**: `/service-centers.html`
- Add new service centers
- View all centers
- See services offered

### **2. Create Service Request**
**URL**: `/create-service-request.html`
- 4-step guided form
- Dropdown selections
- Serial number tracking

### **3. Service Requests List**
**URL**: `/services.html`
- View all requests
- Filter by status/priority
- Search functionality
- Links to manage centers and create requests

---

## 🧪 Testing the System

### **Test Scenario 1: Complete Flow**

```
1. Add Service Center:
   - Name: "Tech Fix Center"
   - Email: "techfix@example.com"
   - GST: "GST001"
   - Services: Installation, Repair

2. Create Service Request:
   - Service Center: Tech Fix Center
   - Service Type: Repair
   - Product: LED TV
   - Serial: TV12345
   - Issue: "No display"
   - Priority: High

3. Verify:
   - Request appears in list
   - Status shows "Open"
   - Dashboard count updated
   - Email notification logged
```

### **Test Scenario 2: Multiple Products**

```
Create requests for different products:
- LED TV (Serial: TV001)
- Washing Machine (Serial: WM001)
- Refrigerator (Serial: RF001)
- Audio System (Serial: AS001)
- Air Cooler (Serial: AC001)
```

### **Test Scenario 3: Different Service Centers**

```
1. Add multiple service centers
2. Create requests assigned to different centers
3. Filter by service center
4. Track requests per center
```

---

## 🎯 Key Features Explained

### **Cascading Dropdowns**

```javascript
// Step 1: Select Service Center
onchange="loadServiceTypes()"

// Step 2: Service Type enables Product selection
onchange="enableProductSelect()"

// Step 3: Product Type enables Serial Number
onchange="enableSerialNumber()"

// Each step validates before enabling next
```

### **Email Notification**

```javascript
// Automatic on submission
async function sendEmailNotification(requestData) {
    // Logs to console (production would use nodemailer)
    console.log('📧 Email Notification:');
    console.log('To:', requestData.serviceCenterEmail);
    console.log('Subject: New Service Request -', requestData.serviceId);
    // ... request details
}
```

### **Dashboard Integration**

```javascript
// Updates pending count
GET /api/service-requests/stats/summary
// Returns:
{
  "total": 10,
  "open": 5,
  "inProgress": 3,
  "resolved": 2,
  "pending": 8  // open + inProgress
}
```

---

## 📧 Email Configuration (Production)

To enable real emails in production, update `/routes/serviceRequests.js`:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendEmailNotification(requestData) {
    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: requestData.serviceCenterEmail,
        subject: `New Service Request - ${requestData.serviceId}`,
        html: `
            <h2>New Service Request</h2>
            <p><strong>Request ID:</strong> ${requestData.serviceId}</p>
            <p><strong>Service Type:</strong> ${requestData.serviceType}</p>
            <p><strong>Product:</strong> ${requestData.productType}</p>
            <p><strong>Serial Number:</strong> ${requestData.serialNumber}</p>
            <p><strong>Priority:</strong> ${requestData.priority}</p>
            <p><strong>Description:</strong> ${requestData.description}</p>
        `
    };

    return await transporter.sendMail(mailOptions);
}
```

Add to `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=crm@charlieai.com
```

---

## 🔄 Status Workflow

```
Open → In Progress → Resolved → Closed
  ↓                     ↓
  └── (Can reopen) ────┘
```

**Status Changes:**
- **Open**: New request created
- **In Progress**: Service center working on it
- **Resolved**: Issue fixed, awaiting confirmation
- **Closed**: Confirmed completed

---

## 📊 Dashboard Display

The dashboard will show:

```
┌─────────────────────────────┐
│   📊 Quick Stats            │
├─────────────────────────────┤
│  Orders: 6                  │
│  Services: 5 ← Updated!     │
│  Leads: 4                   │
│  Deliveries: 0              │
└─────────────────────────────┘
```

Service count = Total pending requests (Open + In Progress)

---

## 🎨 UI/UX Features

### **Guided Form**
- Numbered steps (1, 2, 3, 4)
- Visual progress
- Disabled fields until previous step complete
- Info boxes showing selected center details

### **Validation**
- Required fields marked with *
- Cannot submit incomplete form
- Email format validation
- GST number format

### **Feedback**
- Loading spinners
- Success/error messages
- Email sent confirmation
- Dashboard auto-update

---

## 🚀 Quick Start Guide

### **For Admins**

```
1. Setup Service Centers (one-time):
   - Add all your service centers
   - Verify email addresses
   - Assign services offered

2. Create Requests (daily):
   - Click "Create Request"
   - Follow the 4 steps
   - Submit

3. Monitor (ongoing):
   - View all requests
   - Filter by status
   - Track by serial number
```

### **For Service Centers**

```
1. Receive Email:
   - Check email for new requests
   - Note request ID and details

2. Update Status:
   - Login to CRM (if given access)
   - Update request status
   - Add notes

3. Complete:
   - Mark as resolved
   - Admin closes after confirmation
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Service Centers page loads
- [ ] Can add new service center
- [ ] Create Request form opens
- [ ] Dropdowns cascade correctly
- [ ] Can submit request
- [ ] Request appears in list
- [ ] Dashboard count updates
- [ ] Email notification logged
- [ ] Filter and search work
- [ ] Status updates work

---

## 🎯 Summary

**Complete System Includes:**
1. ✅ Service Center Management
2. ✅ 4-Step Service Request Form
3. ✅ Product-based tracking
4. ✅ Serial number management
5. ✅ Email notifications
6. ✅ Dashboard integration
7. ✅ Status workflow
8. ✅ Filter and search
9. ✅ Priority levels
10. ✅ Full API support

**Workflow:**
Service Centers → Create Request → Auto Email → Dashboard Update → Track Status

---

**🎉 Your complete service request system is ready!**

**Start here**: http://localhost:7000/service-centers.html
