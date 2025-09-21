export default function ProductCard({ product }) {
  return (
    <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <img
        src={product.image_url}
        alt={product.name}
        className="h-64 w-full object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold">{product.name}</h3>
        <p className="text-gray-600 text-sm mt-1">
          {product.price ? `$${product.price}` : "Price unavailable"}
        </p>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-blue-500 hover:underline text-sm"
        >
          View Product →
        </a>
        <div className="flex gap-4 mt-4 justify-center">
          <button className="bg-red-500 text-white px-4 py-2 rounded-full shadow hover:bg-red-600">
            ❌ Nope
          </button>
          <button className="bg-green-500 text-white px-4 py-2 rounded-full shadow hover:bg-green-600">
            ✅ Like
          </button>
        </div>
      </div>
    </div>
  );
}
