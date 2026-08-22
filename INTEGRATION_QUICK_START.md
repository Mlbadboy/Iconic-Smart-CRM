# 🚀 API Integration Quick Start

**Get started with Iconic Smart CRM API in 5 minutes!**

---

## ✅ Prerequisites

- Node.js 14+ or any HTTP client
- MongoDB running (Docker or local)
- CRM server running on port 7000

---

## 🎯 Step 1: Start the Server

```bash
cd C:\Users\mayur_hlx0x09\Desktop\Iconic-Smart-CRM
npm start
```

Server should be running at **http://localhost:7000**

---

## 🔑 Step 2: Get Your API Key

### **Option A: Using cURL**

```bash
# 1. Login to get JWT token
curl -X POST http://localhost:7000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@charlieai.com\",\"password\":\"admin123\"}"

# Save the token from response
# TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..."

# 2. Create API Key
curl -X POST http://localhost:7000/api/api-keys \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"My App\",\"permissions\":[\"read\",\"write\"],\"expiresInDays\":365}"
```

### **Option B: Using the Web Interface**

1. Go to http://localhost:7000
2. Login with `admin@charlieai.com` / `admin123`
3. Navigate to Settings → API Keys
4. Click "Create New API Key"
5. Copy and save the key securely

---

## 📱 Step 3: Test Your API Key

```bash
# Replace YOUR_API_KEY with the key from Step 2
curl -H "X-API-Key: YOUR_API_KEY" \
     http://localhost:7000/api/health

# Expected response:
# {"status":"OK"}
```

---

## 🚀 Step 4: Make Your First API Call

### **Get All Orders**
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
     http://localhost:7000/api/orders
```

### **Create an Order**
```bash
curl -X POST http://localhost:7000/api/orders \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "CRM Pro License",
        "quantity": 5,
        "price": 99.99
      }
    ],
    "amount": 499.95,
    "shippingAddress": "123 Main Street, City, ST 12345"
  }'
```

### **Get Order by ID**
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
     http://localhost:7000/api/orders/ORDER_ID_HERE
```

### **Create Service Request**
```bash
curl -X POST http://localhost:7000/api/services \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "issueType": "technical",
    "description": "Need help with integration",
    "priority": "high"
  }'
```

---

## 📱 Android Integration (5-Minute Setup)

### **1. Add Dependencies**
```gradle
// build.gradle
dependencies {
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
}
```

### **2. Create API Interface**
```kotlin
// CrmApi.kt
interface CrmApi {
    @GET("orders")
    suspend fun getOrders(): List<Order>
    
    @POST("orders")
    suspend fun createOrder(@Body order: CreateOrderRequest): Order
    
    companion object {
        private const val BASE_URL = "http://your-server:7000/api/"
        private const val API_KEY = "ik_your_api_key_here"
        
        val instance: CrmApi by lazy {
            val client = OkHttpClient.Builder()
                .addInterceptor { chain ->
                    val request = chain.request().newBuilder()
                        .addHeader("X-API-Key", API_KEY)
                        .build()
                    chain.proceed(request)
                }
                .build()
            
            Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(CrmApi::class.java)
        }
    }
}
```

### **3. Use in Your App**
```kotlin
// MainActivity.kt
lifecycleScope.launch {
    try {
        val orders = CrmApi.instance.getOrders()
        // Display orders
    } catch (e: Exception) {
        // Handle error
    }
}
```

---

## 🌐 Web App Integration (JavaScript)

```javascript
// crm-api.js
const API_KEY = 'ik_your_api_key_here';
const BASE_URL = 'http://localhost:7000/api';

async function crmRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return response.json();
}

// Get orders
const orders = await crmRequest('/orders');

// Create order
const newOrder = await crmRequest('/orders', {
  method: 'POST',
  body: JSON.stringify({
    items: [{ name: 'Product', quantity: 1, price: 99.99 }],
    amount: 99.99,
    shippingAddress: '123 Main St'
  })
});
```

---

## 🔔 Setup Webhooks (Optional)

### **1. Create Webhook**
```bash
curl -X POST http://localhost:7000/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Notifications",
    "url": "https://your-app.com/webhooks/orders",
    "events": ["order.created", "order.shipped", "order.delivered"]
  }'
```

### **2. Webhook Receiver Example**
```javascript
// webhook-handler.js
app.post('/webhooks/orders', (req, res) => {
  const { event, data } = req.body;
  
  console.log(`Received: ${event}`);
  console.log('Data:', data);
  
  // Handle the event
  switch(event) {
    case 'order.created':
      sendConfirmationEmail(data);
      break;
    case 'order.shipped':
      sendTrackingEmail(data);
      break;
  }
  
  res.status(200).json({ received: true });
});
```

---

## 🛒 E-Commerce Platform Integration

### **Shopify**
```javascript
// Sync Shopify orders to CRM
app.post('/shopify/webhook', async (req, res) => {
  const shopifyOrder = req.body;
  
  await fetch('http://localhost:7000/api/orders', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.CRM_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: shopifyOrder.line_items.map(item => ({
        name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price)
      })),
      amount: parseFloat(shopifyOrder.total_price),
      shippingAddress: formatAddress(shopifyOrder.shipping_address)
    })
  });
  
  res.status(200).send('Synced');
});
```

### **WooCommerce (PHP)**
```php
// Sync WooCommerce orders
add_action('woocommerce_new_order', function($order_id) {
    $order = wc_get_order($order_id);
    
    $ch = curl_init('http://localhost:7000/api/orders');
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'X-API-Key: ' . get_option('crm_api_key'),
        'Content-Type: application/json'
    ));
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'items' => array_map(function($item) {
            return [
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'price' => $item->get_total() / $item->get_quantity()
            ];
        }, $order->get_items()),
        'amount' => $order->get_total(),
        'shippingAddress' => $order->get_formatted_shipping_address()
    ]));
    
    curl_exec($ch);
    curl_close($ch);
});
```

---

## 📊 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/orders` | GET, POST | Manage orders |
| `/api/orders/:id` | GET, PUT | Single order |
| `/api/services` | GET, POST | Service requests |
| `/api/services/:id` | GET, PUT | Single service |
| `/api/leads` | GET, POST | Manage leads |
| `/api/leads/:id` | GET, PUT, DELETE | Single lead |
| `/api/contacts` | GET, POST | Manage contacts |
| `/api/opportunities` | GET, POST | Sales pipeline |
| `/api/deliveries` | GET, POST | Track shipments |
| `/api/marketing` | GET, POST | Marketing assets |

---

## 🔒 Security Best Practices

1. ✅ **Never expose API keys** in client-side code
2. ✅ **Use environment variables** for sensitive data
3. ✅ **Rotate keys regularly** (every 90 days recommended)
4. ✅ **Use HTTPS** in production
5. ✅ **Implement rate limiting** on your end
6. ✅ **Verify webhook signatures** always

---

## 🐛 Troubleshooting

### **"API Key required" error**
- Make sure you're sending `X-API-Key` header
- Verify the API key is correct and not expired

### **"CORS error" in browser**
- CORS is enabled by default
- Make sure you're using the correct origin

### **Connection refused**
- Ensure server is running on port 7000
- Check MongoDB is connected

### **401 Unauthorized**
- API key might be expired or revoked
- Create a new API key

---

## 📚 Full Documentation

- **Complete API Guide**: See `API_INTEGRATION_GUIDE.md`
- **Workflow Documentation**: See `WORKFLOW_GUIDE.md`
- **UI Integration**: See `UI_INTEGRATION_COMPLETE.md`

---

## ✅ Checklist

- [ ] Server running on port 7000
- [ ] MongoDB connected
- [ ] API key created and saved
- [ ] Test API call successful
- [ ] Integration code ready
- [ ] Webhooks configured (optional)
- [ ] Security measures in place

---

## 🎉 You're Ready!

Your CRM API is now fully integrated and ready to use with:
- ✅ Android apps
- ✅ iOS apps
- ✅ Web applications
- ✅ E-commerce platforms (Shopify, WooCommerce)
- ✅ Custom integrations
- ✅ Webhook notifications

**Need help?** Check the comprehensive guides or test using the web interface at http://localhost:7000

**🚀 Happy integrating!**
