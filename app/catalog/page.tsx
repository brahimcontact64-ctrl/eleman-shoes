'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product, Brand, Category } from '@/lib/types';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import ProductCard from '@/components/ProductCard';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { useLanguage } from '@/contexts/LanguageContext';
import { Search } from 'lucide-react';

export default function CatalogPage() {

  const { t } = useLanguage();

  const [products,setProducts] = useState<Product[]>([]);

  const [brands,setBrands] = useState<Map<string,Brand>>(new Map());
  const [categories,setCategories] = useState<Category[]>([]);

  const [loading,setLoading] = useState(true);
  const [promotions,setPromotions] = useState<any>({})


  const [searchTerm,setSearchTerm] = useState('');
  const [filterBrand,setFilterBrand] = useState('all');
  const [filterCategory,setFilterCategory] = useState('all');

  useEffect(()=>{
    fetchData();
  },[]);

  /* ================= FETCH DATA ================= */

  const fetchData = useCallback(async()=>{

    try{
      const cacheKey = 'catalog_data_v1';
      const cacheRaw = typeof window !== 'undefined'
        ? sessionStorage.getItem(cacheKey)
        : null;

      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw);
        const isFresh = Date.now() - cache.timestamp < 1000 * 60 * 5;

        if (isFresh) {
          setProducts(cache.products || []);
          setCategories(cache.categories || []);
          setPromotions(cache.promotions || {});
          setBrands(new Map(cache.brands || []));
          setLoading(false);
          return;
        }
      }

      const productsQuery = query(
        collection(db,'products'),
        where('isActive','==',true),
        orderBy('createdAt','desc')
      );

      /* تحميل البيانات معاً لتحسين السرعة */
const [
  brandsSnapshot,
  categoriesSnapshot,
  productsSnapshot,
  promotionsSnapshot // 🔥 جديد
] = await Promise.all([
  getDocs(collection(db,'brands')),
  getDocs(collection(db,'categories')),
  getDocs(productsQuery),
  getDocs(
    query(
      collection(db,'promotions'),
      where('active','==',true)
    )
  )
]);
const promotionsMap:any = {}

promotionsSnapshot.forEach(doc=>{
  const data = doc.data()

  if(data?.productId){
    promotionsMap[data.productId] = {
      id: doc.id,
      ...data
    }
  }
})

setPromotions(promotionsMap)
      /* ================= BRANDS ================= */

      const brandsMap = new Map<string,Brand>();

      brandsSnapshot.forEach((doc)=>{
        brandsMap.set(
          doc.id,
          {id:doc.id,...doc.data()} as Brand
        );
      });

      setBrands(brandsMap);

      /* ================= CATEGORIES ================= */

      const categoriesData = categoriesSnapshot.docs.map((doc)=>({
        id:doc.id,
        ...doc.data()
      })) as Category[];

      setCategories(categoriesData);

      /* ================= PRODUCTS ================= */

      const productsData = productsSnapshot.docs.map((doc)=>({
        id:doc.id,
        ...doc.data()
      })) as Product[];

      setProducts(productsData);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            timestamp: Date.now(),
            products: productsData,
            categories: categoriesData,
            promotions: promotionsMap,
            brands: Array.from(brandsMap.entries()),
          })
        );
      }

    }catch(error){

      console.error('Error fetching data:',error);

    }finally{

      setLoading(false);

    }

  },[]);

  /* ================= FILTER ================= */

  const filteredProducts = useMemo(()=>{
    const lowerSearchTerm = searchTerm.toLowerCase();

    return products.filter((p)=>{

      if(
        searchTerm &&
        !p.name.toLowerCase().includes(lowerSearchTerm)
      ){
        return false;
      }

      if(
        filterBrand !== 'all' &&
        p.brandId !== filterBrand
      ){
        return false;
      }

      if(
        filterCategory !== 'all' &&
        p.categoryId !== filterCategory
      ){
        return false;
      }

      return true;

    });

  },[
    searchTerm,
    filterBrand,
    filterCategory,
    products
  ]);

  const brandOptions = useMemo(
    ()=>Array.from(brands.values()),
    [brands]
  );

  if(loading){

    return(

      <div className="flex items-center justify-center min-h-screen bg-leather-beige">

        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leather-brown"/>

      </div>

    );

  }

  return(

    <>

      <Navbar/>

      <main className="min-h-screen bg-leather-beige">

        <div className="container mx-auto px-4 py-8">

          <h1 className="text-4xl font-bold mb-8 text-leather-dark">

            {t('all_products')}

          </h1>

          <div className="bg-white rounded-lg shadow-md p-4 mb-8 border border-leather-light/20">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="relative">

                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>

                <Input
                  placeholder={t('search')}
                  value={searchTerm}
                  onChange={(e)=>setSearchTerm(e.target.value)}
                  className="pl-10"
                />

              </div>

              <Select
                value={filterBrand}
                onValueChange={setFilterBrand}
              >

                <SelectTrigger>

                  <SelectValue placeholder={t('filter')}/>

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="all">

                    Toutes les marques

                  </SelectItem>

                  {brandOptions.map((brand)=>(

                    <SelectItem
                      key={brand.id}
                      value={brand.id}
                    >
                      {brand.name}
                    </SelectItem>

                  ))}

                </SelectContent>

              </Select>

              <Select
                value={filterCategory}
                onValueChange={setFilterCategory}
              >

                <SelectTrigger>

                  <SelectValue placeholder={t('filter')}/>

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="all">

                    Toutes les catégories

                  </SelectItem>

                  {categories.map((category)=>(

                    <SelectItem
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </SelectItem>

                  ))}

                </SelectContent>

              </Select>

            </div>

          </div>

          {filteredProducts.length === 0 ? (

            <div className="text-center py-12">

              <p className="text-xl text-gray-600">

                {t('no_products')}

              </p>

            </div>

          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              {filteredProducts.map((product)=>(

                <ProductCard
  key={product.id}
  product={product}
  brand={brands.get(product.brandId)}
  promotion={promotions?.[product.id]} 
/>
              ))}

            </div>

          )}

        </div>

      </main>

      <Footer/>
      <WhatsAppButton/>

    </>

  );

}
