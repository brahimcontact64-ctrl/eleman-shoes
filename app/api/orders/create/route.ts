import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    /* ================= VALIDATION ================= */

    const {
      product,
      customer,
      variant,
      quantity,
      delivery,
      total,
      notes,
    } = body;

    if (
      !product?.id ||
      !variant?.colorId ||
      !variant?.size ||
      !customer?.fullName ||
      !customer?.phone ||
      !customer?.wilaya ||
      !customer?.addressDetails ||
      !quantity ||
      quantity <= 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid order data' },
        { status: 400 }
      );
    }

    /* ================= GET PRODUCT ================= */

    const productRef = adminDb.collection('products').doc(product.id);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const productData = productSnap.data();

    /* ================= FIND COLOR ================= */

    const color = productData?.colors?.find(
      (c: any) => c.colorId === variant.colorId
    );

    if (!color) {
      return NextResponse.json(
        { success: false, error: 'Color not found' },
        { status: 400 }
      );
    }

    /* ================= FIND SIZE ================= */

    const sizeEntry = color.sizes?.find(
      (s: any) => Number(s.size) === Number(variant.size)
    );

    if (!sizeEntry) {
      return NextResponse.json(
        { success: false, error: 'Size not found' },
        { status: 400 }
      );
    }

    if (sizeEntry.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Only ${sizeEntry.stock} items available`,
        },
        { status: 400 }
      );
    }

    /* ================= CREATE ORDER ================= */

    const orderNumber = `ORD-${Date.now()}`;

    const orderData = {
      orderNumber,

      product: {
        id: product.id,
        name: product.name,
        brandId: product.brandId,
        brandName: product.brandName,
        price: product.price,
        image: product.image,
      },

      variant: {
        colorId: variant.colorId,
        colorName: variant.colorName,
        size: variant.size,
      },

      quantity,

      customer: {
        fullName: customer.fullName,
        phone: customer.phone,
        wilaya: customer.wilaya,
        city: customer.city || '',
        addressDetails: customer.addressDetails,
      },

      delivery: {
        type: delivery?.type || 'home',
        price: delivery?.price || 0,
        delay: delivery?.delay || null,
      },

      notes: notes || '',
      total,

      status: 'new',
      paymentStatus: 'cash_on_delivery',
      source: 'website',

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const orderRef = await adminDb
      .collection('orders')
      .add(orderData);

    /* ================= DECREMENT STOCK ================= */

    await productRef.update({
      colors: productData.colors.map((c: any) => {
        if (c.colorId !== variant.colorId) return c;

        return {
          ...c,
          sizes: c.sizes.map((s: any) =>
            Number(s.size) === Number(variant.size)
              ? { ...s, stock: s.stock - quantity }
              : s
          ),
        };
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    /* ================= AUDIT ================= */

    await adminDb.collection('audit_logs').add({
      actorType: 'customer',
      actorId: 'anonymous',
      actorName: customer.fullName,
      action: 'CUSTOMER_ORDER_CREATED',
      targetType: 'order',
      targetId: orderRef.id,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      orderId: orderRef.id,
      orderNumber,
    });
  } catch (error: any) {
    console.error('ORDER CREATE ERROR:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}