'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  fr: {
    home: 'Accueil',
    catalog: 'Catalogue',
    brands: 'Marques',
    contact: 'Contact',
    order: 'Commander',
    whatsapp_order: 'Commander via WhatsApp',
    view_details: 'Voir détails',
    price: 'Prix',
    category: 'Catégorie',
    brand: 'Marque',
    sizes: 'Pointures',
    description: 'Description',
    stock: 'Stock',
    available: 'Disponible',
    unavailable: 'Non disponible',
    checkout: 'Finaliser la commande',
    full_name: 'Nom complet',
    phone: 'Téléphone',
    wilaya: 'Wilaya',
    city: 'Commune',
    address: 'Adresse détaillée',
    quantity: 'Quantité',
    notes: 'Notes (optionnel)',
    delivery_price: 'Frais de livraison',
    total: 'Total',
    submit_order: 'Confirmer la commande',
    order_success: 'Commande enregistrée avec succès',
    order_number: 'Numéro de commande',
    continue_whatsapp: 'Continuer sur WhatsApp',
    featured_products: 'Produits en vedette',
    all_products: 'Tous les produits',
    search: 'Rechercher',
    filter: 'Filtrer',
    sort: 'Trier',
    no_products: 'Aucun produit trouvé',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    add: 'Ajouter',
    back: 'Retour',
    admin_panel: "Panneau d'administration",
    dashboard: 'Tableau de bord',
    products: 'Produits',
    orders: 'Commandes',
    categories: 'Catégories',
    delivery: 'Livraison',
    settings: 'Paramètres',
    users: 'Utilisateurs',
    audit_logs: "Journaux d'audit",
    invoices: 'Factures',
    login: 'Connexion',
    logout: 'Déconnexion',
    email: 'Email',
    password: 'Mot de passe',
    welcome_back: 'Bon retour',
    sign_in: 'Se connecter',
  },
  ar: {
    home: 'الرئيسية',
    catalog: 'الكتالوج',
    brands: 'العلامات التجارية',
    contact: 'اتصل بنا',
    order: 'اطلب',
    whatsapp_order: 'اطلب عبر واتساب',
    view_details: 'عرض التفاصيل',
    price: 'السعر',
    category: 'الفئة',
    brand: 'العلامة التجارية',
    sizes: 'المقاسات',
    description: 'الوصف',
    stock: 'المخزون',
    available: 'متوفر',
    unavailable: 'غير متوفر',
    checkout: 'إتمام الطلب',
    full_name: 'الاسم الكامل',
    phone: 'الهاتف',
    wilaya: 'الولاية',
    city: 'البلدية',
    address: 'العنوان التفصيلي',
    quantity: 'الكمية',
    notes: 'ملاحظات (اختياري)',
    delivery_price: 'رسوم التوصيل',
    total: 'المجموع',
    submit_order: 'تأكيد الطلب',
    order_success: 'تم تسجيل الطلب بنجاح',
    order_number: 'رقم الطلب',
    continue_whatsapp: 'متابعة على واتساب',
    featured_products: 'منتجات مميزة',
    all_products: 'جميع المنتجات',
    search: 'بحث',
    filter: 'تصفية',
    sort: 'ترتيب',
    no_products: 'لم يتم العثور على منتجات',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجح',
    cancel: 'إلغاء',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    back: 'رجوع',
    admin_panel: 'لوحة الإدارة',
    dashboard: 'لوحة القيادة',
    products: 'المنتجات',
    orders: 'الطلبات',
    categories: 'الفئات',
    delivery: 'التوصيل',
    settings: 'الإعدادات',
    users: 'المستخدمون',
    audit_logs: 'سجلات التدقيق',
    invoices: 'الفواتير',
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    welcome_back: 'مرحباً بعودتك',
    sign_in: 'تسجيل الدخول',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'fr';
    }
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
