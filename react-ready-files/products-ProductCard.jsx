// File: client/src/components/products/ProductCard.jsx
// Product display card component

import { formatCurrency, isAdmin } from '../../lib/utils';
import { Edit, Trash2, Package } from 'lucide-react';

export default function ProductCard({ product, onEdit, onDelete }) {
  const admin = isAdmin();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 relative">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" />
          </div>
        )}
        
        {/* Stock Badge */}
        <div className="absolute top-2 right-2">
          {product.inStock ? (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
              In Stock
            </span>
          ) : (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Category & SKU */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">{product.category || 'Uncategorized'}</span>
          <span className="text-xs text-gray-400">SKU: {product.sku}</span>
        </div>

        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
          {product.name}
        </h3>

        {/* Pricing */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(product.mrp)}
              </span>
            )}
          </div>
          {product.mrp && product.mrp > product.price && (
            <span className="text-xs text-green-600">
              Save {Math.round(((product.mrp - product.price) / product.mrp) * 100)}%
            </span>
          )}
        </div>

        {/* Stock Quantity */}
        {product.stockQuantity !== undefined && (
          <div className="text-sm text-gray-600 mb-3">
            Stock: <span className="font-medium">{product.stockQuantity} {product.unit || 'units'}</span>
          </div>
        )}

        {/* Specifications (if any) */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="text-xs text-gray-500 mb-3 space-y-1">
            {Object.entries(product.specifications).slice(0, 2).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
          </div>
        )}

        {/* Admin Actions */}
        {admin && (
          <div className="flex gap-2 pt-3 border-t">
            <button
              onClick={() => onEdit(product)}
              className="flex-1 btn btn-secondary text-sm flex items-center justify-center gap-1"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => onDelete(product)}
              className="flex-1 btn bg-red-100 text-red-700 hover:bg-red-200 text-sm flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
