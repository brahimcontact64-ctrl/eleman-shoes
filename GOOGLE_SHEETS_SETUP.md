# Google Sheets Integration Setup Guide

This guide will help you set up the Google Sheets integration for automatic order synchronization.

## Prerequisites

- A Google Cloud Platform account
- Access to Google Cloud Console
- A Google Sheets spreadsheet for storing orders

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your project ID

## Step 2: Enable Google Sheets API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Sheets API"
3. Click on it and press **Enable**

## Step 3: Create a Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the service account details:
   - Name: `eleman-shoes-sheets` (or any name you prefer)
   - Description: `Service account for syncing orders to Google Sheets`
4. Click **Create and Continue**
5. Skip the optional steps and click **Done**

## Step 4: Generate Service Account Key

1. In the Credentials page, find your newly created service account
2. Click on it to open the details
3. Go to the **Keys** tab
4. Click **Add Key** > **Create New Key**
5. Choose **JSON** format
6. Click **Create** - a JSON file will be downloaded

## Step 5: Extract Credentials from JSON

Open the downloaded JSON file. You'll need two values:

```json
{
  "client_email": "your-service-account@project-id.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

## Step 6: Add Environment Variables

Add these to your `.env` file:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT**: Keep the `\n` characters in the private key exactly as they are.

## Step 7: Create Google Sheet

1. Create a new Google Sheet or use an existing one
2. In the first row, add these column headers:

   | A | B | C | D | E | F | G | H | I | J | K | L | M | N |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|---|
   | N° Commande | Date & Heure | Nom Client | Téléphone | Wilaya | Commune | Produit | Marque | Pointure | Couleur | Quantité | Frais de livraison | Total | Statut |

3. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

## Step 8: Share Sheet with Service Account

1. Click the **Share** button in your Google Sheet
2. Paste the service account email (from step 5)
3. Give it **Editor** permissions
4. Uncheck "Notify people" (it's a service account, not a person)
5. Click **Share**

## Step 9: Configure in Admin Panel

1. Log in to your admin panel at `/admin/login`
2. Go to **Settings** > **Google Sheets** tab
3. Enable synchronization
4. Enter your Spreadsheet ID
5. Enter the sheet name (default: "Orders")
6. Click **Save Settings**

## Step 10: Test the Integration

1. Go to your website and place a test order
2. Check your Google Sheet - a new row should appear automatically
3. Check the admin orders page to see the sync status

## Troubleshooting

### Error: "Permission denied"
- Make sure you shared the Google Sheet with the service account email
- Verify the email is correct in your `.env` file

### Error: "Invalid credentials"
- Check that the private key is correctly formatted with `\n` characters
- Make sure there are no extra spaces or line breaks in the `.env` file

### Error: "Spreadsheet not found"
- Verify the Spreadsheet ID is correct
- Make sure the sheet is shared with the service account

### Orders not syncing
- Check that Google Sheets sync is enabled in admin settings
- Verify environment variables are set correctly
- Look at the admin orders page for sync status and error messages

## Data Flow

```
Customer submits order
    ↓
Order saved to Firestore (Admin Panel)
    ↓
API triggers Google Sheets sync
    ↓
New row added to Google Sheet
    ↓
Sync status updated in Firestore
```

## Security Notes

- Never commit `.env` files to version control
- Keep your service account key secure
- Only share the Google Sheet with the service account (not publicly)
- Use read-only access if you only need to view orders in Sheets

## Support

If you need help with setup, check:
- Google Cloud Console error logs
- Browser console for frontend errors
- Next.js server logs for API errors
- Admin audit logs for order creation events
