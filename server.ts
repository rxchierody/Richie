import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Flutterwave Secret Key from environment variables
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

/**
 * Endpoint to create a payment link
 * POST /api/create-payment
 */
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, currency, customer_email, customer_name, tx_ref } = req.body;

    if (!amount || !currency || !customer_email || !tx_ref) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prepare Flutterwave payload
    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/payment-callback`,
      customer: {
        email: customer_email,
        name: customer_name || 'Customer',
      },
      customizations: {
        title: 'Sales Tracking App Payment',
        description: 'Payment for sale item',
      },
    };

    // Call Flutterwave API v3
    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      payload,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.status === 'success') {
      res.json({ payment_link: response.data.data.link });
    } else {
      res.status(500).json({ error: 'Failed to create payment link' });
    }
  } catch (error: any) {
    console.error('Flutterwave Create Payment Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || 'Internal Server Error' });
  }
});

/**
 * Endpoint to verify a payment
 * GET /api/verify-payment/:transaction_id
 */
app.get('/api/verify-payment/:transaction_id', async (req, res) => {
  try {
    const { transaction_id } = req.params;

    if (!transaction_id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Call Flutterwave API v3 to verify transaction
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const transaction = response.data.data;

    // Verify status, currency and amount if needed for production security
    if (transaction.status === 'successful') {
      res.json({ status: 'success', transaction });
    } else {
      res.json({ status: 'failed', message: 'Transaction not successful' });
    }
  } catch (error: any) {
    console.error('Flutterwave Verify Payment Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || 'Internal Server Error' });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
