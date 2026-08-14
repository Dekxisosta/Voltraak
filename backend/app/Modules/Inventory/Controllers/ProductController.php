<?php

namespace App\Modules\Inventory\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Inventory\Repositories\ProductRepository;
use App\Modules\Inventory\Requests\StoreProductRequest;
use App\Modules\Inventory\Requests\UpdateProductRequest;
use App\Modules\Inventory\Resources\ProductResource;
use Illuminate\Http\Request;

class ProductController extends BaseController
{
    public function __construct(
        private ProductRepository $productRepository,
        private InventoryService $inventoryService
    ) {}

    /**
     * Display a listing of products.
     */
    public function index(Request $request)
    {
        $this->authorize('product.read');

        $products = $this->productRepository->paginate(
            filters: [
                'search' => $request->search,
                'category' => $request->category,
                'status' => $request->status,
                'low_stock' => $request->boolean('low_stock'),
                'out_of_stock' => $request->boolean('out_of_stock')
            ],
            perPage: $request->per_page ?? 15,
            with: ['batches', 'stockTransactions']
        );

        return $this->successResponse(
            ProductResource::collection($products),
            'Products retrieved successfully'
        );
    }

    /**
     * Store a newly created product.
     */
    public function store(StoreProductRequest $request)
    {
        $this->authorize('product.create');

        $product = $this->productRepository->create($request->validated());

        $this->logActivity('product.created', $product, $request->validated());

        return $this->successResponse(
            new ProductResource($product),
            'Product created successfully',
            201
        );
    }

    /**
     * Display the specified product.
     */
    public function show(Product $product)
    {
        $this->authorize('product.read');

        $product->load(['batches' => function($query) {
            $query->with(['stockTransactions'])->orderBy('expiry_date');
        }]);

        return $this->successResponse(
            new ProductResource($product),
            'Product retrieved successfully'
        );
    }

    /**
     * Update the specified product.
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        $this->authorize('product.update');

        $oldData = $product->toArray();
        $product = $this->productRepository->update($product, $request->validated());

        $this->logActivity('product.updated', $product, [
            'old' => $oldData,
            'new' => $request->validated()
        ]);

        return $this->successResponse(
            new ProductResource($product),
            'Product updated successfully'
        );
    }

    /**
     * Remove the specified product.
     */
    public function destroy(Product $product)
    {
        $this->authorize('product.delete');

        // Check if product has active batches
        if ($product->batches()->where('current_quantity', '>', 0)->exists()) {
            return $this->errorResponse('Cannot delete product with active stock', 409);
        }

        $this->productRepository->delete($product);

        $this->logActivity('product.deleted', $product);

        return $this->successResponse(
            null,
            'Product deleted successfully'
        );
    }

    /**
     * Get product stock levels.
     */
    public function stockLevels(Product $product)
    {
        $this->authorize('product.read');

        $stockInfo = $this->inventoryService->getProductStockLevels($product);

        return $this->successResponse($stockInfo, 'Stock levels retrieved successfully');
    }

    /**
     * Get products with low stock.
     */
    public function lowStock(Request $request)
    {
        $this->authorize('product.read');

        $products = $this->productRepository->getLowStockProducts(
            $request->per_page ?? 15
        );

        return $this->successResponse(
            ProductResource::collection($products),
            'Low stock products retrieved successfully'
        );
    }

    /**
     * Get products that are out of stock.
     */
    public function outOfStock(Request $request)
    {
        $this->authorize('product.read');

        $products = $this->productRepository->getOutOfStockProducts(
            $request->per_page ?? 15
        );

        return $this->successResponse(
            ProductResource::collection($products),
            'Out of stock products retrieved successfully'
        );
    }

    /**
     * Update product reorder point.
     */
    public function updateReorderPoint(Request $request, Product $product)
    {
        $this->authorize('product.update');

        $request->validate([
            'reorder_point' => 'required|integer|min:0'
        ]);

        $oldReorderPoint = $product->reorder_point;
        $product = $this->productRepository->update($product, [
            'reorder_point' => $request->reorder_point
        ]);

        $this->logActivity('product.reorder_point_updated', $product, [
            'old_reorder_point' => $oldReorderPoint,
            'new_reorder_point' => $request->reorder_point
        ]);

        return $this->successResponse(
            new ProductResource($product),
            'Reorder point updated successfully'
        );
    }
}