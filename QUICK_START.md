# Quick Start Guide

## For Developers

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create `.env` file with:

```env
# Firebase Configuration (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Sheets Integration (OPTIONAL)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Access Admin Panel
- URL: `http://localhost:3000/admin/login`
- Create admin user via Firebase Console

---

## For Admin Users

### Initial Setup (After Login)

#### 1. Configure Website Settings
**Go to: Admin Panel > Settings**

- **Hero Section Tab**
  - Upload or link hero image
  - Set website title
  - Set subtitle
  - Configure WhatsApp CTA button

- **Colors Tab**
  - Customize theme colors (or keep default leather theme)
  - All 6 colors can be changed

- **Contact Tab**
  - Add WhatsApp number (format: +213XXXXXXXXX)
  - Add phone number
  - Add email address
  - Add physical address

- **Company Tab**
  - Set company name (appears in navbar and footer)
  - Set footer description text

- **Google Sheets Tab** (OPTIONAL)
  - Follow setup guide if you want order sync
  - See `GOOGLE_SHEETS_SETUP.md` for details

#### 2. Add Your Brands
**Go to: Admin Panel > Marques (Brands)**

- Click "Nouvelle Marque"
- Add "Eleman Shoes" with logo
- Add "Edo's footwear" with logo
- Add any other brands

#### 3. Manage Products
**Go to: Admin Panel > Produits (Products)**

- Add products
- Assign to brands
- Set prices, sizes, colors
- Upload product images

#### 4. Monitor Orders
**Go to: Admin Panel > Commandes (Orders)**

- View all customer orders
- See order source (website/admin/whatsapp)
- Check Google Sheets sync status
- Update order status
- View customer details

---

## Testing the System

### Test Order Flow

1. **Place Test Order**
   - Go to website homepage
   - Browse catalog
   - Select a product
   - Click "Commander"
   - Fill checkout form
   - Submit order

2. **Verify Order Creation**
   - Check admin panel (Orders page)
   - Order should appear immediately
   - Status should be "Nouvelle"

3. **Verify Google Sheets Sync** (if configured)
   - Open your Google Sheet
   - New row should appear with order data
   - Check sync status in admin (green checkmark)

### Test Admin Settings

1. **Change Company Name**
   - Go to Settings > Company
   - Change company name
   - Save
   - Refresh homepage
   - Navbar should show new name

2. **Update Hero Section**
   - Go to Settings > Hero Section
   - Change title and subtitle
   - Save
   - Refresh homepage
   - Hero should show new content

3. **Test Theme Colors**
   - Go to Settings > Colors
   - Change primary color
   - Save
   - Refresh any page
   - Buttons and accents should use new color

---

## Common Tasks

### Add New Brand
1. Admin Panel > Marques
2. Click "Nouvelle Marque"
3. Enter brand name
4. Add logo URL (optional)
5. Click "Créer"

### Add New Product
1. Admin Panel > Produits
2. Click "Nouveau Produit"
3. Fill in product details
4. Select brand
5. Add sizes and colors
6. Upload images
7. Click "Créer"

### Update Order Status
1. Admin Panel > Commandes
2. Find the order
3. Click status dropdown
4. Select new status (Confirmée/Livrée/Annulée)
5. Status updates automatically

### View Order Details
1. Admin Panel > Commandes
2. Find the order
3. Click eye icon (👁️)
4. View full order details
5. See customer info, product, delivery, etc.

---

## Support & Documentation

- **Full Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **Google Sheets Setup**: See `GOOGLE_SHEETS_SETUP.md`
- **Code Documentation**: See inline comments in source files

---

## Important Notes

### Google Sheets Integration
- **OPTIONAL**: Website works perfectly without it
- Orders always save to Firestore (admin panel)
- Sheets sync is a bonus feature for external tracking
- Sheets failure does NOT block order creation

### Security
- Keep `.env` file secure and never commit it
- Change default Firebase settings
- Use strong passwords for admin accounts
- Regularly review audit logs

### Performance
- Images should be optimized before upload
- Use CDN for product images when possible
- Monitor database usage in Firebase console

### Backup
- Firebase handles automatic backups
- Export Google Sheet regularly if using sync
- Keep audit logs for compliance

---

## Need Help?

1. Check the documentation files
2. Review error messages in:
   - Browser console (F12)
   - Admin audit logs
   - Order sync status
3. Verify environment variables
4. Check Firebase console for errors

---

## Features at a Glance

### Customer Features
- Browse product catalog
- Filter by brand, category
- View product details
- Place orders with delivery tracking
- Automatic order confirmation

### Admin Features
- Complete website customization
- Multi-brand management
- Order management with status tracking
- Real-time order notifications
- Google Sheets integration (optional)
- Audit trail for all actions
- Delivery price management
- User role management

### Technical Features
- Server-side rendering (Next.js)
- Real-time database (Firebase)
- Type-safe code (TypeScript)
- Responsive design (Tailwind CSS)
- Component library (shadcn/ui)
- Google Sheets API integration
- Secure authentication
- Fail-safe operations

---

## Quick Reference

### URLs
- Website: `http://localhost:3000`
- Admin Login: `http://localhost:3000/admin/login`
- Catalog: `http://localhost:3000/catalog`
- Contact: `http://localhost:3000/contact`

### Default Admin Routes
- Dashboard: `/admin/dashboard`
- Products: `/admin/products`
- Brands: `/admin/brands`
- Orders: `/admin/orders`
- Settings: `/admin/settings`
- Audit Logs: `/admin/audit-logs`

### Key Collections (Firestore)
- `orders` - Customer orders
- `products` - Product catalog
- `brands` - Brand information
- `site_settings` - Website configuration
- `audit_logs` - Activity tracking

---

**Ready to Go!** 🚀

Your e-commerce platform is fully configured and ready to accept orders. Start by configuring your settings, adding brands, and uploading products!
