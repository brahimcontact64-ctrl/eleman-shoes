'use client'

import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

import AdminLayout from "@/components/admin/AdminLayout"
import ProtectedRoute from "@/components/admin/ProtectedRoute"
import { Card } from "@/components/ui/card"
import { formatPrice } from "@/lib/firebase/utils"

import {
ResponsiveContainer,
BarChart,
Bar,
XAxis,
YAxis,
Tooltip,
CartesianGrid
} from "recharts"

export default function AnalyticsPage(){

type Order = {
id:string
total:number
createdAt:{seconds:number}
product?:{name?:string}
customer?:{wilaya?:string}
}

const [orders,setOrders] = useState<Order[]>([])

const [totalOrders,setTotalOrders] = useState(0)
const [totalRevenue,setTotalRevenue] = useState(0)
const [todayOrders,setTodayOrders] = useState(0)
const [avgOrder,setAvgOrder] = useState(0)

const [trendingProduct,setTrendingProduct] = useState("")
const [weekGrowth,setWeekGrowth] = useState(0)
const [estimatedProfit,setEstimatedProfit] = useState(0)

const [salesPerDay,setSalesPerDay] = useState<any[]>([])
const [topProducts,setTopProducts] = useState<any[]>([])
const [ordersByWilaya,setOrdersByWilaya] = useState<any[]>([])
const [ordersByHour,setOrdersByHour] = useState<any[]>([])
const [weekdaySales,setWeekdaySales] = useState<any[]>([])

const [bestDay,setBestDay] = useState("")
const [worstDay,setWorstDay] = useState("")

useEffect(()=>{
fetchStats()
},[])

const fetchStats = async()=>{

const snap = await getDocs(collection(db,"orders"))

const data:Order[] = snap.docs.map(d=>{
const docData:any = d.data()
return{
id:d.id,
total:docData.total || 0,
createdAt:docData.createdAt,
product:docData.product,
customer:docData.customer
}
})

setOrders(data)

let revenue = 0
let today = 0

const todayDate = new Date().toDateString()

const dayMap:any = {}
const productMap:any = {}
const wilayaMap:any = {}
const hourMap:any = {}
const weekdayMap:any = {}
const todayProductMap:any = {}

data.forEach(o=>{

const date = new Date(o.createdAt.seconds*1000)

revenue += o.total

if(date.toDateString() === todayDate){
today++

const name = o.product?.name || "Unknown"
if(!todayProductMap[name]) todayProductMap[name]=0
todayProductMap[name]++
}

const day = date.toLocaleDateString("fr-FR")

if(!dayMap[day]) dayMap[day]=0
dayMap[day]+=o.total

const weekday = date.toLocaleDateString("fr-FR",{weekday:"long"})

if(!weekdayMap[weekday]){
weekdayMap[weekday]={orders:0,revenue:0}
}

weekdayMap[weekday].orders++
weekdayMap[weekday].revenue+=o.total

const product = o.product?.name || "Unknown"
if(!productMap[product]) productMap[product]=0
productMap[product]++

const wilaya = o.customer?.wilaya || "Unknown"
if(!wilayaMap[wilaya]) wilayaMap[wilaya]=0
wilayaMap[wilaya]++

const hour = date.getHours()
if(!hourMap[hour]) hourMap[hour]=0
hourMap[hour]++

})

setTotalOrders(data.length)
setTotalRevenue(revenue)
setTodayOrders(today)
setAvgOrder(data.length ? revenue/data.length : 0)

const salesArray = Object.keys(dayMap).map(d=>({
date:d,
sales:dayMap[d]
}))

setSalesPerDay(salesArray)

const topArray = Object.keys(productMap)
.map(p=>({product:p,count:productMap[p]}))
.sort((a,b)=>b.count-a.count)
.slice(0,5)

setTopProducts(topArray)

const wilayaArray = Object.keys(wilayaMap)
.map(w=>({wilaya:w,count:wilayaMap[w]}))
.sort((a,b)=>b.count-a.count)

setOrdersByWilaya(wilayaArray)

const hourArray = Object.keys(hourMap)
.map(h=>({hour:h,count:hourMap[h]}))
.sort((a,b)=>Number(a.hour)-Number(b.hour))

setOrdersByHour(hourArray)

let trending=""
let max=0

Object.keys(todayProductMap).forEach(p=>{
if(todayProductMap[p]>max){
max=todayProductMap[p]
trending=p
}
})

setTrendingProduct(trending)

setEstimatedProfit(revenue*0.3)

const now = new Date()
const week = 7*24*60*60*1000

const thisWeek = data.filter(o=>{
const d=new Date(o.createdAt.seconds*1000)
return now.getTime()-d.getTime()<week
})

const lastWeek = data.filter(o=>{
const d=new Date(o.createdAt.seconds*1000)
return now.getTime()-d.getTime()<week*2 &&
now.getTime()-d.getTime()>week
})

const thisWeekRevenue=thisWeek.reduce((s,o)=>s+o.total,0)
const lastWeekRevenue=lastWeek.reduce((s,o)=>s+o.total,0)

const growth = lastWeekRevenue ? ((thisWeekRevenue-lastWeekRevenue)/lastWeekRevenue)*100 : 0

setWeekGrowth(growth)

const weekdayArray = Object.keys(weekdayMap).map(d=>({
day:d,
orders:weekdayMap[d].orders,
revenue:weekdayMap[d].revenue
}))

setWeekdaySales(weekdayArray)

let best=""
let bestVal=0
let worst=""
let worstVal=999999

weekdayArray.forEach(w=>{

if(w.revenue>bestVal){
bestVal=w.revenue
best=w.day
}

if(w.revenue<worstVal){
worstVal=w.revenue
worst=w.day
}

})

setBestDay(best)
setWorstDay(worst)

}

return(

<ProtectedRoute>

<AdminLayout>

<div className="space-y-6 px-3 md:px-6">

<h1 className="text-2xl md:text-3xl font-bold">📊 Analytics</h1>

{/* STATS */}

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

<Card className="p-4">
<p className="text-sm text-gray-500">Total commandes</p>
<p className="text-2xl md:text-3xl font-bold">{totalOrders}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">Total ventes</p>
<p className="text-2xl md:text-3xl font-bold">{formatPrice(totalRevenue)}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">Commandes Aujourd&apos;hui</p>
<p className="text-2xl md:text-3xl font-bold">{todayOrders}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">Panier moyen</p>
<p className="text-2xl md:text-3xl font-bold">{formatPrice(avgOrder)}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">🔥 Produit tendance</p>
<p className="text-lg font-bold">{trendingProduct || "-"}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">📈 Croissance semaine</p>
<p className="text-lg font-bold">{weekGrowth.toFixed(1)}%</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">💰 Profit estimé</p>
<p className="text-lg font-bold">{formatPrice(estimatedProfit)}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">🏆 Meilleur jour</p>
<p className="text-lg font-bold capitalize">{bestDay}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">😴 Jour le plus faible</p>
<p className="text-lg font-bold capitalize">{worstDay}</p>
</Card>

</div>

{/* GRAPH */}

<Card className="p-4 md:p-6">

<h2 className="text-lg md:text-xl font-bold mb-4">📊 Ventes par jour</h2>

<div className="w-full h-[250px] md:h-[320px]">

<ResponsiveContainer>

<BarChart data={salesPerDay}>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="date"/>

<YAxis/>

<Tooltip/>

<Bar dataKey="sales" fill="#8B5E3C"/>

</BarChart>

</ResponsiveContainer>

</div>

</Card>

{/* TOP PRODUCTS */}

<Card className="p-4 md:p-6">

<h2 className="text-lg md:text-xl font-bold mb-4">🔥 Top produits</h2>

<div className="space-y-2 text-sm md:text-base">

{topProducts.map((p:any,i)=>(

<div key={i} className="flex justify-between">

<span>{p.product}</span>

<span className="font-semibold">{p.count}</span>

</div>

))}

</div>

</Card>

{/* WILAYA */}

<Card className="p-4 md:p-6">

<h2 className="text-lg md:text-xl font-bold mb-4">🗺 Commandes par wilaya</h2>

<div className="space-y-2 text-sm md:text-base">

{ordersByWilaya.map((w:any,i)=>(

<div key={i} className="flex justify-between">

<span>{w.wilaya}</span>

<span className="font-semibold">{w.count}</span>

</div>

))}

</div>

</Card>

{/* HOURS */}

<Card className="p-4 md:p-6">

<h2 className="text-lg md:text-xl font-bold mb-4">⏰ Heures des commandes</h2>

<div className="space-y-2 text-sm md:text-base">

{ordersByHour.map((h:any,i)=>(

<div key={i} className="flex justify-between">

<span>{h.hour}:00</span>

<span className="font-semibold">{h.count}</span>

</div>

))}

</div>

</Card>

{/* WEEKDAY SALES */}

<Card className="p-4 md:p-6">

<h2 className="text-lg md:text-xl font-bold mb-4">📅 Ventes par jour</h2>

<div className="space-y-2 text-sm md:text-base">

{weekdaySales.map((d:any,i)=>(

<div key={i} className="flex justify-between">

<span className="capitalize">{d.day}</span>

<span>{d.orders} — {formatPrice(d.revenue)}</span>

</div>

))}

</div>

</Card>

</div>

</AdminLayout>

</ProtectedRoute>

)

}