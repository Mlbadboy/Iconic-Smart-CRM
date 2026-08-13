# 📱 Android App Setup Guide

## Quick Start for Android Developers

### 1. API Base URL Configuration

**Development:**
```kotlin
const val BASE_URL = "http://10.0.2.2:7000/api"  // Android Emulator
// or
const val BASE_URL = "http://YOUR_LOCAL_IP:7000/api"  // Physical device
```

**Production:**
```kotlin
const val BASE_URL = "https://api.iconicsmart.co.in/api"
```

### 2. Authentication Setup

```kotlin
// Login Request
data class LoginRequest(
    val email: String,
    val password: String
)

// Login Response
data class LoginResponse(
    val token: String,
    val user: User
)

// API Call
suspend fun login(email: String, password: String): LoginResponse {
    return apiService.post("/auth/login", LoginRequest(email, password))
}
```

### 3. API Client with Token

```kotlin
class ApiClient {
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Authorization", "Bearer ${getToken()}")
                .addHeader("Content-Type", "application/json")
                .build()
            chain.proceed(request)
        }
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
}
```

### 4. Test Connection

```kotlin
// Test if server is reachable
suspend fun testConnection(): Boolean {
    return try {
        val response = apiService.get("/health")
        response.isSuccessful
    } catch (e: Exception) {
        false
    }
}
```

---

## 📋 Complete API Reference

See `ANDROID_CRM_CONNECTION_GUIDE.md` for full details.

---

**Ready to integrate!** 🚀

