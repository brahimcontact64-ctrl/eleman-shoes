'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

import AdminLayout from '@/components/admin/AdminLayout'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import { Card } from '@/components/ui/card'
import { formatPrice } from '@/lib/firebase/utils'

import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
} from 'recharts'

type AnalyticsOrder = {
	id: string
	total: number
	createdAt?: { seconds: number }
	product?: { name?: string }
	customer?: { wilaya?: string }
}

export default function AnalyticsPage() {
	const [orders, setOrders] = useState<AnalyticsOrder[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const cacheKey = 'admin_analytics_orders_v1'
				const cacheRaw = typeof window !== 'undefined'
					? sessionStorage.getItem(cacheKey)
					: null

				if (cacheRaw) {
					const cache = JSON.parse(cacheRaw)
					const isFresh = Date.now() - cache.timestamp < 1000 * 60 * 2
					if (isFresh) {
						setOrders(cache.orders || [])
						setLoading(false)
						return
					}
				}

				const snap = await getDocs(collection(db, 'orders'))

				const data: AnalyticsOrder[] = snap.docs.map((document) => {
					const docData: any = document.data()
					return {
						id: document.id,
						total: docData.total || 0,
						createdAt: docData.createdAt,
						product: docData.product,
						customer: docData.customer,
					}
				})

				setOrders(data)

				if (typeof window !== 'undefined') {
					sessionStorage.setItem(
						cacheKey,
						JSON.stringify({
							timestamp: Date.now(),
							orders: data,
						})
					)
				}
			} finally {
				setLoading(false)
			}
		}

		fetchStats()
	}, [])

	const analytics = useMemo(() => {
		let totalRevenue = 0
		let todayOrders = 0
		const todayDate = new Date().toDateString()

		const dayMap: Record<string, number> = {}
		const productMap: Record<string, number> = {}
		const wilayaMap: Record<string, number> = {}
		const hourMap: Record<string, number> = {}
		const weekdayMap: Record<string, { orders: number; revenue: number }> = {}
		const todayProductMap: Record<string, number> = {}

		const now = Date.now()
		const weekMs = 7 * 24 * 60 * 60 * 1000
		let thisWeekRevenue = 0
		let lastWeekRevenue = 0

		orders.forEach((order) => {
			if (!order.createdAt?.seconds) return

			const createdAtMs = order.createdAt.seconds * 1000
			const date = new Date(createdAtMs)

			totalRevenue += order.total

			if (date.toDateString() === todayDate) {
				todayOrders++
				const productName = order.product?.name || 'Unknown'
				todayProductMap[productName] = (todayProductMap[productName] || 0) + 1
			}

			const day = date.toLocaleDateString('fr-FR')
			dayMap[day] = (dayMap[day] || 0) + order.total

			const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' })
			if (!weekdayMap[weekday]) {
				weekdayMap[weekday] = { orders: 0, revenue: 0 }
			}
			weekdayMap[weekday].orders += 1
			weekdayMap[weekday].revenue += order.total

			const productName = order.product?.name || 'Unknown'
			productMap[productName] = (productMap[productName] || 0) + 1

			const wilaya = order.customer?.wilaya || 'Unknown'
			wilayaMap[wilaya] = (wilayaMap[wilaya] || 0) + 1

			const hour = String(date.getHours())
			hourMap[hour] = (hourMap[hour] || 0) + 1

			const age = now - createdAtMs
			if (age < weekMs) {
				thisWeekRevenue += order.total
			} else if (age >= weekMs && age < weekMs * 2) {
				lastWeekRevenue += order.total
			}
		})

		const salesPerDay = Object.keys(dayMap).map((day) => ({
			date: day,
			sales: dayMap[day],
		}))

		const topProducts = Object.keys(productMap)
			.map((name) => ({ product: name, count: productMap[name] }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5)

		const ordersByWilaya = Object.keys(wilayaMap)
			.map((wilaya) => ({ wilaya, count: wilayaMap[wilaya] }))
			.sort((a, b) => b.count - a.count)

		const ordersByHour = Object.keys(hourMap)
			.map((hour) => ({ hour, count: hourMap[hour] }))
			.sort((a, b) => Number(a.hour) - Number(b.hour))

		const weekdaySales = Object.keys(weekdayMap).map((weekday) => ({
			day: weekday,
			orders: weekdayMap[weekday].orders,
			revenue: weekdayMap[weekday].revenue,
		}))

		let trendingProduct = ''
		let trendingCount = 0

		Object.keys(todayProductMap).forEach((name) => {
			if (todayProductMap[name] > trendingCount) {
				trendingCount = todayProductMap[name]
				trendingProduct = name
			}
		})

		let bestDay = ''
		let bestRevenue = 0
		let worstDay = ''
		let worstRevenue = Number.POSITIVE_INFINITY

		weekdaySales.forEach((dayStat) => {
			if (dayStat.revenue > bestRevenue) {
				bestRevenue = dayStat.revenue
				bestDay = dayStat.day
			}

			if (dayStat.revenue < worstRevenue) {
				worstRevenue = dayStat.revenue
				worstDay = dayStat.day
			}
		})

		return {
			totalOrders: orders.length,
			totalRevenue,
			todayOrders,
			avgOrder: orders.length ? totalRevenue / orders.length : 0,
			trendingProduct,
			weekGrowth: lastWeekRevenue
				? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
				: 0,
			estimatedProfit: totalRevenue * 0.3,
			salesPerDay,
			topProducts,
			ordersByWilaya,
			ordersByHour,
			weekdaySales,
			bestDay,
			worstDay,
		}
	}, [orders])

	if (loading) {
		return (
			<ProtectedRoute>
				<AdminLayout>
					<div className="flex items-center justify-center h-64">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
					</div>
				</AdminLayout>
			</ProtectedRoute>
		)
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
<p className="text-2xl md:text-3xl font-bold">{analytics.totalOrders}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">Total ventes</p>
<p className="text-2xl md:text-3xl font-bold">{formatPrice(analytics.totalRevenue)}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">Commandes Aujourd&apos;hui</p>
<p className="text-2xl md:text-3xl font-bold">{analytics.todayOrders}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">Panier moyen</p>
<p className="text-2xl md:text-3xl font-bold">{formatPrice(analytics.avgOrder)}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">🔥 Produit tendance</p>
<p className="text-lg font-bold">{analytics.trendingProduct || "-"}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">📈 Croissance semaine</p>
<p className="text-lg font-bold">{analytics.weekGrowth.toFixed(1)}%</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">💰 Profit estimé</p>
<p className="text-lg font-bold">{formatPrice(analytics.estimatedProfit)}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">🏆 Meilleur jour</p>
<p className="text-lg font-bold capitalize">{analytics.bestDay}</p>
</Card>

<Card className="p-4">
<p className="text-sm text-gray-500">😴 Jour le plus faible</p>
<p className="text-lg font-bold capitalize">{analytics.worstDay}</p>
</Card>

</div>

{/* GRAPH */}

<Card className="p-4 md:p-6">

<h2 className="text-lg md:text-xl font-bold mb-4">📊 Ventes par jour</h2>

<div className="w-full h-[250px] md:h-[320px]">

<ResponsiveContainer>

<BarChart data={analytics.salesPerDay}>

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

{analytics.topProducts.map((p,i)=>(

<div key={`${p.product}-${i}`} className="flex justify-between">

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

{analytics.ordersByWilaya.map((w,i)=>(

<div key={`${w.wilaya}-${i}`} className="flex justify-between">

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

{analytics.ordersByHour.map((h,i)=>(

<div key={`${h.hour}-${i}`} className="flex justify-between">

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

{analytics.weekdaySales.map((d,i)=>(

<div key={`${d.day}-${i}`} className="flex justify-between">

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