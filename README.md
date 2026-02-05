# Eleman Shoes - E-commerce Platform

Complete production-ready e-commerce system for Algeria wholesale shoes with integrated admin panel.

## 🎯 Features

### Public Website
- **Home Page**: Hero section with video/image, featured products, brand showcase
- **Product Catalog**: Search, filters, brand pages
- **Product Details**: Image gallery, sizes, descriptions
- **Checkout System**: Complete order form with dynamic delivery pricing
- **Multilingual**: French/Arabic with RTL support
- **Contact Page**: WhatsApp, phone, social media integration

### Admin Panel (/admin)
- **Dashboard**: Real-time KPIs and activity tracking
- **Products Management**: Full CRUD with image uploads
- **Categories Management**: Create and organize categories
- **Orders Management**: Track and update order status
- **Invoices**: PDF generation, download, WhatsApp sharing
- **Delivery Management**: 48 Algeria wilayas with city-specific pricing
- **Site Settings**: Logo, colors, hero customization
- **User Management**: Create admin/worker accounts with permissions
- **Audit Logs**: Complete activity tracking system

## 🛠️ Tech Stack

- **Frontend**: Next.js 13 (App Router), TypeScript, Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **PDF Generation**: jsPDF
- **UI Components**: shadcn/ui, Radix UI
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase project (create at [Firebase Console](https://console.firebase.google.com))

## 🚀 Setup Instructions

### 1. Clone and Install

```bash
# Install dependencies
npm install

# Install seed script dependencies
cd scripts
npm install
cd ..
```

### 2. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** (Email/Password)
4. Enable **Firestore Database**
5. Enable **Storage**

#### Get Firebase Credentials
1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Click "Web app" icon to create web app
4. Copy the configuration values

### 3. Environment Variables

Update `.env` file with your Firebase credentials:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Firestore Security Rules

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules
```

### 5. Seed Database

```bash
cd scripts
npm run seed
```

This will populate:
- 2 Brands (Eleman Shoes, Edo's Footwear)
- 5 Categories
- 10 Sample products
- 48 Algeria wilayas with delivery prices
- Site settings

### 6. Create Admin User

#### Via Firebase Console
1. Go to Firebase Console > Authentication
2. Add user with email/password
3. Copy the user UID
4. Go to Firestore Database
5. Create document in `users` collection:

```json
{
  "uid": "user_uid_from_auth",
  "email": "admin@elemanshoes.dz",
  "displayName": "Admin Name",
  "role": "admin",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 7. Run Development Server

```bash
npm run dev
```

Visit:
- **Public Site**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/login

## 📁 Project Structure

```
├── app/
│   ├── (public pages)
│   │   ├── page.tsx              # Home
│   │   ├── catalog/page.tsx      # Product catalog
│   │   ├── product/[slug]/       # Product details
│   │   ├── checkout/[id]/        # Checkout form
│   │   ├── contact/page.tsx      # Contact page
│   │   └── brands/[slug]/        # Brand pages
│   ├── admin/
│   │   ├── login/                # Admin login
│   │   ├── dashboard/            # Admin dashboard
│   │   ├── products/             # Products management
│   │   ├── categories/           # Categories management
│   │   ├── orders/               # Orders management
│   │   ├── invoices/             # Invoices & PDF generation
│   │   ├── delivery/             # Delivery prices
│   │   ├── settings/             # Site settings
│   │   ├── users/                # User management
│   │   └── audit-logs/           # Activity logs
│   └── layout.tsx                # Root layout
├── components/
│   ├── admin/                    # Admin components
│   ├── ui/                       # UI components (shadcn)
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx
│   └── WhatsAppButton.tsx
├── contexts/
│   ├── AuthContext.tsx           # Authentication
│   └── LanguageContext.tsx       # Multilingual
├── lib/
│   ├── firebase/
│   │   ├── config.ts             # Firebase setup
│   │   ├── utils.ts              # Utilities
│   │   └── audit.ts              # Audit logging
│   ├── pdf/
│   │   └── invoice.ts            # PDF generation
│   └── types/
│       └── index.ts              # TypeScript types
├── scripts/
│   ├── seed.ts                   # Database seeding
│   ├── seed-data.json            # Seed data
│   └── algeria-wilayas.json      # Wilayas data
└── firestore.rules               # Security rules
```

## 🔐 User Roles & Permissions

### Admin
- Full access to all features
- Manage users, settings, delivery prices
- View audit logs

### Worker
- Configurable permissions:
  - `canManageProducts`: Create/edit products
  - `canManageOrders`: View/update orders
  - `canManageInvoices`: Generate invoices

## 📊 Data Model

### Collections
- `users` - User accounts with roles
- `brands` - Eleman Shoes, Edo's Footwear
- `products` - Product catalog
- `categories` - Product categories
- `orders` - Customer orders
- `invoices` - Generated invoices
- `delivery_wilayas` - Algeria delivery prices
- `site_settings` - Customizable settings
- `audit_logs` - Activity tracking

## 🎨 Customization

### Site Settings (Admin Panel)
- Upload logo
- Change colors
- Customize hero section
- Update contact information

### Adding Products
1. Login to admin panel
2. Go to Products > New Product
3. Fill form and upload images
4. Save

### Managing Delivery Prices
1. Go to Delivery Management
2. Select wilaya
3. Update city prices
4. Save

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

### Other Platforms
The app is a standard Next.js application and can be deployed to:
- Netlify
- AWS Amplify
- Google Cloud Run
- Any Node.js hosting

## 📝 Important Notes

### Security
- All sensitive operations are protected by authentication
- Firestore security rules enforce access control
- Audit logs track all admin/worker actions

### Data Safety
- Customer orders are tracked in audit logs
- Order creation is public (no auth required)
- All admin actions are logged with timestamps

### Performance
- Images optimized with Next.js Image component
- Static pages where possible
- Server-side rendering for dynamic content

## 🐛 Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Firebase Connection Issues
- Verify environment variables are correct
- Check Firebase project settings
- Ensure all Firebase services are enabled

### Seed Script Fails
- Verify Firebase credentials
- Check internet connection
- Ensure Firestore is enabled

## 📞 Support

For issues or questions:
- Check Firebase Console for error logs
- Review Firestore security rules
- Check browser console for client errors

## 📄 License

Private and proprietary - All rights reserved.

---

**Built with ❤️ for Eleman Shoes**
