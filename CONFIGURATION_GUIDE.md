# ⚙️ Configuration Guide

## Easy Configuration Interface

A simple, user-friendly configuration page has been created to easily manage email and DNS settings.

## 📍 Access Configuration

**URL**: `http://localhost:7000/config.html`

**Requirements**:
- Must be logged in
- Must have admin role

## 🎯 Features

### 1. Email Configuration
- **SMTP Host**: Email server address (e.g., smtp.gmail.com)
- **SMTP Port**: Port number (587 for TLS, 465 for SSL)
- **Email Address**: Your email address
- **App Password**: App-specific password (not regular password)

**Features**:
- ✅ Save email settings
- ✅ Test email connection
- ✅ Send test email to verify configuration

### 2. DNS Configuration
- **Domain Name**: Your production domain
- **Frontend URL**: Frontend application URL
- **API URL**: Backend API URL
- **CORS Origins**: Comma-separated list of allowed origins

### 3. Current Configuration View
- View current settings
- Load existing configuration into forms
- See what's currently configured

## 📧 Email Setup (Gmail Example)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password

### Step 3: Configure in CRM
1. Open `http://localhost:7000/config.html`
2. Fill in:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **Email Address**: Your Gmail address
   - **App Password**: The generated app password
3. Click "Test Email Connection" to verify
4. Click "Save Email Configuration"

### Step 4: Restart Server
After saving, restart the server:
```bash
npm start
```

## 🌐 DNS Setup

### Configuration Fields

1. **Domain Name**: Your main domain (e.g., `iconicsmart.co.in`)
2. **Frontend URL**: Where your React app is hosted
3. **API URL**: Where your backend API is hosted
4. **CORS Origins**: Allowed origins for CORS (comma-separated)

### Example Configuration

```
Domain Name: iconicsmart.co.in
Frontend URL: https://www.iconicsmart.co.in
API URL: https://api.iconicsmart.co.in
CORS Origins: https://www.iconicsmart.co.in,https://iconicsmart.co.in
```

## 🔒 Security

- **Admin Only**: Only users with `admin` role can access configuration
- **Password Masking**: Passwords are masked in current config view
- **Secure Storage**: Configuration saved to `.env` file (not in database)

## 📝 API Endpoints

### Get Current Configuration
```
GET /api/config/current
Authorization: Bearer <token>
```

### Save Email Configuration
```
POST /api/config/email
Authorization: Bearer <token>
Content-Type: application/json

{
  "EMAIL_HOST": "smtp.gmail.com",
  "EMAIL_PORT": "587",
  "EMAIL_USER": "your-email@gmail.com",
  "EMAIL_PASSWORD": "your-app-password"
}
```

### Save DNS Configuration
```
POST /api/config/dns
Authorization: Bearer <token>
Content-Type: application/json

{
  "DOMAIN_NAME": "iconicsmart.co.in",
  "FRONTEND_URL": "https://www.iconicsmart.co.in",
  "API_URL": "https://api.iconicsmart.co.in",
  "CORS_ORIGINS": "https://www.iconicsmart.co.in,https://iconicsmart.co.in"
}
```

### Test Email Connection
```
POST /api/config/test-email
Authorization: Bearer <token>
Content-Type: application/json

{
  "EMAIL_HOST": "smtp.gmail.com",
  "EMAIL_PORT": "587",
  "EMAIL_USER": "your-email@gmail.com",
  "EMAIL_PASSWORD": "your-app-password"
}
```

## 🎨 User Interface

The configuration page features:
- ✅ Clean, modern design
- ✅ Color-coded sections
- ✅ Real-time validation
- ✅ Status messages
- ✅ Help text and instructions
- ✅ Test email functionality

## ⚠️ Important Notes

1. **Server Restart Required**: After saving configuration, restart the server for changes to take effect
2. **Admin Access Only**: Only admin users can access the configuration page
3. **Password Security**: App passwords are stored in `.env` file - keep it secure
4. **Backup .env**: Always backup your `.env` file before making changes

## 🔄 After Configuration

1. **Save Configuration**: Click save buttons
2. **Restart Server**: `npm start` or `npm run dev`
3. **Test Email**: Use "Test Email Connection" button
4. **Verify**: Check server logs for email service initialization

## 📞 Support

If you encounter issues:
1. Check server logs: `logs/combined.log`
2. Verify `.env` file was updated
3. Ensure server was restarted
4. Check email credentials are correct

---

**Access**: `http://localhost:7000/config.html`  
**Required Role**: Admin  
**File**: `public/config.html`

