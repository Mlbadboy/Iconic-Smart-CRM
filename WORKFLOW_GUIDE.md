# 🔄 Iconic Smart CRM - Comprehensive Architecture & Workflow Guide

**Last Updated**: August 16, 2026  
**Version**: 2.0 (Production Release)  
**Live Application URL**: [https://iconicsmartcrm.up.railway.app](https://iconicsmartcrm.up.railway.app)  
**API Health Check**: [https://iconicsmartcrm.up.railway.app/api/health](https://iconicsmartcrm.up.railway.app/api/health)  

---

## 📊 1. System Overview & Key Purpose

**Iconic Smart CRM** is an enterprise-grade Customer Relationship Management system designed to manage the end-to-end customer lifecycle, order fulfillment, post-sales service ticketing, SLA management, and serial number inventory verification.

### 🌟 Key Core Capabilities
1. **Master Serial Number Registry & Verification Service**: Serves as the central source of truth for customer/dealer registered serial numbers, eliminating direct external calls to manufacturer ERPs.
2. **External Integration API**: Exposes secured partner REST endpoints using hashed API Keys (`X-API-Key`).
3. **Role-Based Access Control (RBAC)**: Fine-grained permission model for 5 user roles (`admin`, `manager`, `sales`, `support`, `customer`).
4. **SLA & Escalation Engine**: Automated tracking of response/resolution times with real-time escalation triggers.
5. **Approval Workflow Engine**: Multi-tier request approval system for discounts, refunds, and special overrides.
6. **Customer 360 & Manager Dashboard**: Unified view of customer purchase history, service tickets, and key performance indicators.

---

## 🔑 2. Live Production Demo Credentials

The database auto-seeds default accounts upon initial deployment. You can log in at `https://iconicsmartcrm.up.railway.app` using any of the following credentials:

| Role | Email | Password | Primary Permissions & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@charlieai.com` | `admin123` | Full system access, API Key management, user roles, system config |
| **Manager** | `manager@charlieai.com` | `manager123` | Approvals management, SLA performance analytics, team oversight |
| **Sales** | `sales@charlieai.com` | `sales123` | Leads management, Opportunities pipeline, Order placement |
| **Support** | `support@charlieai.com` | `support123` | Service ticket resolution, Serial validation verification |
| **Customer** | `customer@example.com` | `demo123` | Own order tracking, service ticket submission, profile management |

---

## 🛡️ 3. Serial Number Validation Module (Source of Truth)

### 🎯 Architecture & Purpose
Instead of external applications querying manufacturer APIs directly, **Iconic Smart CRM acts as the Master Registry**. 

```text
                    YOUR ICONIC SMART CRM
                         │
          Upload / Import Serial Master Data (CSV)
                         │
                         ▼
              ┌─────────────────────┐
              │   Serial Registry   │
              │   (Master DB)       │
              └──────────┬──────────┘
                         │
      ┌──────────────────┴──────────────────┐
      │                                     │
      ▼                                     ▼
 CRM Web App                           External Apps
 (Internal Staff)                   (Third-Party Partners)
 POST /api/serial-validation/validate  POST /api/v1/serial-validation/validate
 (Bearer JWT Token)                    (X-API-Key Header)
```

### 🔍 Verification Matching Criteria
Validation requires 3 parameters:
1. `materialCode` (e.g., `MAT-569553`)
2. `serialNumber` (e.g., `SN-771740`)
3. `dealerCode` (e.g., `DLR-548968`)

### 🚦 Response Codes & Status Mapping Matrix

| Status Code | Status String | Meaning / Action | `verified` | `canProceed` |
| :---: | :--- | :--- | :---: | :---: |
| **0** | `VALID` | Serial, Material, and Dealer match active registry record. | `true` | `true` |
| **1** | `INVALID` | Serial format or registration is invalid. | `false` | `false` |
| **2** | `UNREGISTERED` | Serial number is valid format but not found in CRM registry. | `false` | `false` |
| **3** | `EXPIRED` | Serial warranty or activation period has expired. | `false` | `false` |
| **4** | `DEALER_MISMATCH` | Serial exists but dealer code does not match registered dealer. | `false` | `false` |
| **5** | `MATERIAL_MISMATCH`| Serial exists but material code does not match registered model. | `false` | `false` |

---

## 🔌 4. Partner API Key Integration Layer

External partner applications consume the CRM Serial Verification service via secured API keys.

### 🔐 API Key Security
* Keys are generated with prefixes (e.g., `crm_live_...`).
* Only hashed versions (`SHA-256`) are stored in MongoDB.
* Masked keys (e.g., `crm_live_...a8f2`) are displayed in management screens.
* Rate limits are applied per API key (default: 100 requests per minute).

### 📡 External Validation API Endpoint
```http
POST /api/v1/serial-validation/validate HTTP/1.1
Host: iconicsmartcrm.up.railway.app
Content-Type: application/json
X-API-Key: crm_live_9a87f6e5d4c3b2a1...

{
  "materialCode": "MAT-569553",
  "serialNumber": "SN-771740",
  "dealerCode": "DLR-548968"
}
```

#### Sample Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "success": true,
    "verified": true,
    "canProceed": true,
    "statusCode": "0",
    "status": "VALID",
    "message": "Serial number validated successfully",
    "details": {
      "materialCode": "MAT-569553",
      "serialNumber": "SN-771740",
      "dealerCode": "DLR-548968",
      "warrantyMonths": 24
    }
  }
}
```

---

## 🔄 5. End-to-End User Workflows

### 🛠️ Workflow A: Admin Bulk Data Import & API Key Provisioning
1. **Login**: Admin logs in at `/login.html` with `admin@charlieai.com`.
2. **Import Serial Master Data**:
   - Navigates to `/serial-validation`.
   - Uploads or pastes CSV data formatted as:
     `materialCode,serialNumber,dealerCode,warrantyMonths`
   - System upserts records into `SerialRegistry`.
3. **Provision Partner API Key**:
   - Navigates to `/api-keys`.
   - Clicks **Create Key**, enters Client Name (e.g., `QERP Verification Service`).
   - Copies generated API Key and provides it to partner integration team.

### 💼 Workflow B: Sales Pipeline to Order Fulfillment
1. **Lead Creation**: Sales Rep receives lead inquiry and logs it via `POST /api/leads`.
2. **Qualification & Opportunity**: Lead status changes to `qualified`, creating an Opportunity via `POST /api/opportunities`.
3. **Closing Deal**: Opportunity stage updated to `closed-won`.
4. **Order Placement**: Order created via `POST /api/orders`.
5. **Delivery Dispatch**: System updates order to `shipped` and creates a tracking record via `POST /api/deliveries`.

### 🎫 Workflow C: Support Service Ticketing & SLA Tracking
1. **Ticket Creation**: Customer or Support Agent creates ticket via `POST /api/services`.
2. **SLA Timer Initialized**: System attaches an SLA timer with response threshold (e.g., 2 hours).
3. **Agent Assignment**: Support Manager assigns ticket to agent.
4. **Resolution & Verification**:
   - Agent validates serial number using Serial Validation route.
   - Ticket marked `resolved` and closed.

---

## 🏗️ 6. System Architecture & Tech Stack

```text
┌─────────────────────────────────────────────────────────────┐
│                 REACT SPA (Vite / Tailwind CSS)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST / WebSocket
┌──────────────────────────────▼──────────────────────────────┐
│                  EXPRESS.JS NODE SERVER                      │
│ ┌───────────────────┬───────────────────┬─────────────────┐ │
│ │ Auth & RBAC       │ Serial Engine     │ API Key Auth    │ │
│ ├───────────────────┼───────────────────┼─────────────────┤ │
│ │ Orders & Services │ SLA Engine        │ Webhooks        │ │
│ └───────────────────┴───────────────────┴─────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM
┌──────────────────────────────▼──────────────────────────────┐
│                    MONGODB DATABASE                         │
│ (User, Order, Service, SerialRegistry, ApiKey, Task, etc.)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 7. Development & Deployment Reference

### Local Setup
```bash
# Install root and client dependencies
npm install
npm run install-client

# Seed database with initial data
npm run seed

# Run local development server (Backend: 7000, Frontend: 5173)
npm run dev
```

### Docker & Railway Production Build
The project uses a multi-stage `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY client/package*.json ./client/
RUN cd client && npm install --legacy-peer-deps
COPY client ./client
RUN cd client && npm run build
COPY . .
EXPOSE 7000
CMD ["node", "server.js"]
```

---

**🎉 Iconic Smart CRM is fully documented, tested, and operational in production!**
