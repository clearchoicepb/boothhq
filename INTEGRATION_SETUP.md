# Integration Setup Guide

This guide will help you set up all the integrations for your ClearChoice Photo Booth CRM.

## Required Environment Variables

Add these to your `.env.local` file:

### Stripe Integration
```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

**Setup Steps:**
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add the keys to your environment variables

### Gmail Integration
```bash
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

**Setup Steps:**
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the app password (not your regular password) in the environment variable

### Company Information
```bash
COMPANY_NAME=ClearChoice Photo Booth
COMPANY_ADDRESS=Your Company Address
COMPANY_PHONE=(555) 123-4567
```

### QuickBooks Integration (Optional)
```bash
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
```

**Setup Steps:**
1. Create a QuickBooks Developer account
2. Create a new app in the QuickBooks Developer Dashboard
3. Configure OAuth settings
4. Get your Client ID and Client Secret

## Features Implemented

### ✅ Stripe Payment Processing
- Secure payment processing for invoices
- Payment intent creation and confirmation
- Automatic invoice status updates
- Payment tracking and history

### ✅ Gmail Email Integration
- Professional invoice emails
- PDF attachment support
- HTML email templates
- Automatic recipient detection

### ✅ PDF Generation
- Professional invoice PDFs
- Company branding
- Line item details
- Automatic calculations

### ✅ QuickBooks Sync
- Customer creation and management
- Invoice synchronization
- Automatic data mapping
- Error handling and retry logic

### ✅ Event-to-Invoice Generation
- Manual invoice creation from events
- Payment requirement options
- Automatic line item generation
- Tax calculation

### ✅ Payment Tracking
- Real-time payment status
- Balance calculations
- Payment history
- Overdue detection

## Usage Instructions

### Creating Invoices from Events
1. Go to any event detail page
2. Click "Generate Invoice" button
3. Choose between:
   - **Draft Invoice**: Creates invoice without requiring payment
   - **Payment Required**: Creates invoice and redirects to payment page

### Processing Payments
1. From invoice detail page, click "Pay with Stripe"
2. Enter card information
3. Payment is processed securely through Stripe
4. Invoice status updates automatically

### Sending Invoices via Email
1. From invoice detail page, click "Send Email"
2. Email is sent with PDF attachment
3. Invoice status updates to "sent"

### Syncing to QuickBooks
1. From invoice detail page, click "Sync QuickBooks"
2. Customer is created/updated in QuickBooks
3. Invoice is synced with QuickBooks ID

### Downloading PDFs
1. From invoice detail page, click "Download PDF"
2. Professional PDF is generated and downloaded

## Security Notes

- All API keys are stored securely in environment variables
- Stripe handles all payment processing securely
- Gmail uses app passwords for enhanced security
- QuickBooks uses OAuth 2.0 for secure authentication

## Troubleshooting

### Stripe Issues
- Verify your API keys are correct
- Check Stripe Dashboard for webhook events
- Ensure test/live mode matches your environment

### Gmail Issues
- Verify 2FA is enabled
- Use app password, not regular password
- Check Gmail security settings

### QuickBooks Issues
- Verify OAuth configuration
- Check client ID and secret
- Ensure redirect URI matches

### PDF Generation Issues
- Check company information in environment variables
- Verify invoice data is complete
- Check browser console for errors

## Support

For technical support or questions about the integrations, please refer to the respective service documentation:

- [Stripe Documentation](https://stripe.com/docs)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [QuickBooks API Documentation](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice)






