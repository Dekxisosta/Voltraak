<?php

namespace App\Core\Exceptions;

/**
 * Example usage demonstrations for the API exception hierarchy.
 * 
 * This file shows practical examples of how to use each exception type
 * in controllers, services, and business logic throughout the IMS application.
 */
class ExampleUsage
{
    /**
     * Example: Controller handling validation errors
     */
    public function controllerValidationExample()
    {
        // In a ProductController@store method
        $validationErrors = [
            'name' => ['The name field is required.'],
            'quantity' => ['The quantity must be a positive integer.'],
            'unit_price' => ['The unit price must be a valid decimal.']
        ];
        
        // Throw validation exception with field-specific errors
        throw new ValidationException($validationErrors, 'Product validation failed');
    }

    /**
     * Example: Service layer resource not found
     */
    public function serviceResourceNotFoundExample()
    {
        // In an InventoryService@findProduct method
        $productId = 999;
        
        // Check if product exists in database
        // $product = Product::find($productId);
        
        // If not found, throw resource not found exception
        throw new ResourceNotFoundException('Product', $productId);
    }

    /**
     * Example: Business logic conflict - insufficient inventory
     */
    public function businessLogicInsufficientInventoryExample()
    {
        // In a StockMovementService@stockOut method
        $available = 5;
        $requested = 10;
        $productName = 'Widget A';
        
        if ($available < $requested) {
            throw ConflictException::insufficientInventory($available, $requested, $productName);
        }
    }

    /**
     * Example: Business logic conflict - FEFO violation
     */
    public function businessLogicFefoViolationExample()
    {
        // In a BatchService@pickBatch method
        $selectedBatchId = 'batch-123';
        $earlierExpiringBatch = 'batch-456';
        
        // Business rule: Must use earlier expiring batches first (FEFO)
        throw ConflictException::fefoViolation($selectedBatchId, $earlierExpiringBatch);
    }

    /**
     * Example: Business logic conflict - reservation conflict
     */
    public function businessLogicReservationConflictExample()
    {
        // In a ReservationService@createReservation method
        $resourceId = 'product-123';
        $existingReservationId = 'reservation-789';
        
        // Check if resource is already reserved
        throw ConflictException::reservationConflict($resourceId, $existingReservationId);
    }

    /**
     * Example: Business logic conflict - invalid resource state
     */
    public function businessLogicInvalidStateExample()
    {
        // In a ProcurementService@approvePurchaseOrder method
        $purchaseOrderId = 'po-456';
        $currentState = 'approved';
        $requiredState = 'pending';
        
        // Cannot approve an already approved purchase order
        throw ConflictException::invalidResourceState($purchaseOrderId, $currentState, $requiredState);
    }

    /**
     * Example: Database connection failure
     */
    public function databaseUnavailableExample()
    {
        // In a repository or service when database connection fails
        $databaseName = 'inventory_db';
        $reason = 'Connection pool exhausted';
        
        throw ServiceUnavailableException::databaseUnavailable($databaseName, $reason);
    }

    /**
     * Example: External service failure
     */
    public function externalServiceUnavailableExample()
    {
        // In a service that calls external APIs (payment gateway, supplier API, etc.)
        $serviceName = 'supplier-api';
        $endpoint = '/api/v1/products';
        $reason = 'Gateway timeout after 30 seconds';
        
        throw ServiceUnavailableException::externalServiceUnavailable($serviceName, $endpoint, $reason);
    }

    /**
     * Example: Maintenance mode
     */
    public function maintenanceModeExample()
    {
        // In middleware or service during scheduled maintenance
        $maintenanceMessage = 'System undergoing scheduled maintenance for inventory reconciliation';
        $estimatedCompletion = '2024-01-15 14:00:00 UTC';
        
        throw ServiceUnavailableException::maintenanceMode($maintenanceMessage, $estimatedCompletion);
    }

    /**
     * Example: Complete controller method with exception handling
     */
    public function completeControllerExample()
    {
        /*
        class ProductController extends BaseController
        {
            public function update($id, Request $request)
            {
                // 1. Validate request data
                $validator = Validator::make($request->all(), [
                    'name' => 'sometimes|required|string|max:255',
                    'quantity' => 'sometimes|required|integer|min:0',
                    'unit_price' => 'sometimes|required|numeric|min:0'
                ]);
                
                if ($validator->fails()) {
                    // Throws 422 with field-specific errors
                    throw new ValidationException($validator->errors()->toArray());
                }
                
                // 2. Find the product
                $product = Product::find($id);
                if (!$product) {
                    // Throws 404 with resource details
                    throw new ResourceNotFoundException('Product', $id);
                }
                
                // 3. Check business rules (example: cannot reduce quantity below reserved amount)
                if ($request->has('quantity')) {
                    $reservedQuantity = $product->reservations()->sum('quantity');
                    if ($request->quantity < $reservedQuantity) {
                        // Throws 409 with conflict details
                        throw ConflictException::insufficientInventory(
                            $request->quantity, 
                            $reservedQuantity, 
                            $product->name
                        );
                    }
                }
                
                // 4. Update the product
                $product->update($request->validated());
                
                // 5. Return success response
                return $this->success($product, 200);
            }
        }
        */
    }

    /**
     * Example: Service layer with comprehensive exception handling
     */
    public function completeServiceExample()
    {
        /*
        class InventoryService
        {
            public function processStockOut($productId, $quantity, $batchId = null)
            {
                try {
                    // 1. Find product
                    $product = Product::find($productId);
                    if (!$product) {
                        throw new ResourceNotFoundException('Product', $productId);
                    }
                    
                    // 2. Check available inventory
                    if ($product->quantity < $quantity) {
                        throw ConflictException::insufficientInventory(
                            $product->quantity, 
                            $quantity, 
                            $product->name
                        );
                    }
                    
                    // 3. Handle batch selection (FEFO rules)
                    if ($batchId) {
                        $batch = Batch::find($batchId);
                        if (!$batch) {
                            throw new ResourceNotFoundException('Batch', $batchId);
                        }
                        
                        // Check if this violates FEFO rules
                        $earlierBatch = Batch::where('product_id', $productId)
                            ->where('expiry_date', '<', $batch->expiry_date)
                            ->where('quantity', '>', 0)
                            ->first();
                            
                        if ($earlierBatch) {
                            throw ConflictException::fefoViolation($batchId, $earlierBatch->id);
                        }
                        
                        // Check batch has sufficient quantity
                        if ($batch->quantity < $quantity) {
                            throw ConflictException::insufficientInventory(
                                $batch->quantity, 
                                $quantity, 
                                "Batch {$batchId}"
                            );
                        }
                    }
                    
                    // 4. Process the stock movement
                    DB::transaction(function() use ($product, $quantity, $batch) {
                        $product->decrement('quantity', $quantity);
                        
                        if ($batch) {
                            $batch->decrement('quantity', $quantity);
                        }
                        
                        StockTransaction::create([
                            'product_id' => $product->id,
                            'batch_id' => $batch?->id,
                            'type' => 'out',
                            'quantity' => $quantity,
                            'reference' => 'Stock out operation'
                        ]);
                    });
                    
                    return [
                        'product_id' => $product->id,
                        'quantity_removed' => $quantity,
                        'remaining_quantity' => $product->fresh()->quantity
                    ];
                    
                } catch (PDOException $e) {
                    // Database connection issues
                    throw ServiceUnavailableException::databaseUnavailable(
                        config('database.default'),
                        'Database connection failed during stock transaction'
                    );
                }
            }
        }
        */
    }
}