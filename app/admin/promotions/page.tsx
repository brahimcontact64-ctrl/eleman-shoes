'use client';

import { useEffect, useState } from 'react';
import {
collection,
getDocs,
addDoc,
deleteDoc,
doc,
serverTimestamp
} from 'firebase/firestore';

import { db } from '@/lib/firebase/config';
import { Product } from '@/lib/types';

import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from '@/components/ui/table';

import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
DialogTrigger
} from '@/components/ui/dialog';

export default function AdminPromotionsPage() {

const [products,setProducts] = useState<Product[]>([])
const [promotions,setPromotions] = useState<any[]>([])

const [selectedProduct,setSelectedProduct] = useState('')
const [newPrice,setNewPrice] = useState(0)

const [dialogOpen,setDialogOpen] = useState(false)

useEffect(()=>{
fetchData()
},[])

const fetchData = async () => {

const [productsSnap,promoSnap] = await Promise.all([
getDocs(collection(db,'products')),
getDocs(collection(db,'promotions'))
])

setProducts(productsSnap.docs.map(d=>({
id:d.id,
...d.data()
})) as Product[])

setPromotions(promoSnap.docs.map(d=>({
id:d.id,
...d.data()
})))

}

const handleCreate = async () => {

const product = products.find(p=>p.id === selectedProduct)

if(!product) return

const discount = product.price - newPrice

await addDoc(collection(db,'promotions'),{

productId:product.id,
productName:product.name,

oldPrice:product.price,
newPrice:newPrice,
discount:discount,

active:true,

createdAt:serverTimestamp()

})

setDialogOpen(false)

fetchData()

}

const handleDelete = async (id:string)=>{

await deleteDoc(doc(db,'promotions',id))

fetchData()

}

return(

<ProtectedRoute requireAdmin>
<AdminLayout>

<div className="space-y-6">

<div className="flex justify-between">

<h1 className="text-3xl font-bold">
Promotions
</h1>

<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>

<DialogTrigger asChild>
<Button>Nouvelle promotion</Button>
</DialogTrigger>

<DialogContent>

<DialogHeader>
<DialogTitle>Créer promotion</DialogTitle>
</DialogHeader>

<select
className="border p-2 w-full"
onChange={(e)=>setSelectedProduct(e.target.value)}
>

<option>Choisir produit</option>

{products.map(p=>(
<option key={p.id} value={p.id}>
{p.name} - {p.price} DA
</option>
))}

</select>

<Input
type="number"
placeholder="Nouveau prix"
onChange={(e)=>setNewPrice(Number(e.target.value))}
/>

<Button onClick={handleCreate}>
Créer
</Button>

</DialogContent>
</Dialog>

</div>

<Table>

<TableHeader>
<TableRow>

<TableHead>Produit</TableHead>
<TableHead>Ancien prix</TableHead>
<TableHead>Nouveau prix</TableHead>
<TableHead>Réduction</TableHead>
<TableHead></TableHead>

</TableRow>
</TableHeader>

<TableBody>

{promotions.map(p=>(
<TableRow key={p.id}>

<TableCell>{p.productName}</TableCell>
<TableCell>{p.oldPrice} DA</TableCell>
<TableCell>{p.newPrice} DA</TableCell>
<TableCell>{p.discount} DA</TableCell>

<TableCell>

<Button
variant="destructive"
size="sm"
onClick={()=>handleDelete(p.id)}
>

Supprimer

</Button>

</TableCell>

</TableRow>
))}

</TableBody>

</Table>

</div>

</AdminLayout>
</ProtectedRoute>

)

}