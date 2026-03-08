export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">

      {/* IMAGE */}

      <div className="h-64 bg-gray-200" />

      <div className="p-4 space-y-3">

        <div className="h-4 bg-gray-200 rounded w-3/4" />

        <div className="h-6 bg-gray-200 rounded w-1/3" />

        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200" />
          <div className="w-6 h-6 rounded-full bg-gray-200" />
          <div className="w-6 h-6 rounded-full bg-gray-200" />
        </div>

        <div className="h-10 bg-gray-200 rounded" />

      </div>
    </div>
  )
}