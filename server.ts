import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Need raw body for Stripe ... wait, for Paymob we just need express.json()
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * Creates a Paymob Checkout session to upgrade the user's tier.
 */
app.post("/api/paymob/create-checkout-session", async (req, res) => {
  const { tierId, userId, walletNumber } = req.body; // 'essential' | 'unlimited'

  if (!process.env.PAYMOB_API_KEY || !process.env.PAYMOB_INTEGRATION_ID) {
    console.warn("Paymob is not configured. Missing environment variables.");
    return res.status(500).json({ error: "Paymob connection not configured. Add your API keys in .env." });
  }

  if (!tierId || !userId || !walletNumber) {
    return res.status(400).json({ error: "Missing required fields. Please provide tierId, userId, and a walletNumber." });
  }

  try {
    // Configure price based on tier (in cents/piasters)
    const priceAmount = tierId === "unlimited" ? 17000 : 7000; // Expected output is like 170 EGP, multiplied by 100

    // 1. Get Auth Token
    const authResponse = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
    });
    const authData = await authResponse.json();
    const authToken = authData.token;

    if (!authToken) {
      throw new Error("Failed to authenticate with Paymob");
    }

    // 2. Create Order
    const orderResponse = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: "false",
        amount_cents: String(priceAmount),
        currency: "EGP",
        merchant_order_id: `order_${Math.floor(Math.random()*1000000)}_${userId}_${tierId}`,
        items: []
      }),
    });
    const orderData = await orderResponse.json();
    const orderId = orderData.id;

    if (!orderId) {
      throw new Error("Failed to create order with Paymob");
    }

    // 3. Generate Payment Key
    const paymentKeyResponse = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: String(priceAmount),
        expiration: 3600,
        order_id: orderId,
        billing_data: {
          apartment: "NA", 
          email: "test@example.com", 
          floor: "NA", 
          first_name: "Dolaby", 
          street: "NA", 
          building: "NA", 
          phone_number: walletNumber, 
          shipping_method: "NA", 
          postal_code: "NA", 
          city: "NA", 
          country: "EG", 
          last_name: "User", 
          state: "NA"
        },
        currency: "EGP",
        integration_id: parseInt(process.env.PAYMOB_INTEGRATION_ID as string)
      }),
    });
    const paymentKeyData = await paymentKeyResponse.json();
    const paymentToken = paymentKeyData.token;

    if (!paymentToken) {
      throw new Error("Failed to generate payment key");
    }

    // 4. Pay using Wallet integration
    const payResponse = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: {
          identifier: walletNumber,
          subtype: "WALLET"
        },
        payment_token: paymentToken
      })
    });
    
    const payData = await payResponse.json();
    const redirectUrl = payData.iframe_redirection_url || payData.redirect_url;
    
    if (!redirectUrl) {
       console.error("Paymob Wallet error response:", payData);
       throw new Error("Failed to generate Vodafone Cash redirection URL.");
    }

    res.json({ url: redirectUrl });
  } catch (error: any) {
    console.error("Paymob Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle Paymob Webhook
 */
app.post("/api/paymob/webhook", async (req, res) => {
  const hmac = req.query.hmac;
  const paymobHmacParams = req.body.obj;

  if (!process.env.PAYMOB_HMAC) {
    console.warn("Missing PAYMOB_HMAC. Cannot verify webhook signature.");
    return res.status(500).send("Webhook secret missing");
  }

  if (paymobHmacParams) {
    const {
      amount_cents,
      created_at,
      currency,
      error_occured,
      has_parent_transaction,
      id,
      integration_id,
      is_3d_secure,
      is_auth,
      is_capture,
      is_refunded,
      is_standalone_payment,
      is_voided,
      order,
      owner,
      pending,
      source_data,
      success,
    } = paymobHmacParams;
    
    const source_data_pan = source_data?.pan || '';
    const source_data_sub_type = source_data?.sub_type || '';
    const source_data_type = source_data?.type || '';

    // The lexographical string for HMAC
    const lexString = `${amount_cents}${created_at}${currency}${error_occured}${has_parent_transaction}${id}${integration_id}${is_3d_secure}${is_auth}${is_capture}${is_refunded}${is_standalone_payment}${is_voided}${order.id}${owner}${pending}${source_data_pan}${source_data_sub_type}${source_data_type}${success}`;

    const calculatedHmac = crypto.createHmac("sha512", process.env.PAYMOB_HMAC).update(lexString).digest("hex");

    if (calculatedHmac === hmac) {
      if (success === true) {
        // extract tier and userId from merchant_order_id
        // merchant_order_id format: `order_${Math.floor(Math.random()*1000000)}_${userId}_${tierId}`
        const parts = order.merchant_order_id.split("_");
        if (parts.length >= 4) {
          const userId = parts[2];
          const tierId = parts[3];
          console.log(`Payment confirmed for user ${userId}. Upgrading to ${tierId}.`);
          
          // In a real scenario, we use Firebase Admin SDK to update Firestore
          console.log("Successfully handled payment. Note: Firebase Admin SDK needed for direct server-side DB update.");
        }
      }
    } else {
      console.log("HMAC does not match");
    }
  }

  res.status(200).send();
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
