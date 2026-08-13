# 📢 Marketing & Content Management System

## 🎉 Overview

Complete marketing and content management system with:
- 🎊 Indian Festival Calendar Content Requests
- 📤 Media Upload (Images & Videos for Android App)
- 👨‍💼 Content Manager Assignment
- 🔔 Automatic Notifications

---

## ✨ Features

### **1. Content Request Card** 🎊
- Request content based on Indian festival calendar
- 19 major festivals pre-loaded (Diwali, Holi, Christmas, etc.)
- Select festival, content type, and priority
- Auto-assigns to content manager
- Manager receives email notification

### **2. Upload Content Card** 📤
- Upload images and videos
- Drag & drop or click to upload
- Preview before upload
- Target specific audiences (All/Dealers/Customers)
- **Content automatically visible in Android app**

### **3. Content Manager Card** 👨‍💼 (Admin Only)
- Assign content managers
- Define responsibilities
- Auto-distribute requests
- Track performance

---

## 🚀 How to Use

### **Step 1: Assign Content Manager (Admin)**

```
URL: http://localhost:7000/marketing.html

1. Click "Content Managers" card
2. Fill in:
   - Manager Name
   - Email (for notifications)
   - Responsibilities
3. Click "Assign Manager"
```

**Example:**
```
Name: Raj Kumar
Email: raj@example.com
Responsibilities: Manage festival content, approve uploads, create social media posts
```

---

### **Step 2: Request Festival Content**

```
1. Click "Content Request" card
2. Select festival from calendar:
   - Diwali (Oct 31, 2025)
   - Holi (Mar 14, 2025)
   - Christmas (Dec 25, 2025)
   - etc.
3. Choose content type:
   - Image/Banner
   - Video
   - Social Media Post
   - Campaign Material
4. Describe requirements
5. Set priority (Normal/High/Urgent)
6. Submit
```

**What Happens:**
- ✅ Request saved with unique ID (CR000001)
- ✅ Auto-assigned to available content manager
- ✅ Manager receives email notification
- ✅ Status set to "Assigned"

---

### **Step 3: Upload Content for Android App**

```
1. Click "Upload Content" card
2. Enter title
3. Select media type (Image or Video)
4. Upload files:
   - Click or drag & drop
   - Multiple files supported
   - Preview before upload
5. Add description (optional)
6. Choose target audience:
   - All Users
   - Dealers Only
   - Customers Only
7. Submit
```

**What Happens:**
- ✅ Content saved with unique ID (UP000001)
- ✅ Status set to "Published"
- ✅ **Immediately visible in Android app**
- ✅ Ready for users to view

---

## 📅 Indian Festivals Calendar 2025

| Festival | Date | Month |
|----------|------|-------|
| Makar Sankranti | Jan 14, 2025 | January |
| Republic Day | Jan 26, 2025 | January |
| Maha Shivaratri | Feb 26, 2025 | February |
| Holi | Mar 14, 2025 | March |
| Ugadi | Mar 30, 2025 | March |
| Ram Navami | Apr 06, 2025 | April |
| Mahavir Jayanti | Apr 10, 2025 | April |
| Good Friday | Apr 18, 2025 | April |
| Buddha Purnima | May 12, 2025 | May |
| Eid ul-Fitr | May 13, 2025 | May |
| Independence Day | Aug 15, 2025 | August |
| Janmashtami | Aug 27, 2025 | August |
| Ganesh Chaturthi | Sep 17, 2025 | September |
| Navratri Begins | Oct 02, 2025 | October |
| Gandhi Jayanti | Oct 02, 2025 | October |
| Dussehra | Oct 11, 2025 | October |
| **Diwali** | **Oct 31, 2025** | October |
| Guru Nanak Jayanti | Nov 15, 2025 | November |
| Christmas | Dec 25, 2025 | December |

---

## 🔄 Complete Workflow

### **Content Request Flow**

```
User → Request Content
  ↓
Select Festival (e.g., Diwali)
  ↓
Choose Content Type (e.g., Video)
  ↓
Describe Requirements
  ↓
Set Priority (e.g., High)
  ↓
Submit
  ↓
System Auto-Assigns to Content Manager
  ↓
Manager Receives Email Notification
  ↓
Manager Creates Content
  ↓
Manager Marks as Completed
  ↓
Content Delivered
```

### **Content Upload Flow**

```
User → Upload Content
  ↓
Select Media Type (Image/Video)
  ↓
Upload Files (drag & drop or click)
  ↓
Preview Files
  ↓
Add Details (title, description, audience)
  ↓
Submit
  ↓
Content Saved to Database
  ↓
**Visible in Android App Immediately**
  ↓
Users Can View in App
```

---

## 📱 Android App Integration

### **What's Visible in Android App:**

1. **Uploaded Images**
   - Banners
   - Product images
   - Promotional content
   - Festival greetings

2. **Uploaded Videos**
   - Product demos
   - Tutorial videos
   - Marketing campaigns
   - Festival wishes

3. **Filtered by Audience**
   - "All Users" → Everyone sees it
   - "Dealers Only" → Only dealers see it
   - "Customers Only" → Only customers see it

### **Android App Features:**
- ✅ Automatic sync with CRM
- ✅ Real-time content updates
- ✅ Image gallery view
- ✅ Video player
- ✅ View counter tracking
- ✅ Offline caching

---

## 👨‍💼 Content Manager Responsibilities

### **What Content Managers Do:**

1. **Receive Requests**
   - Get email notifications
   - See request details
   - Check priority

2. **Create Content**
   - Design graphics
   - Edit videos
   - Write copy
   - Prepare materials

3. **Deliver Content**
   - Upload completed work
   - Mark request as complete
   - Notify requester

4. **Manage Queue**
   - Prioritize urgent requests
   - Track deadlines
   - Maintain quality

---

## 🔔 Email Notifications

### **Content Request Email (to Manager):**

```
To: manager@example.com
Subject: New Content Request - CR000001

Request ID: CR000001
Festival: Diwali
Date: October 31, 2025
Type: Video
Priority: High

Description:
Need a 30-second Diwali greeting video with our product showcase.
Include festive music and brand colors.

Please complete before October 25, 2025.
```

---

## 📊 Data Structure

### **Content Request**
```json
{
  "requestId": "CR000001",
  "festivalName": "Diwali",
  "festivalDate": "2025-10-31",
  "contentType": "video",
  "description": "30-second greeting video",
  "priority": "high",
  "status": "assigned",
  "assignedTo": "64f...",
  "assignedToName": "Raj Kumar"
}
```

### **Content Upload**
```json
{
  "uploadId": "UP000001",
  "title": "Diwali Greetings 2025",
  "mediaType": "video",
  "description": "Festival wishes video",
  "targetAudience": "all",
  "files": [
    {
      "name": "diwali.mp4",
      "size": 15728640,
      "type": "video/mp4"
    }
  ],
  "status": "published",
  "visibleInApp": true,
  "viewCount": 0
}
```

### **Content Manager**
```json
{
  "name": "Raj Kumar",
  "email": "raj@example.com",
  "responsibilities": "Festival content, social media",
  "active": true,
  "assignedRequests": ["64f...", "64g..."],
  "completedCount": 15,
  "pendingCount": 3
}
```

---

## 🔗 API Endpoints

### **Content Requests**
```
GET    /api/content-requests             - Get all requests
GET    /api/content-requests/status/:status - Filter by status
GET    /api/content-requests/festival/:name - By festival
POST   /api/content-requests             - Create request
PUT    /api/content-requests/:id         - Update request
PATCH  /api/content-requests/:id/status  - Update status
GET    /api/content-requests/stats/summary - Statistics
```

### **Content Uploads**
```
GET    /api/content-uploads              - Get all uploads
GET    /api/content-uploads/type/:type   - Filter by type
GET    /api/content-uploads/audience/:aud - By audience
POST   /api/content-uploads              - Upload content
PUT    /api/content-uploads/:id          - Update upload
PATCH  /api/content-uploads/:id/visibility - Toggle visibility
POST   /api/content-uploads/:id/view     - Increment views
GET    /api/content-uploads/stats/summary - Statistics
```

### **Content Managers**
```
GET    /api/content-managers             - Get all managers
GET    /api/content-managers/active      - Active managers
POST   /api/content-managers             - Assign manager
PUT    /api/content-managers/:id         - Update manager
DELETE /api/content-managers/:id         - Deactivate manager
GET    /api/content-managers/:id/stats   - Manager stats
```

---

## 🎨 UI Features

### **Interactive Cards**
- ✅ Hover effects
- ✅ Click to open modals
- ✅ Icon indicators
- ✅ Responsive design

### **Festival Calendar**
- ✅ Grid layout
- ✅ Click to select
- ✅ Visual selection indicator
- ✅ Date and name display

### **File Upload**
- ✅ Drag & drop
- ✅ Click to browse
- ✅ Multiple files
- ✅ Preview thumbnails
- ✅ Remove option
- ✅ File type indicators

### **Content List**
- ✅ Recent requests
- ✅ Status badges
- ✅ Priority indicators
- ✅ Auto-refresh

---

## 🧪 Testing Scenarios

### **Test 1: Request Diwali Content**
```
1. Open http://localhost:7000/marketing.html
2. Click "Content Request"
3. Select "Diwali" (Oct 31, 2025)
4. Type: Video
5. Description: "Festive greeting video"
6. Priority: High
7. Submit
8. Check: Request appears in list with "Assigned" status
```

### **Test 2: Upload Image**
```
1. Click "Upload Content"
2. Title: "Diwali Banner 2025"
3. Type: Image
4. Upload an image file
5. Audience: All Users
6. Submit
7. Check: Upload successful, visible in app
```

### **Test 3: Assign Content Manager**
```
1. Click "Content Managers"
2. Name: "Priya Sharma"
3. Email: "priya@example.com"
4. Responsibilities: "Festival content creation"
5. Submit
6. Check: Manager assigned, can receive requests
```

---

## 🔐 Security & Permissions

### **Who Can Do What:**

| Action | Admin | Manager | User |
|--------|-------|---------|------|
| Request Content | ✅ | ✅ | ✅ |
| Upload Content | ✅ | ✅ | ❌ |
| Assign Managers | ✅ | ❌ | ❌ |
| View Requests | ✅ | ✅ (Assigned) | ✅ (Own) |
| Update Status | ✅ | ✅ (Assigned) | ❌ |

---

## 📈 Analytics & Reporting

### **Available Statistics:**

**Content Requests:**
- Total requests
- By status (Pending/Assigned/Completed)
- By priority
- By festival
- Completion rate

**Content Uploads:**
- Total uploads
- Images vs Videos
- Total views
- By audience
- Most viewed content

**Content Managers:**
- Total assigned
- Pending requests
- Completed requests
- Performance metrics

---

## 🎯 Production Setup

### **File Upload (Cloud Storage)**

For production, integrate with cloud storage:

```javascript
// Example with AWS S3
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'iconic-crm-content',
        key: function (req, file, cb) {
            cb(null, Date.now().toString() + '-' + file.originalname);
        }
    })
});

router.post('/upload', upload.array('files'), (req, res) => {
    const files = req.files.map(f => ({
        url: f.location,
        name: f.originalname,
        size: f.size
    }));
    // Save to database
});
```

### **Email Notifications (Production)**

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function notifyContentManager(request, manager) {
    await transporter.sendMail({
        from: 'crm@iconic.com',
        to: manager.email,
        subject: `New Content Request - ${request.requestId}`,
        html: `...`
    });
}
```

---

## ✅ Summary

**What's Working:**
1. ✅ 3 main cards (Request/Upload/Managers)
2. ✅ Indian festival calendar (19 festivals)
3. ✅ Content request form
4. ✅ File upload with preview
5. ✅ Content manager assignment
6. ✅ Auto-assignment to managers
7. ✅ Email notifications
8. ✅ Android app integration
9. ✅ Status tracking
10. ✅ Request listing

**URLs:**
- Marketing Page: http://localhost:7000/marketing.html
- API Docs: See endpoints above

**Database Collections:**
- contentRequests
- contentUploads
- contentManagers

---

**🎊 Your complete marketing & content system is ready!**

**Start here**: http://localhost:7000/marketing.html
