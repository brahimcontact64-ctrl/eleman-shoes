import { Timestamp } from 'firebase/firestore';

/* =========================
   USERS & AUTH
========================= */

export type UserRole = 'admin' | 'worker';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions?: {
    canManageProducts: boolean;
    canManageOrders: boolean;
    canManageInvoices: boolean;
  };
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* =========================
   CATALOG CORE
========================= */

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ShoeSize {
  id: string;
  value: number; // 36 → 45
  isActive: boolean;
  order: number;
}

export interface ShoeColor {
  image: any;
  id: string;
  name: string;
  hexCode?: string;
  isActive: boolean;
  order: number;
}

/* =========================
   PRODUCT – IMAGES
========================= */

export interface ProductColorImage {
  url: string;
  alt?: string;
}

/* =========================
   PRODUCT – STOCK
========================= */

/** مخزون مقاس واحد داخل لون */
export interface ProductSizeStock {
  stock: any;
  size: number;        // مثال: 42
  quantity: number;    // الكمية
}

/** لون داخل المنتج */
export interface ProductColor {
  colorId: string;
  name: string;
  hexCode?: string;

  /** صور خاصة باللون */
  images: ProductColorImage[];

  /** 🔥 مقاسات + كميات (المعتمد فعليًا) */
  sizes: ProductSizeStock[];
}

/** Variant (اختياري – دعم قديم / مستقبلي) */
export interface ProductVariant {
  size: number;
  colorId: string;
  stock: number;
  sku?: string;
}

/* =========================
   PRODUCT
========================= */

export interface Product {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  price: number;

  /** legacy (لا نلمسه) */
  sizes?: number[];

  /** 🔥 ألوان + صور + مخزون */
  colors: ProductColor[];

  /** اختياري */
  variants?: ProductVariant[];

  description?: string;

  /** legacy */
  images?: string[];

  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* =========================
   ORDERS
========================= */

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;

  customer: {
    fullName: string;
    phone: string;
    wilaya: string;
    city: string;
    addressDetails: string;
  };

  product: {
    id: string;
    name: string;
    price: number;
    brandId: string;
    brandName?: string;
    image?: string;
  };

  /** 🔥 الاختيار الحقيقي */
  selectedSize: number;

  selectedColor?: {
    colorId: string;
    name: string;
    hexCode?: string;
    image?: string;
  };

  quantity: number;

  delivery: {
    wilaya?: string;
    city?: string;
    wilayaNameFr?: string;
    wilayaNameAr?: string;
    cityNameFr?: string;
    cityNameAr?: string;
    deliveryType?: 'home' | 'stopdesk';
    price: number;
    delayDays?: number;
    fullAddress?: string;
  };

  total: number;
  notes?: string;
  status: OrderStatus;
  source: 'website' | 'admin' | 'whatsapp';

  googleSheets: {
    synced: boolean;
    syncedAt?: Timestamp;
    error?: string;
  };

  invoice?: {
    id: string;
    number: string;
    generatedAt: Timestamp;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* =========================
   INVOICES
========================= */

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerName: string;
  pdfUrl: string;
  total: number;
  generatedBy: string;
  createdAt: Timestamp;
}

/* =========================
   DELIVERY
========================= */

export interface DeliveryCity {
  name: string;
  price: number;
}

export interface DeliveryWilaya {
  code: string;
  name: string;
  cities: DeliveryCity[];
}

export interface DeliveryZone {
  city: string;
  wilaya: string;
  zone: number;
  delay: number;
  home: number;
  stopdesk: number;
  return: number;
}

/* =========================
   SETTINGS
========================= */

export interface SiteSettings {
  logo?: string;
  logoSize: 'small' | 'medium' | 'large';
  primaryColor: string;
  secondaryColor: string;
  favicon?: string;

  hero: {
    title: string;
    subtitle: string;
    type: 'image' | 'video';
    mediaUrl: string;
    ctaLabel: string;
    ctaWhatsApp: string;
  };

  contact: {
    phone: string;
    whatsapp: string;
    facebook?: string;
    instagram?: string;
    email?: string;
  };

  googleSheets?: {
    enabled: boolean;
    spreadsheetId: string;
    sheetName: string;
  };
}

/* =========================
   AUDIT LOGS
========================= */

export type ActorType = 'admin' | 'worker' | 'customer';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_DELETE'
  | 'CATEGORY_CREATE'
  | 'CATEGORY_UPDATE'
  | 'CATEGORY_DELETE'
  | 'SIZE_CREATE'
  | 'SIZE_UPDATE'
  | 'SIZE_DISABLE'
  | 'COLOR_CREATE'
  | 'COLOR_UPDATE'
  | 'COLOR_DISABLE'
  | 'DELIVERY_UPDATE'
  | 'ORDER_STATUS_UPDATE'
  | 'INVOICE_GENERATED'
  | 'INVOICE_DOWNLOADED'
  | 'INVOICE_PRINTED'
  | 'SETTINGS_UPDATE'
  | 'USER_CREATE'
  | 'DELIVERY_INITIALIZE'
  | 'USER_ROLE_UPDATE'
  | 'USER_DISABLE'
  | 'CUSTOMER_ORDER_CREATED';

export type TargetType =
  | 'product'
  | 'category'
  | 'size'
  | 'color'
  | 'order'
  | 'invoice'
  | 'delivery'
  | 'settings'
  | 'user';

export interface AuditLog {
  id: string;
  actorType: ActorType;
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: TargetType;
  targetId: string;
  details?: any;
  timestamp: Timestamp;
  metadata?: {
    ip?: string;
    userAgent?: string;
  };
}