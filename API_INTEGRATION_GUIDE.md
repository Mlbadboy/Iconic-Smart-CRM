# 🔌 Iconic Smart CRM - API Integration Guide

**Complete guide for integrating with Android apps, e-commerce platforms, and third-party applications**

---

## 📊 Overview

The Iconic Smart CRM API supports:
- ✅ **REST API** - Standard HTTP/JSON endpoints
- ✅ **API Key Authentication** - Secure token-based access
- ✅ **JWT Authentication** - User session management
- ✅ **Webhooks** - Real-time event notifications
- ✅ **CORS Support** - Cross-origin requests enabled
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Swagger Documentation** - Interactive API docs

---

## 🚀 Quick Start

### **Step 1: Get API Key**

```bash
# Login to get JWT token
curl -X POST http://localhost:7000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@iconic-crm.com",
    "password": "admin123"
  }'

# Create API Key
curl -X POST http://localhost:7000/api/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Android App",
    "description": "API key for mobile application",
    "permissions": ["read", "write"],
    "expiresInDays": 365
  }'
```

**Response:**
```json
{
  "message": "API Key created successfully",
  "apiKey": {
    "id": "64f34f764e68647f45628269",
    "key": "ik_a7b9c2d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    "name": "My Android App",
    "permissions": ["read", "write"],
    "expiresAt": "2026-10-18T00:00:00.000Z"
  },
  "warning": "Save this API key securely. You won't be able to see it again!"
}
```

### **Step 2: Make API Calls**

```bash
# Use API Key in header
curl -X GET http://localhost:7000/api/orders \
  -H "X-API-Key: ik_a7b9c2d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"

# Or as query parameter
curl -X GET "http://localhost:7000/api/orders?apiKey=ik_a7b9c2d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

---

## 📱 Android Integration

### **1. Setup (build.gradle)**

```gradle
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
}
```

### **2. API Client (Kotlin)**

```kotlin
// ApiConfig.kt
object ApiConfig {
    const val BASE_URL = "https://your-crm-domain.com/api/"
    const val API_KEY = "ik_your_api_key_here"
}

// ApiService.kt
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import okhttp3.OkHttpClient
import okhttp3.Interceptor

// Models
data class Order(
    val orderId: String,
    val userId: String,
    val items: List<OrderItem>,
    val amount: Double,
    val orderStatus: String,
    val paymentStatus: String,
    val shippingAddress: String
)

data class OrderItem(
    val name: String,
    val quantity: Int,
    val price: Double
)

data class CreateOrderRequest(
    val items: List<OrderItem>,
    val amount: Double,
    val shippingAddress: String
)

data class ServiceRequest(
    val issueType: String,
    val description: String,
    val priority: String,
    val orderRef: String? = null
)

// API Interface
interface CrmApiService {
    @GET("orders")
    suspend fun getOrders(): List<Order>
    
    @GET("orders/{id}")
    suspend fun getOrder(@Path("id") orderId: String): Order
    
    @POST("orders")
    suspend fun createOrder(@Body request: CreateOrderRequest): Order
    
    @GET("services")
    suspend fun getServices(): List<ServiceRequest>
    
    @POST("services")
    suspend fun createServiceRequest(@Body request: ServiceRequest): ServiceRequest
}

// API Client
object ApiClient {
    private val client = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("X-API-Key", ApiConfig.API_KEY)
                .addHeader("Content-Type", "application/json")
                .build()
            chain.proceed(request)
        }
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(ApiConfig.BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val apiService: CrmApiService = retrofit.create(CrmApiService::class.java)
}
```

### **3. Usage in Activity/ViewModel**

```kotlin
// MainActivity.kt
import kotlinx.coroutines.*
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Fetch orders
        scope.launch {
            try {
                val orders = withContext(Dispatchers.IO) {
                    ApiClient.apiService.getOrders()
                }
                // Update UI with orders
                displayOrders(orders)
            } catch (e: Exception) {
                handleError(e)
            }
        }
    }
    
    // Create new order
    fun placeOrder() {
        scope.launch {
            try {
                val items = listOf(
                    OrderItem("CRM License", 5, 99.99)
                )
                val request = CreateOrderRequest(
                    items = items,
                    amount = 499.95,
                    shippingAddress = "123 Main St, City, ST 12345"
                )
                
                val order = withContext(Dispatchers.IO) {
                    ApiClient.apiService.createOrder(request)
                }
                
                showSuccess("Order placed: ${order.orderId}")
            } catch (e: Exception) {
                handleError(e)
            }
        }
    }
    
    // Create service request
    fun createServiceRequest(orderId: String, issue: String) {
        scope.launch {
            try {
                val request = ServiceRequest(
                    issueType = "technical",
                    description = issue,
                    priority = "high",
                    orderRef = orderId
                )
                
                val service = withContext(Dispatchers.IO) {
                    ApiClient.apiService.createServiceRequest(request)
                }
                
                showSuccess("Service request created")
            } catch (e: Exception) {
                handleError(e)
            }
        }
    }
}
```

---

## 🛒 E-Commerce Integration (Shopify, WooCommerce, etc.)

### **1. Shopify Integration**

```javascript
// shopify-crm-integration.js
const axios = require('axios');

class IconicCRMIntegration {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // Sync Shopify order to CRM
  async syncOrder(shopifyOrder) {
    try {
      const crmOrder = {
        items: shopifyOrder.line_items.map(item => ({
          name: item.title,
          quantity: item.quantity,
          price: parseFloat(item.price)
        })),
        amount: parseFloat(shopifyOrder.total_price),
        shippingAddress: this.formatAddress(shopifyOrder.shipping_address)
      };

      const response = await this.client.post('/orders', crmOrder);
      console.log('Order synced to CRM:', response.data.orderId);
      return response.data;
    } catch (error) {
      console.error('Error syncing order:', error.message);
      throw error;
    }
  }

  // Track order status
  async trackOrder(crmOrderId) {
    try {
      const response = await this.client.get(`/orders/${crmOrderId}`);
      return response.data;
    } catch (error) {
      console.error('Error tracking order:', error.message);
      throw error;
    }
  }

  // Format address
  formatAddress(address) {
    return `${address.address1}, ${address.city}, ${address.province} ${address.zip}`;
  }
}

// Shopify Webhook Handler
app.post('/webhooks/shopify/orders-create', async (req, res) => {
  const shopifyOrder = req.body;
  
  const crm = new IconicCRMIntegration(
    process.env.CRM_API_KEY,
    'https://your-crm-domain.com/api'
  );
  
  try {
    await crm.syncOrder(shopifyOrder);
    res.status(200).send('Order synced');
  } catch (error) {
    res.status(500).send('Sync failed');
  }
});

module.exports = IconicCRMIntegration;
```

### **2. WooCommerce Integration**

```php
<?php
// iconic-crm-integration.php

class Iconic_CRM_Integration {
    private $api_key;
    private $base_url;

    public function __construct($api_key, $base_url) {
        $this->api_key = $api_key;
        $this->base_url = $base_url;
    }

    // Sync WooCommerce order to CRM
    public function sync_order($order_id) {
        $order = wc_get_order($order_id);
        
        $items = array();
        foreach ($order->get_items() as $item) {
            $items[] = array(
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'price' => $item->get_total() / $item->get_quantity()
            );
        }

        $crm_order = array(
            'items' => $items,
            'amount' => $order->get_total(),
            'shippingAddress' => $this->format_address($order)
        );

        $response = $this->make_request('/orders', 'POST', $crm_order);
        
        if ($response && isset($response['orderId'])) {
            update_post_meta($order_id, '_crm_order_id', $response['orderId']);
            return $response['orderId'];
        }
        
        return false;
    }

    // Make API request
    private function make_request($endpoint, $method = 'GET', $data = null) {
        $url = $this->base_url . $endpoint;
        
        $args = array(
            'method' => $method,
            'headers' => array(
                'X-API-Key' => $this->api_key,
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30
        );

        if ($data) {
            $args['body'] = json_encode($data);
        }

        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            return false;
        }

        return json_decode(wp_remote_retrieve_body($response), true);
    }

    private function format_address($order) {
        return sprintf(
            '%s, %s, %s %s',
            $order->get_shipping_address_1(),
            $order->get_shipping_city(),
            $order->get_shipping_state(),
            $order->get_shipping_postcode()
        );
    }
}

// Hook into WooCommerce order creation
add_action('woocommerce_new_order', function($order_id) {
    $crm = new Iconic_CRM_Integration(
        get_option('iconic_crm_api_key'),
        'https://your-crm-domain.com/api'
    );
    $crm->sync_order($order_id);
});
?>
```

---

## 🔔 Webhook Integration

### **1. Setup Webhook**

```bash
curl -X POST http://localhost:7000/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Notifications",
    "url": "https://your-app.com/webhooks/crm-orders",
    "events": [
      "order.created",
      "order.paid",
      "order.shipped",
      "order.delivered"
    ]
  }'
```

### **2. Webhook Receiver (Node.js)**

```javascript
// webhook-receiver.js
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Verify webhook signature
function verifyWebhookSignature(secret, payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Webhook endpoint
app.post('/webhooks/crm-orders', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;  // From webhook creation
  
  // Verify signature
  if (!verifyWebhookSignature(secret, req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, timestamp, data } = req.body;
  
  console.log(`Received webhook: ${event}`);
  console.log('Data:', data);

  // Handle different events
  switch (event) {
    case 'order.created':
      handleOrderCreated(data);
      break;
    case 'order.paid':
      handleOrderPaid(data);
      break;
    case 'order.shipped':
      handleOrderShipped(data);
      break;
    case 'order.delivered':
      handleOrderDelivered(data);
      break;
  }

  res.status(200).json({ received: true });
});

function handleOrderCreated(data) {
  // Send confirmation email
  // Update inventory
  // Notify team
  console.log('Processing new order:', data.orderId);
}

function handleOrderShipped(data) {
  // Send tracking email
  // Update customer
  console.log('Order shipped:', data.orderId);
}

app.listen(3000, () => {
  console.log('Webhook receiver running on port 3000');
});
```

---

## 🌐 Web App Integration (React/Next.js)

```javascript
// api/crmClient.js
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_CRM_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_CRM_API_URL;

export const crmClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// API functions
export const crmApi = {
  // Orders
  getOrders: () => crmClient.get('/orders'),
  getOrder: (id) => crmClient.get(`/orders/${id}`),
  createOrder: (data) => crmClient.post('/orders', data),
  
  // Services
  getServices: () => crmClient.get('/services'),
  createService: (data) => crmClient.post('/services', data),
  
  // Leads
  getLeads: () => crmClient.get('/leads'),
  createLead: (data) => crmClient.post('/leads', data)
};

// React Hook
import { useState, useEffect } from 'react';

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    crmApi.getOrders()
      .then(res => setOrders(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { orders, loading, error };
}
```

---

## 📊 API Endpoints Reference

### **Orders**
```
GET    /api/orders              # Get all orders
GET    /api/orders/:id          # Get single order
POST   /api/orders              # Create order
PUT    /api/orders/:id          # Update order
PUT    /api/orders/:id/status   # Update status
```

### **Services**
```
GET    /api/services            # Get all services
GET    /api/services/:id        # Get single service
POST   /api/services            # Create service request
PUT    /api/services/:id        # Update service
```

### **Leads**
```
GET    /api/leads               # Get all leads
GET    /api/leads/:id           # Get single lead
POST   /api/leads               # Create lead
PUT    /api/leads/:id           # Update lead
DELETE /api/leads/:id           # Delete lead
```

### **API Keys**
```
POST   /api/api-keys            # Create API key
GET    /api/api-keys            # Get all keys
GET    /api/api-keys/:id        # Get single key
PUT    /api/api-keys/:id        # Update key
DELETE /api/api-keys/:id        # Revoke key
POST   /api/api-keys/:id/rotate # Rotate key
```

### **Webhooks**
```
POST   /api/webhooks            # Create webhook
GET    /api/webhooks            # Get all webhooks
GET    /api/webhooks/:id        # Get single webhook
PUT    /api/webhooks/:id        # Update webhook
DELETE /api/webhooks/:id        # Delete webhook
POST   /api/webhooks/:id/test   # Test webhook
GET    /api/webhooks/:id/stats  # Get stats
```

---

## 🔐 Security Best Practices

1. **Store API Keys Securely**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Validate Webhooks**
   - Always verify webhook signatures
   - Use HTTPS for webhook URLs
   - Implement idempotency

3. **Rate Limiting**
   - Default: 1000 requests/hour per API key
   - Contact admin for higher limits

4. **HTTPS Only**
   - Always use HTTPS in production
   - API keys transmitted over HTTP are vulnerable

---

## 📱 Platform-Specific Examples

### **iOS (Swift)**
```swift
import Foundation

class CRMClient {
    let apiKey: String
    let baseURL: String
    
    init(apiKey: String, baseURL: String) {
        self.apiKey = apiKey
        self.baseURL = baseURL
    }
    
    func getOrders(completion: @escaping ([Order]?, Error?) -> Void) {
        guard let url = URL(string: "\(baseURL)/orders") else { return }
        
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            // Handle response
        }.resume()
    }
}
```

### **Python**
```python
import requests

class IconicCRMClient:
    def __init__(self, api_key, base_url):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def get_orders(self):
        response = requests.get(
            f'{self.base_url}/orders',
            headers=self.headers
        )
        return response.json()
    
    def create_order(self, order_data):
        response = requests.post(
            f'{self.base_url}/orders',
            headers=self.headers,
            json=order_data
        )
        return response.json()
```

---

## ✅ Testing Your Integration

```bash
# Health check
curl http://localhost:7000/api/health

# Test API key
curl -H "X-API-Key: YOUR_API_KEY" \
     http://localhost:7000/api/orders

# Create test order
curl -X POST http://localhost:7000/api/orders \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"name": "Test Product", "quantity": 1, "price": 99.99}],
    "amount": 99.99,
    "shippingAddress": "123 Test St"
  }'
```

---

## 🎯 Next Steps

1. Generate your API key
2. Choose your integration method
3. Follow the platform-specific guide
4. Set up webhooks (optional)
5. Test in development
6. Deploy to production

---

**Need Help?** Check the full API documentation at `/api-docs` or contact support.

**🚀 Your CRM is now ready for integration with any platform!**
