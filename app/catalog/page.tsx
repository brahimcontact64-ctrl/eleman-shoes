'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product, Brand, Category } from '@/lib/types';
import { getOptimizedImage } from '@/lib/cloudinary';

import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

const Navbar = dynamic(() => import('@/components/Navbar'));
const Footer = dynamic(() => import('@/components/Footer'));

const WhatsAppButton = dynamic(() => import('@/components/WhatsAppButton'), {
  ssr: false,
});

const REVALIDATE_MS = 60 * 1000;

export default function CatalogPage() {

  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [products,setProducts] = useState<Product[]>([]);

  const [brands,setBrands] = useState<Map<string,Brand>>(new Map());
  const [categories,setCategories] = useState<Category[]>([]);

  const [loading,setLoading] = useState(true);
  const [promotions,setPromotions] = useState<any>({})


  const [searchTerm,setSearchTerm] = useState('');
  const [searchInput,setSearchInput] = useState('');
  const [filterBrand,setFilterBrand] = useState('all');
  const [filterCategory,setFilterCategory] = useState('all');

  const normalizeCategoryKey = useCallback(
    (value: string) => value.trim().toLowerCase(),
    []
  );

  const categoriesSorted = useMemo(
    () =>
      [...categories]
        .filter((c) => c.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? a.order ?? 0) - (b.sortOrder ?? b.order ?? 0)),
    [categories]
  );

  const selectedCategory = useMemo(
    () =>
      categoriesSorted.find(
        (c) =>
          c.slug === filterCategory ||
          normalizeCategoryKey(c.name) === normalizeCategoryKey(filterCategory)
      ) || null,
    [categoriesSorted, filterCategory, normalizeCategoryKey]
  );

  const currentCategoryValue = selectedCategory?.slug || 'all';

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    setFilterCategory(categoryParam || 'all');
  }, [searchParams]);

  const handleCategoryChange = useCallback(
    (next: string) => {
      setFilterCategory(next);

      const params = new URLSearchParams(searchParams.toString());
      if (next === 'all') {
        params.delete('category');
      } else {
        params.set('category', next);
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  /* ================= FETCH DATA ================= */

  const fetchData = useCallback(async()=>{

    try{
      const cacheKey = 'catalog_data_v1';
      const cacheRaw = typeof window !== 'undefined'
        ? sessionStorage.getItem(cacheKey)
        : null;

      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw);
        const isFresh = Date.now() - cache.timestamp < REVALIDATE_MS;

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

  useEffect(()=>{
    fetchData();
  },[fetchData]);

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
        (!selectedCategory || p.categoryId !== selectedCategory.id)
      ){
        return false;
      }

      return true;

    });

  },[
    searchTerm,
    filterBrand,
    filterCategory,
    selectedCategory,
    products
  ]);

  const brandOptions = useMemo(
    ()=>Array.from(brands.values()),
    [brands]
  );

  if(loading){

    return(

      <>

        <Navbar/>

        <main className="min-h-screen bg-leather-beige">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8 text-leather-dark">{t('all_products')}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <ProductCardSkeleton key={`catalog-skeleton-${idx}`} />
              ))}
            </div>
          </div>
        </main>

        <Footer/>

      </>

    );

  }

  return(

    <>

      <Navbar/>

      <main className="min-h-screen bg-leather-beige">

        <div className="container mx-auto px-4 py-8">

          <div className="sticky top-16 z-40 bg-leather-beige/95 backdrop-blur py-3 mb-5 border-b border-leather-light/20">
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                <Button
                  variant={currentCategoryValue === 'all' ? 'default' : 'outline'}
                  className={currentCategoryValue === 'all' ? 'bg-leather-brown text-white' : ''}
                  onClick={() => handleCategoryChange('all')}
                >
                  Tous
                </Button>
                {categoriesSorted.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory?.id === category.id ? 'default' : 'outline'}
                    className={selectedCategory?.id === category.id ? 'bg-leather-brown text-white' : ''}
                    onClick={() => handleCategoryChange(category.slug)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {selectedCategory && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-leather-light/30 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="relative h-52 md:h-full">
                  <Image
                    src={getOptimizedImage(selectedCategory.coverImage || '', 1200) || '/placeholder.png'}
                    alt={selectedCategory.name}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="md:col-span-2 p-6">
                  <h2 className="text-3xl font-bold text-leather-dark">{selectedCategory.name}</h2>
                  <p className="text-leather-gray mt-3">
                    {selectedCategory.description || 'Découvrez cette collection premium.'}
                  </p>
                  <Badge className="mt-4 bg-leather-light text-leather-dark">
                    {filteredProducts.length} produits
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <h1 className="text-4xl font-bold mb-8 text-leather-dark">

            {t('all_products')}

          </h1>

          <div className="bg-white rounded-lg shadow-md p-4 mb-8 border border-leather-light/20">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="relative">

                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>

                <Input
                  placeholder={t('search')}
                  value={searchInput}
                  onChange={(e)=>setSearchInput(e.target.value)}
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
                value={currentCategoryValue}
                onValueChange={handleCategoryChange}
              >

                <SelectTrigger>

                  <SelectValue placeholder={t('filter')}/>

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="all">

                    Toutes les catégories

                  </SelectItem>

                  {categoriesSorted.map((category)=>(

                    <SelectItem
                      key={category.id}
                      value={category.slug}
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

              {filteredProducts.map((product, index)=>(

                <ProductCard
  key={product.id}
  product={product}
  brand={brands.get(product.brandId)}
  promotion={promotions?.[product.id]}
  priority={index < 2}
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
