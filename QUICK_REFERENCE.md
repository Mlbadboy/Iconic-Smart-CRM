# Iconic Smart CRM - Quick Reference Guide

## 🚀 Quick Start

```bash
# Setup
npm run setup          # Interactive setup wizard
npm run seed           # Seed demo data

# Run
npm start              # Production server (port 7000)
npm run dev            # Development with hot-reload

# Docker
docker-compose up -d   # Start all services
```

## 📁 Key Directories

| Directory | Purpose |
|-----------|---------|
| `routes/` | API endpoints (24 route files) |
| `models/` | Database schemas (22 model files) |
| `middleware/` | Auth, rate limiting, security |
| `client/src/` | React frontend application |
| `public/` | Static HTML pages (legacy) |
| `uploads/` | File uploads (invoices, assets) |

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - Login (returns JWT)
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Current user

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update status

### Products
- `GET /api/products` - List products
- `GET /api/products/fetch-from-website` - Scrape products
- `POST /api/products` - Create product
- `POST /api/products/bulk-import` - Bulk import

### Service Requests
- `GET /api/service-requests` - List requests
- `POST /api/service-requests` - Create request
- `PATCH /api/service-requests/:id/status` - Update status

### Dashboard
- `GET /api/dashboard/stats` - Statistics
- `GET /api/dashboard/sales` - Sales data

## 🗄️ Database Models

| Model | Key Fields | Purpose |
|-------|------------|---------|
| **User** | email, password, role | User accounts |
| **Order** | orderNumber, items, amount, status | Sales orders |
| **Product** | sku, name, price, category | Product catalog |
| **ServiceRequest** | serviceId, status, priority | Service tickets |
| **Retailer** | retailerName, gstNumber, orderHistory | B2B customers |

## 🔐 Authentication

**JWT Token**: Stored in `Authorization: Bearer <token>` header

**Roles**:
- `admin` - Full access
- `manager` - Team management
- `user` - Standard user
- `sales` - Sales features
- `field-executive` - Field operations

## 📊 Order Status Flow

```
pending → confirmed → processing → ready-to-ship → 
dispatched → shipped → delivered → completed
```

## 🛠️ Tech Stack

**Backend**: Node.js + Express + MongoDB  
**Frontend**: React + Vite + Tailwind CSS  
**Auth**: JWT + bcrypt  
**Deployment**: Docker + Docker Compose

## 🔧 Environment Variables

```env
MONGO_URI=mongodb://localhost:27017/iconic-crm
PORT=7000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## 📝 Common Tasks

### Create Order
```javascript
POST /api/orders
{
  "retailerId": "...",
  "items": [{ "name": "...", "quantity": 1, "price": 100 }],
  "gstRate": 18
}
```

### Fetch Products
```javascript
GET /api/products/fetch-from-website
// Returns scraped products from iconicsmart.in
```

### Create Service Request
```javascript
POST /api/service-requests
{
  "serviceType": "repair",
  "productType": "LED TV",
  "serialNumber": "SN123456",
  "description": "..."
}
```

## 🎯 Key Features

✅ Order management with GST calculation  
✅ Product catalog with web scraping  
✅ Service request tracking  
✅ Retailer management  
✅ Dashboard analytics  
✅ Role-based access control  
✅ Rate limiting  
✅ Docker support  

## 📞 Demo Login

- **Admin**: admin@charlieai.com / admin123
- **Manager**: manager@charlieai.com / manager123
- **Sales**: sales@charlieai.com / sales123

## 🔍 File Locations

| Feature | Backend | Frontend |
|---------|---------|----------|
| Auth | `routes/auth.js` | `pages/Login.jsx` |
| Orders | `routes/orders.js` | `pages/Orders.jsx` |
| Products | `routes/products.js` | `pages/Products.jsx` |
| Dashboard | `routes/dashboard.js` | `pages/Dashboard.jsx` |
| Services | `routes/serviceRequests.js` | `pages/ServiceRequests.jsx` |

## 🚨 Important Notes

- Server runs on port **7000** (not 5000)
- Frontend API URL: `http://localhost:7000/api`
- JWT token stored in `localStorage` as `authToken`
- Security headers currently disabled for HTML compatibility
- Email notifications are placeholders

## 📚 Documentation

- `PROJECT_COMPREHENSIVE_SUMMARY.md` - Full project analysis
- `README.md` - Main documentation
- `QUICKSTART.md` - Setup guide
- `DEPLOYMENT.md` - Deployment instructions

