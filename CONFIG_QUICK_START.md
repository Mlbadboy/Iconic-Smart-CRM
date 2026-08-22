# ⚙️ Configuration Quick Start

## 🚀 Access Configuration Page

**URL**: `http://localhost:7000/config.html`

**Requirements**:
- ✅ Must be logged in
- ✅ Must have **admin** role

## 📧 Quick Email Setup

### Step 1: Open Configuration Page
1. Login as admin: `admin@charlieai.com` / `admin123`
2. Navigate to: `http://localhost:7000/config.html`

### Step 2: Configure Email (Gmail Example)
1. **SMTP Host**: `smtp.gmail.com`
2. **SMTP Port**: `587`
3. **Email Address**: Your Gmail address
4. **App Password**: Generate from [Google App Passwords](https://myaccount.google.com/apppasswords)

### Step 3: Test & Save
1. Click **"Test Email Connection"** to verify
2. Click **"Save Email Configuration"**
3. **Restart server**: `npm start`

## 🌐 Quick DNS Setup

1. **Domain Name**: `iconicsmart.co.in`
2. **Frontend URL**: `https://www.iconicsmart.co.in`
3. **API URL**: `https://api.iconicsmart.co.in` (or your API URL)
4. **CORS Origins**: `https://www.iconicsmart.co.in,https://iconicsmart.co.in`
5. Click **"Save DNS Configuration"**
6. **Restart server**

## ✅ Features

- ✅ **Easy-to-use interface**
- ✅ **Test email before saving**
- ✅ **View current configuration**
- ✅ **Auto-load existing settings**
- ✅ **Secure (admin only)**
- ✅ **Saves to .env file**

## 📝 What Gets Saved

Configuration is saved to `.env` file:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
DOMAIN_NAME=iconicsmart.co.in
FRONTEND_URL=https://www.iconicsmart.co.in
```

## 🔄 After Configuration

**Important**: Restart the server after saving:
```bash
npm start
```

---

**Access**: `http://localhost:7000/config.html`  
**Role Required**: Admin

