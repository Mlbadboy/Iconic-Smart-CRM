# 📱 How Android Apps Connect to CRM Systems

## 🎯 Common Connection Patterns

### **Pattern 1: REST API (Most Common) ✅**
**Used by**: This CRM

```
Android App → HTTP/HTTPS → REST API → CRM Backend → Database
```

**How it works:**
1. Android app makes HTTP requests to API endpoints
2. API validates authentication (JWT token)
3. API processes request and returns JSON response
4. Android app displays data to user

**Example:**
```kotlin
// Android App (Kotlin)
val response = apiClient.post("/api/orders", orderData)
if (response.isSuccessful) {
    val order = response.body()
    showSuccess("Order created: ${order.orderNumber}")
}
```

---

### **Pattern 2: GraphQL API**
```
Android App → GraphQL Endpoint → CRM Backend → Database
```

**How it works:**
- Single endpoint for all queries
- Client specifies what data it needs
- More flexible but complex

---

### **Pattern 3: WebSocket (Real-Time)**
```
Android App ↔ WebSocket Connection ↔ CRM Server
```

**How it works:**
- Persistent connection
- Server pushes updates to app
- Used for real-time notifications

**This CRM supports**: Socket.IO for real-time updates

---

## 🔌 How This CRM Connects to Android Apps

### **Architecture**

```
┌─────────────────────────────────────┐
│      Android App (Field Staff)     │
│                                     │
│  - Login Screen                     │
│  - Dashboard                        │
│  - Attendance                       │
│  - Store Visits                     │
│  - Order Creation                   │
└──────────────┬──────────────────────┘
               │
               │ REST API Calls
               │ HTTPS (Production)
               │ HTTP (Development)
               │
               │ Headers:
               │ Authorization: Bearer <token>
               │ Content-Type: application/json
               │
┌──────────────▼──────────────────────┐
│      CRM Backend (Express.js)        │
│                                     │
│  - Validates JWT Token              │
│  - Processes Request                │
│  - Queries MongoDB                  │
│  - Returns JSON Response            │
└──────────────┬──────────────────────┘
               │
               │ Database Queries
               │
┌──────────────▼──────────────────────┐
│      MongoDB Database                │
│                                     │
│  - Users                            │
│  - Orders                           │
│  - Service Requests                 │
│  - Attendance                       │
│  - Store Visits                     │
└─────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### **Step 1: Login**
```kotlin
// Android App
POST https://api.iconicsmart.co.in/api/auth/login
Body: {
    "email": "employee@iconicsmart.com",
    "password": "password123"
}

Response: {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "id": "6904fcf0a254947361617bb8",
        "name": "Shubham Kumar",
        "email": "employee@iconicsmart.com",
        "role": "sales"
    }
}
```

### **Step 2: Store Token**
```kotlin
// Android App stores token securely
SharedPreferences prefs = getSharedPreferences("CRM", MODE_PRIVATE);
prefs.edit().putString("authToken", token).apply();
```

### **Step 3: Use Token in All Requests**
```kotlin
// Every API call includes token
Headers: {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "Content-Type": "application/json"
}
```

---

## 📡 API Communication Examples

### **1. Mark Attendance**
```kotlin
// Android App
POST /api/beat-tracker/attendance
Headers: {
    Authorization: Bearer <token>
}
Body: {
    "employeeId": "6904fcf0a254947361617bb8",
    "checkInTime": "2025-01-30T09:30:00Z",
    "location": {
        "latitude": 28.6328,
        "longitude": 77.2197,
        "address": "Connaught Place, Delhi"
    }
}

Response: {
    "message": "Attendance recorded",
    "attendance": { ... }
}
```

### **2. Create Order**
```kotlin
// Android App
POST /api/orders
Headers: {
    Authorization: Bearer <token>
}
Body: {
    "retailerId": "507f1f77bcf86cd799439011",
    "items": [
        {
            "name": "Samsung TV",
            "quantity": 2,
            "price": 25999,
            "total": 51998
        }
    ],
    "subtotal": 51998,
    "gstRate": 18,
    "amount": 61357.64
}

Response: {
    "orderNumber": "ORD000012",
    "amount": 61357.64,
    "status": "confirmed"
}
```

### **3. Get Products**
```kotlin
// Android App
GET /api/products
Headers: {
    Authorization: Bearer <token>
}

Response: [
    {
        "id": "ICON001",
        "name": "Iconic Smart LED Bulb 9W",
        "price": 299,
        "sku": "LED-9W-001"
    },
    ...
]
```

---

## 🛠️ Android App Implementation

### **Required Libraries**

```gradle
// build.gradle (Android)
dependencies {
    // HTTP Client
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    
    // Authentication
    implementation 'androidx.security:security-crypto:1.1.0-alpha06'
    
    // Location
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    
    // Image Upload
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
}
```

### **API Client Setup**

```kotlin
// ApiClient.kt
class ApiClient {
    private val baseUrl = "https://api.iconicsmart.co.in/api"
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    private val apiService = retrofit.create(ApiService::class.java)
    
    fun getAuthToken(): String? {
        // Get from secure storage
        return SharedPreferences.getToken()
    }
    
    fun makeRequest(endpoint: String, data: Any): Response {
        val token = getAuthToken()
        val headers = mapOf(
            "Authorization" to "Bearer $token",
            "Content-Type" to "application/json"
        )
        return apiService.post(endpoint, data, headers)
    }
}
```

### **Login Implementation**

```kotlin
// LoginActivity.kt
class LoginActivity : AppCompatActivity() {
    fun login(email: String, password: String) {
        val loginData = mapOf(
            "email" to email,
            "password" to password
        )
        
        ApiClient.post("/auth/login", loginData) { response ->
            if (response.isSuccessful) {
                val token = response.body()?.token
                val user = response.body()?.user
                
                // Save token securely
                saveToken(token)
                saveUser(user)
                
                // Navigate to dashboard
                startActivity(Intent(this, DashboardActivity::class.java))
            } else {
                showError("Login failed")
            }
        }
    }
}
```

---

## 🔑 API Key Authentication (Alternative)

### **For Server-to-Server or Public APIs**

This CRM also supports API Key authentication:

```kotlin
// Using API Key instead of JWT
Headers: {
    "X-API-Key": "ik_abc123def456...",
    "Content-Type": "application/json"
}
```

**Generate API Key:**
```
POST /api/api-keys
Body: {
    "name": "Android App Key",
    "permissions": ["read", "write"],
    "expiresInDays": 365
}
```

---

## 📊 Data Flow Example

### **Complete Order Creation Flow**

```
1. Android App: User selects retailer
   ↓
2. Android App: Fetches products
   GET /api/products
   ↓
3. Android App: User adds items to cart
   ↓
4. Android App: Calculates totals (GST, etc.)
   ↓
5. Android App: Creates order
   POST /api/orders
   Headers: Authorization: Bearer <token>
   Body: { retailerId, items, amount, ... }
   ↓
6. CRM Backend: Validates token
   ↓
7. CRM Backend: Creates order in database
   ↓
8. CRM Backend: Sends email notification
   ↓
9. CRM Backend: Sends WebSocket notification
   ↓
10. CRM Backend: Returns order details
    Response: { orderNumber, amount, status, ... }
   ↓
11. Android App: Shows success message
    "Order ORD000012 created successfully!"
   ↓
12. CRM Dashboard: Order appears instantly
```

---

## 🌐 Network Configuration

### **Development**
```kotlin
// Android App - Development
val BASE_URL = "http://10.0.2.2:7000/api"  // Android emulator
// or
val BASE_URL = "http://192.168.1.100:7000/api"  // Local network
```

### **Production**
```kotlin
// Android App - Production
val BASE_URL = "https://api.iconicsmart.co.in/api"
```

### **SSL/HTTPS**
```kotlin
// For production, use HTTPS
val client = OkHttpClient.Builder()
    .certificatePinner(CertificatePinner.Builder()
        .add("api.iconicsmart.co.in", "sha256/...")
        .build())
    .build()
```

---

## 🔒 Security Best Practices

### **1. Token Storage**
```kotlin
// ✅ Secure Storage (Android Keystore)
val encryptedPrefs = EncryptedSharedPreferences.create(
    "crm_prefs",
    MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build(),
    context,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

encryptedPrefs.edit()
    .putString("authToken", token)
    .apply()
```

### **2. Certificate Pinning**
```kotlin
// Prevent man-in-the-middle attacks
val certificatePinner = CertificatePinner.Builder()
    .add("api.iconicsmart.co.in", "sha256/...")
    .build()
```

### **3. Request Timeout**
```kotlin
val client = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .build()
```

---

## 📱 Android App Features Checklist

### **Core Features**
- [x] Login with email/password
- [x] JWT token storage
- [x] API client setup
- [x] Error handling
- [x] Offline data caching

### **Field Features**
- [x] Mark attendance (GPS)
- [x] Store visits (GPS + photo)
- [x] Create orders
- [x] View products
- [x] View retailers
- [x] Performance dashboard

### **Technical Requirements**
- [x] Internet permission
- [x] Location permission
- [x] Camera permission
- [x] Storage permission
- [x] Network security config (HTTPS)

---

## 🧪 Testing Android Connection

### **Test 1: Connectivity**
```bash
# From Android device/emulator
curl http://10.0.2.2:7000/api/health

# Should return: {"status":"OK"}
```

### **Test 2: Login**
```kotlin
// Android App Test
POST http://10.0.2.2:7000/api/auth/login
Body: {
    "email": "sales@iconic-crm.com",
    "password": "sales123"
}

// Should return token
```

### **Test 3: API Call**
```kotlin
// Android App Test
GET http://10.0.2.2:7000/api/products
Headers: {
    Authorization: Bearer <token>
}

// Should return products list
```

---

## 📋 API Endpoints for Android

### **Authentication**
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/verify` - Verify token

### **Orders**
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order

### **Products**
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product

### **Retailers**
- `GET /api/retailers` - List retailers
- `GET /api/retailers/:id` - Get retailer

### **Beat Tracker**
- `POST /api/beat-tracker/attendance` - Mark attendance
- `POST /api/beat-tracker/visit` - Mark store visit
- `GET /api/beat-tracker/performance/:id` - Get performance

### **Service Requests**
- `GET /api/service-requests` - List requests
- `POST /api/service-requests` - Create request

---

## 🔄 Real-Time Updates (WebSocket)

### **Socket.IO Connection**

```kotlin
// Android App - Socket.IO Client
val socket = IO.socket("https://api.iconicsmart.co.in")

socket.on(Socket.EVENT_CONNECT) {
    // Authenticate
    socket.emit("authenticate", userId)
}

socket.on("notification") { args ->
    val notification = args[0] as JSONObject
    showNotification(notification)
}
```

### **Notification Types**
- `order_created` - New order
- `order_updated` - Order status changed
- `service_request_created` - New service request
- `delivery_updated` - Delivery status

---

## 📝 Summary

### **How Android Apps Connect:**

1. **REST API** (Primary method)
   - HTTP/HTTPS requests
   - JSON data format
   - JWT authentication
   - Standard HTTP methods (GET, POST, PUT, DELETE)

2. **WebSocket** (Real-time)
   - Persistent connection
   - Server pushes updates
   - Socket.IO protocol

3. **API Keys** (Alternative)
   - For server-to-server
   - Public API access
   - Key-based authentication

### **This CRM Setup:**
- ✅ REST API ready
- ✅ JWT authentication
- ✅ WebSocket support (Socket.IO)
- ✅ API Key management
- ✅ CORS configured
- ✅ Rate limiting
- ✅ Security headers

### **Android App Needs:**
- HTTP client (Retrofit/OkHttp)
- JSON parser (Gson/Moshi)
- Token storage (EncryptedSharedPreferences)
- Location services
- Camera access
- Network security config

---

**Base URL**: `http://localhost:7000/api` (dev) or `https://api.iconicsmart.co.in/api` (prod)  
**Auth**: JWT Token in `Authorization: Bearer <token>` header  
**Format**: JSON request/response

