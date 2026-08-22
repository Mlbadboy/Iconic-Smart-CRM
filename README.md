<div align="center">

# 🚀 Iconic Smart CRM

### Production-Ready CRM System | Plug & Play | Enterprise Features

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)
[![Deploy to Heroku](https://img.shields.io/badge/Deploy-Heroku-purple.svg)](https://heroku.com/deploy?template=https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM)

**[Quick Start](#-quick-start)** • **[Features](#-features)** • **[Documentation](#-documentation)** • **[Deploy](#-deployment)** • **[API Docs](#-api-reference)**

</div>

---

## 📖 Overview

**Iconic Smart CRM** is a full-stack Customer Relationship Management system built with modern technologies. Get your CRM running in **under 5 minutes** with our automated setup, Docker support, and one-click cloud deployment.

### Why Choose Iconic Smart CRM?

✅ **Plug & Play** - Automated setup wizard with zero configuration  
✅ **Production Ready** - Enterprise-grade security and performance  
✅ **Docker Support** - Containerized deployment with docker-compose  
✅ **Cloud Ready** - One-click deploy to Heroku, Railway, Render, and more  
✅ **Demo Data** - Pre-seeded with realistic sample data  
✅ **RESTful API** - Complete API documentation included  
✅ **Scalable** - Built for growth from day one  
✅ **Open Source** - MIT licensed, customize as needed  

---

## 🎯 Features

### Core CRM Modules

| Module | Features | API Endpoints |
|--------|----------|---------------|
| **👤 Users & Auth** | JWT authentication, role-based access, password encryption | `/api/auth/*` |
| **📦 Orders** | Order management, status tracking, payment processing | `/api/orders/*` |
| **🎫 Service Requests** | Support ticket system, assignment, status updates | `/api/services/*` |
| **🚚 Deliveries** | Shipment tracking, courier integration, ETA management | `/api/deliveries/*` |
| **📢 Marketing** | Campaign management, asset library, email templates | `/api/marketing/*` |
| **🎯 Leads** | Lead capture, scoring, conversion tracking | `/api/leads/*` |
| **💼 Opportunities** | Sales pipeline, deal tracking, forecasting | `/api/opportunities/*` |
| **📇 Contacts** | Contact management, company profiles, history | `/api/contacts/*` |
| **🧾 Invoices** | PDF generation, invoice tracking, email delivery | `/api/invoices/*` |

### Technical Features

- 🔐 **Security**: JWT authentication, bcrypt encryption, rate limiting
- 📊 **Database**: MongoDB with Mongoose ODM, indexes optimized
- 📄 **File Handling**: Multer for uploads, PDFKit for invoice generation
- 📧 **Email**: Nodemailer integration for notifications
- 🐳 **Docker**: Multi-container setup with docker-compose
- 🔄 **CI/CD**: GitHub Actions workflows included
- 📱 **API**: RESTful design, Android/iOS compatible
- 🛡️ **Error Handling**: Comprehensive error middleware

---

## ⚡ Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM.git
cd Iconic-Smart-CRM

# Run automated setup wizard
npm run setup

# The wizard will:
# ✓ Check system requirements
# ✓ Create .env configuration
# ✓ Install dependencies
# ✓ Create directories
# ✓ Seed demo data
```

### Option 2: Docker (Zero Configuration)

```bash
# Clone and start
git clone https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM.git
cd Iconic-Smart-CRM

# Run with Docker Compose
docker-compose up -d

# Access at http://localhost:5000
```

### Option 3: Manual Setup

```bash
# 1. Clone repository
git clone https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM.git
cd Iconic-Smart-CRM

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 4. Seed database (optional)
npm run seed

# 5. Start server
npm start          # Production
npm run dev        # Development (with hot-reload)
```

---

## 🔑 Demo Login Credentials

After running `npm run seed`, use these accounts:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | admin@charlieai.com | admin123 | Full access |
| **Manager** | manager@charlieai.com | manager123 | Team management |
| **Sales** | sales@charlieai.com | sales123 | Sales features |
| **Support** | support@charlieai.com | support123 | Support tickets |
| **Customer** | customer@example.com | demo123 | Customer view |

---

## 🚀 Deployment

### One-Click Deploy

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM)

### Supported Platforms

- **Heroku** - [Guide](DEPLOYMENT.md#1-heroku-recommended-for-beginners)
- **Railway** - [Guide](DEPLOYMENT.md#2-railway-fastest-deployment)
- **Render** - [Guide](DEPLOYMENT.md#3-render-free-tier-available)
- **DigitalOcean** - [Guide](DEPLOYMENT.md#4-digitalocean-app-platform)
- **AWS** - [Guide](DEPLOYMENT.md#5-aws-advanced)
- **Google Cloud** - [Guide](DEPLOYMENT.md#6-google-cloud-platform)
- **Docker** - [Guide](DOCKER.md)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[QUICKSTART.md](QUICKSTART.md)** | 5-minute setup guide |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Cloud deployment guide |
| **[DOCKER.md](DOCKER.md)** | Docker & containerization |
| **[API.md](API.md)** | Complete API reference |
| **[TODO.md](TODO.md)** | Development roadmap |

---

## 🔌 API Reference

### Base URL
```
http://localhost:5000/api
```

### Authentication

All protected routes require JWT token in header:
```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Core Endpoints

#### Authentication
```bash
POST   /api/auth/register     # Register new user
POST   /api/auth/login        # Login user
GET    /api/auth/profile      # Get user profile
```

#### Orders
```bash
GET    /api/orders            # Get all orders
POST   /api/orders            # Create order
GET    /api/orders/:id        # Get order by ID
PUT    /api/orders/:id        # Update order
DELETE /api/orders/:id        # Delete order
```

#### Services
```bash
GET    /api/services          # Get all service requests
POST   /api/services          # Create service request
GET    /api/services/:id      # Get service by ID
PUT    /api/services/:id      # Update service
```

#### Other Modules
- **Deliveries**: `/api/deliveries/*`
- **Marketing**: `/api/marketing/*`
- **Leads**: `/api/leads/*`
- **Opportunities**: `/api/opportunities/*`
- **Contacts**: `/api/contacts/*`
- **Invoices**: `/api/invoices/*`

### Example Request

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@charlieai.com","password":"admin123"}'

# Get orders (with token)
curl http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 5.x
- **Database**: MongoDB 8.x with Mongoose
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **File Upload**: Multer
- **PDF Generation**: PDFKit
- **Email**: Nodemailer

### DevOps
- **Containerization**: Docker + Docker Compose
- **Process Manager**: Nodemon (dev)
- **Testing**: MongoDB Memory Server
- **CI/CD**: GitHub Actions

---

## 📁 Project Structure

```
Iconic-Smart-CRM/
├── models/              # Mongoose schemas
│   ├── User.js
│   ├── Order.js
│   ├── Service.js
│   └── ...
├── routes/              # Express routes
│   ├── auth.js
│   ├── orders.js
│   └── ...
├── middleware/          # Custom middleware
│   └── auth.js
├── pages/               # Frontend HTML pages
├── uploads/             # File uploads
│   ├── invoices/
│   └── assets/
├── server.js            # Main server file
├── setup.js             # Automated setup script
├── seed.js              # Database seeding
├── docker-compose.yml   # Docker configuration
├── Dockerfile           # Production Docker image
├── .env.example         # Environment template
└── package.json         # Dependencies
```

---

## 🧪 Development

### Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start with hot-reload
npm run setup          # Run setup wizard
npm run seed           # Seed demo data
npm run reset          # Reset database
npm run test-server    # In-memory test server
```

### Database Commands

```bash
# Seed database with demo data
npm run seed

# Reset database (clear and re-seed)
npm run reset
```

### Docker Commands

```bash
# Development mode (hot-reload)
docker-compose -f docker-compose.dev.yml up

# Production mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 🔒 Environment Variables

Create a `.env` file (see `.env.example`):

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/iconic-crm

# Server
PORT=5000
NODE_ENV=development

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Start MongoDB locally
mongod

# Or use MongoDB Atlas (free tier)
# Update MONGO_URI in .env
```

### Port Already in Use
```bash
# Change port in .env
PORT=5001
```

### Missing Dependencies
```bash
npm install
```

See [QUICKSTART.md](QUICKSTART.md#-troubleshooting) for more solutions.

---

## 📄 License

ISC License - See [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Documentation**: [Guides](QUICKSTART.md)
- **Issues**: [GitHub Issues](https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM/discussions)

---

## 🙏 Acknowledgments

- Built with [Node.js](https://nodejs.org/)
- Database by [MongoDB](https://www.mongodb.com/)
- Framework by [Express](https://expressjs.com/)

---

<div align="center">

### ⭐ Star this repo if you find it useful!

**Made with ❤️ by the Iconic Smart CRM Team**

[⬆ Back to Top](#-iconic-smart-crm)

</div>
