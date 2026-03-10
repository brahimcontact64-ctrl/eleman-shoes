'use client'

import { useEffect, useState } from 'react'
import {
collection,
getDocs,
doc,
getDoc,
addDoc,
serverTimestamp
} from 'firebase/firestore'

import { db } from '@/lib/firebase/config'

import { Button } from '@/components/ui/button'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'

interface Order{
id:string
orderNumber:string
customer?:{
fullName?:string
}
product?:{
id?:string
name?:string
}
variant?:{
colorName?:string
size?:number
}
}

interface ProductSize{
size:number
stock:number
}

export default function ModificationsPage(){

const [orders,setOrders] = useState<Order[]>([])
const [colors,setColors] = useState<any[]>([])
const [sizes,setSizes] = useState<ProductSize[]>([])

const [selectedOrder,setSelectedOrder] = useState<Order | null>(null)

const [newColor,setNewColor] = useState('')
const [newSize,setNewSize] = useState<number | ''>('')

/* LOAD DATA */

useEffect(()=>{

const loadData = async ()=>{

const ordersSnap = await getDocs(collection(db,'orders'))
const colorsSnap = await getDocs(collection(db,'colors'))

setOrders(
ordersSnap.docs.map(d=>({id:d.id,...d.data()})) as Order[]
)

setColors(
colorsSnap.docs.map(d=>({id:d.id,...d.data()}))
)

}

loadData()

},[])

/* SELECT ORDER */

const handleSelectOrder = async (id:string)=>{

const order = orders.find(o=>o.id === id)

if(!order) return

setSelectedOrder(order)
setSizes([])

const productId = order.product?.id

if(!productId) return

const productDoc = await getDoc(doc(db,'products',productId))

if(!productDoc.exists()) return

const productData:any = productDoc.data()

const allSizes:ProductSize[] = []

productData.colors?.forEach((color:any)=>{

color.sizes?.forEach((s:any)=>{

allSizes.push({
size:s.size,
stock:s.stock
})

})

})

const uniqueSizes = Array.from(
new Map(allSizes.map(s => [s.size, s])).values()
)

setSizes(uniqueSizes)

}

/* SAVE MODIFICATION */

const saveModification = async ()=>{

if(!selectedOrder) return

await addDoc(collection(db,'order_modifications'),{

orderId:selectedOrder.orderNumber,

product:selectedOrder.product?.name,

oldColor:selectedOrder.variant?.colorName,
newColor:newColor || null,

oldSize:selectedOrder.variant?.size,
newSize:newSize || null,

date:serverTimestamp()

})

alert('Modification enregistrée')

}

/* UI */

return(

<ProtectedRoute requirePermission="canManageOrders">

<AdminLayout>

<div className="max-w-xl space-y-6">

<h1 className="text-3xl font-bold">
Modifier une commande
</h1>

<select
className="border p-2 rounded w-full"
onChange={(e)=>handleSelectOrder(e.target.value)}
>

<option value="">
Choisir une commande
</option>

{orders.map(o=>(

<option key={o.id} value={o.id}>

{o.orderNumber} - {o.customer?.fullName}

</option>

))}

</select>

{selectedOrder &&(

<div className="space-y-4">

<div>
Client :
<b className="ml-2">
{selectedOrder.customer?.fullName}
</b>
</div>

<div>
Produit :
<b className="ml-2">
{selectedOrder.product?.name}
</b>
</div>

<div>
Couleur actuelle :
<b className="ml-2">
{selectedOrder.variant?.colorName}
</b>
</div>

<div>
Pointure actuelle :
<b className="ml-2">
{selectedOrder.variant?.size}
</b>
</div>

{/* COLOR */}

<select
className="border p-2 rounded w-full"
value={newColor}
onChange={(e)=>setNewColor(e.target.value)}
>

<option value="">
Nouvelle couleur
</option>

{colors.map((c:any)=>(

<option key={c.id} value={c.name}>
{c.name}
</option>

))}

</select>

{/* SIZE */}

<select
className="border p-2 rounded w-full"
value={newSize}
onChange={(e)=>setNewSize(Number(e.target.value))}
>

<option value="">
Nouvelle pointure
</option>

{sizes.map((s,index)=>(

<option key={index} value={s.size}>
{s.size}
</option>

))}

</select>

<Button
className="bg-leather-brown"
onClick={saveModification}
>

Enregistrer modification

</Button>

</div>

)}

</div>

</AdminLayout>

</ProtectedRoute>

)

}