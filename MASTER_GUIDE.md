# 🚀 Charlie's CRM — Enterprise Master Guide

> **The Definitive Architecture, Installation, Administration & API Reference Guide**  
> **Platform Version**: 2.5.0 Enterprise Multi-Tenant  
> **Production URL**: [https://www.charlieai.in/](https://www.charlieai.in/)  
> **Default Domain**: `charlieai.in`  

---

## 📑 Table of Contents

1. [Executive Overview & 3-Layer Authorization](#1-executive-overview--3-layer-authorization)
2. [Quick Start & Local Setup](#2-quick-start--local-setup)
3. [Default Credentials & Authentication](#3-default-credentials--authentication)
4. [Super Admin Tenant Control Center](#4-super-admin-tenant-control-center)
5. [Company Admin Role, Department & User Management](#5-company-admin-role-department--user-management)
6. [18 Core CRM Modules](#6-18-core-crm-modules)
7. [API Access & External Integration](#7-api-access--external-integration)
8. [Cross-Platform Flutter Client](#8-cross-platform-flutter-client)
9. [Automated Verification & Test Suites](#9-automated-verification--test-suites)
10. [Production Deployment Guide](#10-production-deployment-guide)

---

## 1. Executive Overview & 3-Layer Authorization

Charlie's CRM is a full-featured, multi-tenant SaaS CRM built for high-scale enterprise operations. It enforces an airtight **3-Layer Authorization Hierarchy**:

```text
                         CHARLIE'S CRM PLATFORM
                                    │
                              SUPER ADMIN
                (Controls WHAT FEATURES a company owns)
                                    │
                          Company / Tenant Workspace
                                    │
                             COMPANY ADMIN
                (Controls WHO inside the company uses features)
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
        Department             Custom Roles            Team Users
     (Sales, Service,       (Feature-constrained   (Role, Department,
     Logistics, etc.)        permissions)           Scope, Lockout)
```

$$\text{Final Access} = \text{Feature Entitled} \land \text{Permission Granted} \land \text{Data Scope Allows} \land \text{Business Rule Allows}$$

---

## 2. Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0+ (Local, Docker, or Atlas)
- **Git** & **npm**

### 1-Minute Launch
```bash
# 1. Clone repository & install dependencies
git clone https://github.com/your-org/charlies-crm.git
cd charlies-crm
npm install

# 2. Configure Environment (.env)
cp .env.example .env

# 3. Seed Default Tenants, Super Admin & Demo Data
npm run seed
# Or quick seed:
node quick-seed.js

# 4. Start Server
npm start
# Server listens on http://localhost:7000
```

---

## 3. Default Credentials & Authentication

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Super Admin** | `superadmin@charlieai.com` | `Admin@123456` | Platform Console (`/super-admin.html`, `/tenant-control.html`) |
| **Company Admin** | `admin@charlieai.com` | `admin123` | Company Workspace (`/dashboard.html`, `/organization.html`, `/roles.html`) |
| **Sales Manager** | `sales@charlieai.com` | `sales123` | Sales, Leads, Pipeline (`/leads.html`, `/orders.html`) |
| **Service Agent** | `service@charlieai.com` | `service123` | Customer Support & Tickets (`/services.html`) |

> **🔒 5-Strike Login Lockout**: 5 consecutive failed login attempts lock the account (`HTTP 423 ACCOUNT_LOCKED`). Company Admins can unlock their own users via the User Management modal, and Super Admins can unlock any tenant user.

---

## 4. Super Admin Tenant Control Center

Accessible at `/super-admin.html` and `/tenant-control.html`:

- **Feature Entitlements**: Toggle any of the 18 platform modules on or off per company with instant runtime propagation.
- **Subscription Lifecycle**: Manage plan tiers (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`, `CUSTOM`), expiration dates, and grace periods.
- **Suspension / Reactivation**: Instantly suspend tenant workspaces; suspended tenants are redirected to `/tenant-suspended.html` with all API access blocked.
- **Storage Limits**: Monitor and set per-tenant file/database storage thresholds.
- **Platform Announcements**: Broadcast system-wide maintenance banners or targeted plan announcements.

---

## 5. Company Admin Role, Department & User Management

### Department Management (`/organization.html`)
- Group users into tenant departments (e.g. Sales, Service, Logistics, Finance).
- Dynamic member counts, head of department tracking, and deletion protection for active departments.

### Role Builder (`/roles.html`)
- **Strict Commercial Boundary**: Company Admins cannot grant permissions for features disabled in their company's plan.
- **Visual Clarity**: Clear demarcation between *Company Feature: Enabled / Disabled* and *Role Permissions*.
- **Role Templates**: Pre-configured role templates dynamically strip out disabled permissions.

### User Provisioning (`/manage-users.html`)
- Assign Department, Role, Reporting Manager, and Data Scope (`ALL`, `REGION`, `TERRITORY`, `DISTRIBUTOR`, `DEALER`, `RETAILER`, `SELF`).
- Soft-deactivation (`isActive: false`, `status: DISABLED`) preserves historical records.

---

## 6. 18 Core CRM Modules

| Module | Route / Page | Permissions | Description |
|---|---|---|---|
| **Dashboard** | `/dashboard.html` | `dashboard.view` | Real-time analytics, revenue metrics & module cards |
| **Sales** | `/leads.html` | `lead.view`, `lead.create`, `lead.assign` | Lead tracking, stages & conversions |
| **Customers** | `/public/organization.html` | `customer.view`, `customer.create` | Retailer, dealer, and customer directory |
| **Orders** | `/orders.html`, `/view-orders.html` | `order.view`, `order.create`, `order.approve` | Order lifecycle, invoicing & tracking |
| **Products** | `/manage-products.html` | `product.view`, `product.create` | SKU management, pricing & inventory links |
| **Inventory** | `/inventory.html` | `inventory.view`, `inventory.transfer` | Stock levels, warehouse transfers & adjustments |
| **Distribution** | `/distribution.html` | `distribution.view`, `distribution.manage` | Dealer-distributor hierarchy networks |
| **Serial Validation** | `/serial-validation.html` | `serial_validation.validate` | Real-time serial authentication & fraud check |
| **QR Verification** | `/qr-verification.html` | `qr.scan`, `qr.verify` | Instant QR code authentication |
| **Service & Support** | `/services.html` | `service.view`, `service.create`, `service.resolve` | Service ticket dispatching & resolution |
| **Warranty** | `/warranty.html` | `warranty.view`, `warranty.claim` | Warranty registration, claims & verification |
| **Marketing** | `/marketing.html` | `marketing.view`, `marketing.campaign` | Promotional assets & campaign tracking |
| **Finance** | `/finance.html` | `finance.view`, `finance.approve` | Invoicing, payments & tax breakdowns |
| **Field Force** | `/field-force.html` | `field_force.view`, `field_force.track` | GPS beat tracking, check-ins & visits |
| **Logistics** | `/deliveries.html` | `delivery.view`, `dispatch.create` | Dispatch slips, couriers & deliveries |
| **Reports** | `/reports.html` | `report.view`, `report.export` | Multi-format CSV/PDF operational reports |
| **API Access** | `/api-access.html` | `api_access.manage` | Self-serve partner API keys & usage limits |
| **Analytics** | `/platform-analytics.html` | `analytics.view` | Platform & tenant performance dashboards |

---

## 7. API Access & External Integration

External partners (Salesforce, SAP, Postman, IoT devices) can authenticate with tenant API keys:

```bash
# Validate Product Serial Number via REST API
curl -X POST http://localhost:7000/api/v1/external/serials/validate \
  -H "X-API-Key: crm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber": "SR1234567890",
    "dealerCode": "DLR-WEST-01"
  }'
```

### Response Format
```json
{
  "valid": true,
  "verified": true,
  "canProceed": true,
  "resultCode": "VALID_ACTIVE",
  "product": {
    "model": "LED Smart TV 55",
    "warrantyMonths": 24
  },
  "timestamp": "2026-08-18T16:50:00.000Z"
}
```

---

## 8. Cross-Platform Flutter Client

Located in `flutter_app/`:
- Supports **Android**, **iOS**, **Web**, **macOS**, and **Windows**.
- Automatic session caching, token persistence, and offline fallback.
- Run locally:
  ```bash
  cd flutter_app
  flutter pub get
  flutter run -d chrome
  ```

---

## 9. Automated Verification & Test Suites

Run the full automated test suite containing 15 test suites and 250+ assertions:

```bash
npm test
```

### Test Coverage Summary:
- ✅ **Tenant Control & Suspension** (`scratch/test-tenant-control.js`)
- ✅ **18-Feature Coverage & Feature Gates** (`scratch/test-feature-coverage.js`)
- ✅ **Company Admin RBAC & Account Lockout** (`scratch/test-company-admin-rbac.js`)
- ✅ **End-to-End Acceptance Lifecycle** (`scratch/test-browser-acceptance-sequence.js`)
- ✅ **DOM Feature Guard & Real-Time Sync** (`scratch/test-dom-feature-guard.js`)
- ✅ **API Key Validation & Quotas** (`scratch/test-simplified-api-access.js`)

---

## 10. Production Deployment Guide

### Deployment Options:
1. **Docker Compose**:
   ```bash
   docker-compose up -d --build
   ```
2. **Railway / Render**:
   - Set environment variables (`MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=7000`).
   - Connect GitHub repository and deploy.
3. **Custom Domain**:
   - Point your DNS CNAME / A record to `charlieai.com`.
   - SSL is automatically handled via Let's Encrypt / Cloudflare.

---

*Charlie's CRM — Enterprise Multi-Tenant Customer Relationship & Operations Management Platform.*
