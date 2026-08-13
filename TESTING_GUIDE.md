# 🧪 Testing Guide

## Quick Start Testing

### Step 1: Start the Server

**Terminal 1 - Start Server:**
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:7000
📱 Access the CRM at: http://localhost:7000
🔐 Login page: http://localhost:7000/login.html
🔌 Socket.IO ready for real-time notifications
```

### Step 2: Run Tests

**Terminal 2 - Run Tests:**

**Quick Login Test:**
```bash
npm run test-login
```

**Full Feature Test:**
```bash
npm test
```

## Test Results Interpretation

### ✅ Green (Passed)
- Feature is working correctly
- No action needed

### ❌ Red (Failed)
- Feature has an issue
- Check error message for details
- Review server logs in `logs/` directory

### ⚠️ Yellow (Warning)
- Feature may work but needs configuration
- Example: Email not configured (will log instead of sending)

## Common Issues

### Issue: "Cannot connect to server"
**Solution:** Make sure server is running on port 7000
```bash
npm start
```

### Issue: "Login failed"
**Solution:** 
1. Check if database is seeded: `npm run seed`
2. Verify credentials: admin@iconic-crm.com / admin123
3. Check server logs for errors

### Issue: "Email service not configured"
**Solution:** Add to `.env` file:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Issue: "Security headers blocking"
**Solution:** Security headers are configured to be permissive. If login still fails:
1. Check `middleware/security.js`
2. Verify CSP allows form submissions
3. Check browser console for CSP errors

## Manual Testing Checklist

### 1. Login Test
- [ ] Open http://localhost:7000/login.html
- [ ] Login with admin@iconic-crm.com / admin123
- [ ] Should redirect to dashboard

### 2. API Test
- [ ] Open http://localhost:7000/api/health
- [ ] Should return `{"status":"OK"}`

### 3. Logging Test
- [ ] Check `logs/combined.log` exists
- [ ] Check `logs/error.log` exists
- [ ] Verify logs are being written

### 4. Email Test
- [ ] Create an order
- [ ] Check server console for email logs
- [ ] If configured, check email inbox

### 5. WebSocket Test
- [ ] Check server console for "Socket.IO ready"
- [ ] Client should connect (if frontend is running)

## Test Scripts

### test-login-only.js
Quick test to verify:
- Server is running
- Login works
- Security headers don't break login
- Protected routes work

### test-all-features.js
Comprehensive test covering:
- All API endpoints
- Email notifications
- File uploads
- Logging system
- WebSocket support
- Analytics

## Next Steps After Testing

1. **If all tests pass:** ✅ Ready for production!
2. **If tests fail:** Check error messages and fix issues
3. **If warnings appear:** Configure missing services (email, etc.)

## Need Help?

- Check `logs/error.log` for detailed errors
- Review `IMPLEMENTATION_COMPLETE.md` for feature documentation
- Check server console output for runtime errors

