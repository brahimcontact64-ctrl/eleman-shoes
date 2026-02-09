import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '@/lib/types';
import { formatPrice, formatDate } from '@/lib/firebase/utils';

export async function generateInvoicePDF(
  order: Order,
  invoiceNumber: string,
  logoUrl?: string
): Promise<Blob> {
  const doc = new jsPDF();

  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', 15, 10, 40, 20);
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }

  doc.setFontSize(20);
  doc.text('FACTURE', 150, 20);

  doc.setFontSize(10);
  doc.text('Facture N: ' + invoiceNumber, 150, 30);
  doc.text('Commande N: ' + order.orderNumber, 150, 36);
  doc.text('Date: ' + formatDate(order.createdAt), 150, 42);

  doc.setFontSize(12);
  doc.text('Informations Client', 15, 50);
  doc.setFontSize(10);
  doc.text('Nom: ' + order.customer.fullName, 15, 58);
  doc.text('Téléphone: ' + order.customer.phone, 15, 64);
  doc.text('Adresse: ' + order.customer.addressDetails, 15, 70);
  doc.text('Commune: ' + order.customer.city, 15, 76);
  doc.text('Wilaya: ' + order.customer.wilaya, 15, 82);

const deliveryTypeLabel =
  order.delivery.type === 'home' ? 'Domicile' : 'Stop Desk';
  const deliveryInfo = `${deliveryTypeLabel} (${order.delivery.delayDays || 1} jour${(order.delivery.delayDays || 1) > 1 ? 's' : ''})`;

  doc.setFontSize(12);
  doc.text('Détails du Produit', 15, 95);
  doc.setFontSize(10);
  doc.text('Produit: ' + order.product.name, 15, 103);
  doc.text('Marque: ' + (order.product.brandName || ''), 15, 109);
doc.text(
  'Pointure: ' + (order.variant?.size ?? '—'),
  15,
  115
);

doc.text(
  'Couleur: ' + (order.variant?.colorName ?? '—'),
  15,
  125
);

  autoTable(doc, {
    startY: 130,
    head: [['Description', 'Prix unitaire', 'Quantité', 'Total']],
    body: [
      [
        order.product.name,
        formatPrice(order.product.price),
        order.quantity.toString(),
        formatPrice(order.product.price * order.quantity),
      ],
      [
        `Livraison - ${deliveryInfo}`,
        formatPrice(order.delivery.price),
        '1',
        formatPrice(order.delivery.price),
      ],
    ],
    foot: [['', '', 'TOTAL', formatPrice(order.total)]],
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [139, 92, 50] },
    footStyles: { fillColor: [200, 200, 200], fontStyle: 'bold' },
  });

  return doc.output('blob');
}
