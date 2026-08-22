# 🚀 Quick Start Guide - Iconic Smart CRM

Get your CRM up and running in **under 5 minutes**!

## 📋 Prerequisites

- **Node.js** 14+ ([Download](https://nodejs.org/))
- **MongoDB** (Local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier)
- **Git** (Optional, for cloning)

---

## ⚡ Installation Methods

### Option 1: Automated Setup (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM.git
cd Iconic-Smart-CRM

# 2. Run the automated setup wizard
npm run setup
```

The setup wizard will:
- ✅ Check system requirements
- ✅ Create `.env` configuration file
- ✅ Install dependencies
- ✅ Create necessary directories
- ✅ Optionally seed demo data

### Option 2: Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM.git
cd Iconic-Smart-CRM

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with your configuration

# 4. Seed demo data (optional)
npm run seed
```

---

## 🎮 Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Test Server (In-Memory MongoDB)
```bash
npm run test-server
```

The server will start on `http://localhost:5000`

---

## 🔑 Demo Login Credentials

After seeding the database, use these accounts:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@charlieai.com | admin123 | Full system access |
| **Manager** | manager@charlieai.com | manager123 | Team management |
| **Sales** | sales@charlieai.com | sales123 | Sales features |
| **Support** | support@charlieai.com | support123 | Support tickets |
| **Customer** | customer@example.com | demo123 | Customer view |

---

## 📡 API Endpoints

### Health Check
```bash
GET http://localhost:5000/api/health
```

### Authentication
```bash
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login user
GET  /api/auth/profile     # Get user profile
```

### Orders
```bash
GET  /api/orders           # Get all orders
POST /api/orders           # Create order
GET  /api/orders/:id       # Get order by ID
PUT  /api/orders/:id       # Update order
```

### Other Modules
- **Services**: `/api/services`
- **Deliveries**: `/api/deliveries`
- **Marketing**: `/api/marketing`
- **Leads**: `/api/leads`
- **Opportunities**: `/api/opportunities`
- **Contacts**: `/api/contacts`
- **Invoices**: `/api/invoices`

---

## 🧪 Testing the API

### Using cURL
```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@charlieai.com","password":"admin123"}'

# Get orders (with JWT token)
curl http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman

1. Import the API collection (coming soon)
2. Set the base URL: `http://localhost:5000`
3. Use the login endpoint to get your JWT token
4. Add token to Authorization header for protected routes

---

## 🗄️ Database Management

### Seed/Reset Database
```bash
# Populate with demo data
npm run seed

# Reset database (clears and re-seeds)
npm run reset
```

### Database Content After Seeding
- ✅ **5 Users** (various roles)
- ✅ **5 Contacts** (business contacts)
- ✅ **5 Leads** (sales pipeline)
- ✅ **5 Opportunities** (deals)
- ✅ **5 Orders** (purchase history)
- ✅ **4 Service Requests** (support tickets)
- ✅ **3 Deliveries** (shipping info)
- ✅ **5 Marketing Assets** (campaigns)

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/iconic-crm

# Server Configuration
PORT=5000
NODE_ENV=development

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
```

---

## 🐳 Docker Deployment (Coming Soon)

```bash
# Build and run with Docker Compose
docker-compose up

# Access at http://localhost:5000
```

---

## 📁 Project Structure

```
Iconic-Smart-CRM/
├── models/              # Mongoose database models
│   ├── User.js
│   ├── Order.js
│   ├── Service.js
│   └── ...
├── routes/              # Express API routes
│   ├── auth.js
│   ├── orders.js
│   └── ...
├── middleware/          # Authentication middleware
├── pages/               # HTML frontend pages
├── public/              # Static assets
├── uploads/             # File uploads directory
├── server.js            # Main Express server
├── setup.js             # Automated setup script
├── seed.js              # Database seeding script
├── .env                 # Environment configuration
└── package.json         # NPM dependencies
```

---

## 🚨 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: 
- Start MongoDB: `mongod` or use MongoDB Atlas cloud database
- Update `MONGO_URI` in `.env` file

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**:
- Change port in `.env`: `PORT=5001`
- Or kill the process using port 5000

### Missing Dependencies
```
Error: Cannot find module 'express'
```
**Solution**:
```bash
npm install
```

### JWT Authentication Error
```
Error: Invalid token
```
**Solution**:
- Login again to get a fresh token
- Check `JWT_SECRET` is set in `.env`

---

## 📚 Next Steps

1. **Explore the API**: Test all endpoints with Postman
2. **Customize Models**: Modify schemas in `models/` directory
3. **Add Routes**: Create new endpoints in `routes/` directory
4. **Build Frontend**: Integrate with React/Vue/Angular
5. **Deploy**: Host on Heroku, AWS, or DigitalOcean

---

## 🆘 Support

- **Documentation**: [README.md](./README.md)
- **Issues**: [GitHub Issues](https://github.com/mayurprabhune13-jpg/Iconic-Smart-CRM/issues)
- **Email**: support@charlieai.com

---

## 📄 License

ISC License - See [LICENSE](./LICENSE) file for details

---

<div align="center">
  <strong>🌟 Happy CRM Building! 🌟</strong>
  <br><br>
  <sub>Built with ❤️ using Node.js, Express, and MongoDB</sub>
</div>
