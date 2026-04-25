import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { authenticator } = require("otplib");
import QRCode from "qrcode";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security Configurations
const ENCRYPTION_KEY = process.env.OTP_ENCRYPTION_KEY || "fallback_32_byte_key_for_demo_!!!!"; // Must be 32 bytes
const IV_LENGTH = 16;

/**
 * Encrypts a secret key before storage
 */
function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Decrypts a secret key for verification
 */
function decrypt(text: string) {
  if (!text || typeof text !== 'string' || !text.includes(":")) return "";
  try {
    const textParts = text.split(":");
    const ivHex = textParts.shift();
    const encryptedHex = textParts.join(":");
    
    if (!ivHex || !encryptedHex) return "";
    
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption Error:", err);
    return "";
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Rate Limiting: 5 attempts per 15 minutes for OTP verification
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "TOO MANY ATTEMPTS. PLEASE TRY AGAIN LATER." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // API Routes
  
  // 1. Generate TOTP Secret & QR Code
  app.post("/api/otp/generate", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "EMAIL REQUIRED" });

      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(email, "Rowina Finance", secret);
      const qrCodeUrl = await QRCode.toDataURL(otpauth);
      
      // We return the encrypted secret to the client to store in their profile
      // In a pure backend-auth system, we would store this directly in the DB
      const encryptedSecret = encrypt(secret);

      res.json({ 
        qrCodeUrl, 
        encryptedSecret,
        message: "SCAN QR CODE WITH GOOGLE AUTHENTICATOR" 
      });
    } catch (error) {
      console.error("OTP Generate Error:", error);
      res.status(500).json({ error: "INTERNAL SERVER ERROR" });
    }
  });

  // 2. Verify OTP (Setup or Login)
  app.post("/api/otp/verify", authLimiter, async (req, res) => {
    try {
      const { token, encryptedSecret } = req.body;
      if (!token || !encryptedSecret) return res.status(400).json({ error: "TOKEN AND SECRET REQUIRED" });

      const secret = decrypt(encryptedSecret);
      const isValid = authenticator.check(token, secret);

      if (isValid) {
        res.json({ success: true, message: "OTP VERIFIED SUCCESSFULLY" });
      } else {
        console.warn(`Suspicious login attempt: Invalid OTP token for secret.`);
        res.status(401).json({ success: false, error: "INVALID OTP CODE" });
      }
    } catch (error) {
      console.error("OTP Verify Error:", error);
      res.status(500).json({ error: "INTERNAL SERVER ERROR" });
    }
  });

  // Vite Middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
