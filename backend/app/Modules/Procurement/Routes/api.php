<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Procurement\Controllers\SupplierController;
use App\Modules\Procurement\Controllers\PurchaseOrderController;
use App\Modules\Procurement\Controllers\ProcurementRequestController;

Route::prefix('procurement')->middleware(['auth:sanctum'])->group(function () {
    
    // Suppliers
    Route::prefix('suppliers')->name('procurement.suppliers.')->group(function () {
        Route::get('/', [SupplierController::class, 'index'])->name('index');
        Route::post('/', [SupplierController::class, 'store'])->name('store');
        Route::get('/{supplier}', [SupplierController::class, 'show'])->name('show');
        Route::put('/{supplier}', [SupplierController::class, 'update'])->name('update');
        Route::delete('/{supplier}', [SupplierController::class, 'destroy'])->name('destroy');
        Route::get('/{supplier}/performance', [SupplierController::class, 'performance'])->name('performance');
    });

    // Purchase Orders
    Route::prefix('purchase-orders')->name('procurement.purchase-orders.')->group(function () {
        Route::get('/', [PurchaseOrderController::class, 'index'])->name('index');
        Route::post('/', [PurchaseOrderController::class, 'store'])->name('store');
        Route::get('/{purchaseOrder}', [PurchaseOrderController::class, 'show'])->name('show');
        Route::put('/{purchaseOrder}', [PurchaseOrderController::class, 'update'])->name('update');
        Route::delete('/{purchaseOrder}', [PurchaseOrderController::class, 'destroy'])->name('destroy');
        Route::post('/{purchaseOrder}/approve', [PurchaseOrderController::class, 'approve'])->name('approve');
        Route::post('/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive'])->name('receive');
        Route::post('/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel'])->name('cancel');
    });

    // Procurement Requests
    Route::prefix('requests')->name('procurement.requests.')->group(function () {
        Route::get('/', [ProcurementRequestController::class, 'index'])->name('index');
        Route::post('/', [ProcurementRequestController::class, 'store'])->name('store');
        Route::post('/generate-automatic', [ProcurementRequestController::class, 'generateAutomatic'])->name('generate-automatic');
        Route::get('/{procurementRequest}', [ProcurementRequestController::class, 'show'])->name('show');
        Route::put('/{procurementRequest}', [ProcurementRequestController::class, 'update'])->name('update');
        Route::delete('/{procurementRequest}', [ProcurementRequestController::class, 'destroy'])->name('destroy');
        Route::post('/{procurementRequest}/review', [ProcurementRequestController::class, 'review'])->name('review');
        Route::post('/{procurementRequest}/convert-to-po', [ProcurementRequestController::class, 'convertToPo'])->name('convert-to-po');
    });
});
