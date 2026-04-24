import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

/**
 * Flutter Payment Integration with Flutterwave
 * This class handles calling the Node.js backend to create a payment link
 * and then opening it in a browser.
 */
class FlutterwavePaymentService {
  // Replace with your actual backend URL (e.g., https://your-app.run.app)
  final String backendUrl = 'https://ais-dev-iyowtwzb7g7drty6tm6y5k-65300060839.europe-west3.run.app';

  /**
   * Step 1: Request a payment link from the backend
   */
  Future<String?> createPayment({
    required double amount,
    required String currency,
    required String email,
    required String name,
    required String txRef,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$backendUrl/api/create-payment'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'amount': amount,
          'currency': currency,
          'customer_email': email,
          'customer_name': name,
          'tx_ref': txRef,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['payment_link'];
      } else {
        print('Error creating payment: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Network error: $e');
      return null;
    }
  }

  /**
   * Step 2: Verify the payment after the user returns
   */
  Future<bool> verifyPayment(String transactionId) async {
    try {
      final response = await http.get(
        Uri.parse('$backendUrl/api/verify-payment/$transactionId'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['status'] == 'success';
      }
      return false;
    } catch (e) {
      print('Verification error: $e');
      return false;
    }
  }
}

/**
 * Example UI Widget
 */
class PaymentButton extends StatefulWidget {
  @override
  _PaymentButtonState createState() => _PaymentButtonState();
}

class _PaymentButtonState extends State<PaymentButton> {
  final _paymentService = FlutterwavePaymentService();
  bool _isLoading = false;

  Future<void> _handlePayment() async {
    setState(() => _isLoading = true);

    // 1. Create payment link
    final paymentLink = await _paymentService.createPayment(
      amount: 5000, // Example amount in UGX
      currency: 'UGX',
      email: 'customer@example.com',
      name: 'John Doe',
      txRef: 'sale_${DateTime.now().millisecondsSinceEpoch}',
    );

    setState(() => _isLoading = false);

    if (paymentLink != null) {
      // 2. Open payment link in browser
      final uri = Uri.parse(paymentLink);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        
        // Note: In a real app, you would listen for a deep link callback 
        // or use a WebView to detect the redirect and then call verifyPayment.
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to initialize payment')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: _isLoading ? null : _handlePayment,
      child: _isLoading 
        ? CircularProgressIndicator() 
        : Text('Pay Now'),
    );
  }
}
