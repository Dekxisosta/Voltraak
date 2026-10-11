<?php

namespace App\Modules\Procurement\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Procurement\Models\Supplier;
use App\Modules\Procurement\Services\SupplierService;
use App\Modules\Procurement\Requests\StoreSupplierRequest;
use App\Modules\Procurement\Requests\UpdateSupplierRequest;
use App\Modules\Procurement\Resources\SupplierResource;
use Illuminate\Http\Request;

class SupplierController extends BaseController
{
    public function __construct(
        private SupplierService $supplierService
    ) {}

    public function index(Request $request)
    {
        $this->authorize('supplier.read');

        $suppliers = $this->supplierService->paginate(
            filters: [
                'search' => $request->search,
                'status' => $request->status,
                'category' => $request->category,
            ],
            perPage: $request->per_page ?? 15
        );

        return $this->successResponse(
            SupplierResource::collection($suppliers),
            'Suppliers retrieved successfully'
        );
    }

    public function store(StoreSupplierRequest $request)
    {
        $this->authorize('supplier.create');

        $supplier = $this->supplierService->create($request->validated());

        $this->logActivity('supplier.created', $supplier);

        return $this->successResponse(
            new SupplierResource($supplier),
            'Supplier created successfully',
            201
        );
    }

    public function show(Supplier $supplier)
    {
        $this->authorize('supplier.read');

        $supplier->load(['purchaseOrders' => function($query) {
            $query->latest()->limit(10);
        }]);

        return $this->successResponse(
            new SupplierResource($supplier),
            'Supplier retrieved successfully'
        );
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier)
    {
        $this->authorize('supplier.update');

        $oldData = $supplier->toArray();
        $supplier = $this->supplierService->update($supplier, $request->validated());

        $this->logActivity('supplier.updated', $supplier, [
            'old' => $oldData,
            'new' => $supplier->toArray()
        ]);

        return $this->successResponse(
            new SupplierResource($supplier),
            'Supplier updated successfully'
        );
    }

    public function destroy(Supplier $supplier)
    {
        $this->authorize('supplier.delete');

        if ($supplier->purchaseOrders()->whereIn('status', ['pending', 'approved', 'sent'])->exists()) {
            return $this->errorResponse('Cannot delete supplier with active purchase orders', 409);
        }

        $this->supplierService->delete($supplier);

        $this->logActivity('supplier.deleted', null, ['supplier_id' => $supplier->id, 'name' => $supplier->name]);

        return $this->successResponse(null, 'Supplier deleted successfully');
    }

    public function performance(Supplier $supplier)
    {
        $this->authorize('supplier.read');

        $metrics = $this->supplierService->getPerformanceMetrics($supplier);

        return $this->successResponse($metrics, 'Supplier performance retrieved successfully');
    }
}
