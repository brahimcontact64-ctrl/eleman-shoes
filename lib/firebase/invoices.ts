import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import { Order } from '@/lib/types';
import { generateInvoicePDF } from '@/lib/pdf/invoice';

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerSnapshot: {
    fullName: string;
    phone: string;
    wilaya: string;
    city: string;
    addressDetails: string;
  };
  productSnapshot: {
    id: string;
    name: string;
    brandName: string;
    price: number;
  };
  deliverySnapshot: {
    wilayaNameFr?: string;
    wilayaNameAr?: string;
    cityNameFr?: string;
    cityNameAr?: string;
    deliveryType?: 'home' | 'stopdesk';
    price: number;
    delayDays?: number;
    fullAddress?: string;
  };
  orderDetails: {
    size: number;
    color: string;
    quantity: number;
  };
  totals: {
    subtotal: number;
    delivery: number;
    total: number;
  };
  pdfUrl: string;
  createdAt: any;
  createdBy: {
    uid: string;
    name: string;
    role: string;
  };
}

export async function generateInvoice(
  order: Order,
  createdBy: { uid: string; name: string; role: string },
  logoUrl?: string
): Promise<Invoice> {
  const invoiceNumber = `INV-${Date.now()}`;

  const pdfBlob = await generateInvoicePDF(order, invoiceNumber, logoUrl);

  const storageRef = ref(storage, `invoices/${invoiceNumber}.pdf`);
  await uploadBytes(storageRef, pdfBlob);
  const pdfUrl = await getDownloadURL(storageRef);

  const invoice: Invoice = {
    invoiceNumber,
    orderId: order.id!,
    orderNumber: order.orderNumber,
    customerSnapshot: {
      fullName: order.customer.fullName,
      phone: order.customer.phone,
      wilaya: order.customer.wilaya,
      city: order.customer.city,
      addressDetails: order.customer.addressDetails,
    },
    productSnapshot: {
      id: order.product.id,
      name: order.product.name,
      brandName: order.product.brandName || '',
      price: order.product.price,
    },
    deliverySnapshot: {
      wilayaNameFr: order.delivery.wilayaNameFr,
      wilayaNameAr: order.delivery.wilayaNameAr,
      cityNameFr: order.delivery.cityNameFr,
      cityNameAr: order.delivery.cityNameAr,
      deliveryType: order.delivery.deliveryType,
      price: order.delivery.price,
      delayDays: order.delivery.delayDays,
      fullAddress: order.delivery.fullAddress,
    },
    orderDetails: {
      size: order.selectedSize,
     color: order.selectedColor ? order.selectedColor.name : '—',
      quantity: order.quantity,
    },
    totals: {
      subtotal: order.product.price * order.quantity,
      delivery: order.delivery.price,
      total: order.total,
    },
    pdfUrl,
    createdAt: serverTimestamp(),
    createdBy,
  };

  const invoiceRef = doc(collection(db, 'invoices'));
  await setDoc(invoiceRef, invoice);

  await setDoc(
    doc(db, 'orders', order.id!),
    {
      invoice: {
        id: invoiceRef.id,
        number: invoiceNumber,
        generatedAt: serverTimestamp(),
      },
    },
    { merge: true }
  );

  return { ...invoice, id: invoiceRef.id };
}

export async function getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists() || !orderDoc.data().invoice) {
      return null;
    }

    const invoiceId = orderDoc.data().invoice.id;
    const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));

    if (!invoiceDoc.exists()) {
      return null;
    }

    return { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
  try {
    const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));

    if (!invoiceDoc.exists()) {
      return null;
    }

    return { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
}
