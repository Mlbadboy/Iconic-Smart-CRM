# ⚙️ Charlie's CRM — Configuration & User Credentials Guide

---

## 🔐 Default User Login Credentials

| Role | Email Address | Password | Permissions & Access Scope |
|---|---|---|---|
| **Super Administrator** | `superadmin@charlieai.com`<br>`superadmin@charlieai.in` | `Admin@123456` | **Global Platform Control**: Multi-tenant provisioning, commercial feature entitlements, marketing master, global analytics, system health. |
| **Company Administrator** | `admin@charlieai.com`<br>`admin@charlieai.in` | `admin123` | **Company Management**: Full tenant control, user creation, custom roles, departments, marketing campaigns, CRM, orders, billing. |
| **Sales Manager** | `sales@charlieai.com`<br>`sales@charlieai.in` | `sales123` | **Sales Pipeline**: Leads, Opportunities, Deals, Quotes, Customer Orders, Sales Reports. |
| **Service Agent** | `service@charlieai.com`<br>`service@charlieai.in` | `service123` | **Service & Warranty**: Service Requests, Warranty Verifications, Product Repairs, Service Centers. |
| **Operations Manager** | `manager@charlieai.com` | `manager123` | **Operations & Logistics**: Unit Inventory, Serial Registry, Stock Transfers, Logistics Partners, Deliveries. |
| **Support Agent** | `support@charlieai.com` | `support123` | **Customer Support**: Ticket Resolution, Customer Inquiries, Escalations. |
| **Demo Customer** | `customer@example.com` | `demo123` | **Customer Portal**: My Registered Products, Warranty Status, Service Bookings. |

---

## 🚀 Quick Access URLs

### Production
* **Main Application**: `https://crm.charlieai.in/`
* **Login Portal**: `https://crm.charlieai.in/login.html`
* **Super Admin Portal**: `https://crm.charlieai.in/super-admin.html`
* **Marketing Command Center**: `https://crm.charlieai.in/marketing.html`
* **System Configuration**: `https://crm.charlieai.in/config.html`

### Local Development
* **Main Application**: `http://localhost:7000/`
* **Login Portal**: `http://localhost:7000/login.html`
* **Super Admin Portal**: `http://localhost:7000/super-admin.html`
* **System Configuration**: `http://localhost:7000/config.html`

---

## 📧 Email Service Configuration (SMTP)

### Step 1: Login & Navigate
1. Login as Administrator (`admin@charlieai.com` / `admin123` or `superadmin@charlieai.com` / `Admin@123456`)
2. Navigate to: `http://localhost:7000/config.html` (or `https://crm.charlieai.in/config.html`)

### Step 2: Configure SMTP Parameters
* **SMTP Host**: `smtp.gmail.com`
* **SMTP Port**: `587`
* **Email Address**: `your-company-email@gmail.com`
* **App Password**: 16-character password generated from [Google App Passwords](https://myaccount.google.com/apppasswords)

### Step 3: Test & Save
1. Click **"Test Email Connection"** to verify SMTP connectivity
2. Click **"Save Email Configuration"**
3. Restart server: `npm start`

---

## 🌐 Custom Domain & DNS Setup

1. **Domain Name**: `crm.charlieai.in` (or your custom domain)
2. **Frontend URL**: `https://crm.charlieai.in`
3. **API Base URL**: `https://crm.charlieai.in/api`
4. **CORS Origins**: `https://crm.charlieai.in,https://www.charlieai.in`
5. Click **"Save DNS Configuration"** and restart server

---

## 📝 Environment Variables Reference (`.env`)

```env
# Application
PORT=7000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_aes_256_encryption_key_32_chars

# Database
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/iconic-crm

# Support & System Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=info@bitbloom.in
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="Charlie's CRM <info@bitbloom.in>"

# Domains & CORS
DOMAIN_NAME=crm.charlieai.in
FRONTEND_URL=https://crm.charlieai.in
CORS_ORIGIN=https://crm.charlieai.in,https://www.charlieai.in
```

---

## 🔄 Applying Changes

After modifying configuration or running database seed:
```bash
# Seed default users and sample data
node seed.js

# Start server
npm start
```
