<?php

namespace App\Core\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * StatusCodeMiddleware
 * 
 * Middleware to log API responses with status codes for monitoring and debugging.
 * Captures endpoint, method, status code, user ID, and timestamp for comprehensive request tracking.
 * 
 * Requirements: 4.1 (Server Error Status Codes), 10.1 (Status Code Validation and Testing)
 */
class StatusCodeMiddleware
{
    /**
     * Handle an incoming request and log the response status code.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        
        // Log API response with comprehensive details
        $this->logApiResponse($request, $response);
        
        return $response;
    }

    /**
     * Log API response details for monitoring and debugging.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Symfony\Component\HttpFoundation\Response  $response
     * @return void
     */
    private function logApiResponse(Request $request, Response $response): void
    {
        $statusCode = $response->getStatusCode();
        $logLevel = $this->getLogLevelForStatusCode($statusCode);
        
        $logData = [
            'endpoint' => $request->getPathInfo(),
            'method' => $request->getMethod(),
            'status_code' => $statusCode,
            'user_id' => auth()->id(),
            'timestamp' => now()->toISOString(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'request_id' => $request->header('X-Request-ID', uniqid('req_', true)),
        ];

        // Add response time if available
        if ($request->hasHeader('X-Request-Start')) {
            $startTime = (float) $request->header('X-Request-Start');
            $logData['response_time_ms'] = round((microtime(true) - $startTime) * 1000, 2);
        }

        // Add additional context for error responses
        if ($statusCode >= 400) {
            $logData = array_merge($logData, $this->getErrorContext($request, $response));
        }

        // Log with appropriate level based on status code
        Log::log($logLevel, $this->getLogMessage($statusCode), $logData);
    }

    /**
     * Determine appropriate log level based on HTTP status code.
     *
     * @param  int  $statusCode
     * @return string
     */
    private function getLogLevelForStatusCode(int $statusCode): string
    {
        return match (true) {
            $statusCode >= 500 => 'error',
            $statusCode >= 400 => 'warning',
            $statusCode >= 300 => 'info',
            default => 'info'
        };
    }

    /**
     * Generate log message based on status code.
     *
     * @param  int  $statusCode
     * @return string
     */
    private function getLogMessage(int $statusCode): string
    {
        return match (true) {
            $statusCode >= 500 => 'Server Error Response',
            $statusCode >= 400 => 'Client Error Response',
            $statusCode >= 300 => 'Redirect Response',
            $statusCode >= 200 => 'Success Response',
            default => 'API Response'
        };
    }

    /**
     * Get additional error context for 4xx and 5xx responses.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Symfony\Component\HttpFoundation\Response  $response
     * @return array
     */
    private function getErrorContext(Request $request, Response $response): array
    {
        $context = [];

        // Add request body for POST/PATCH/PUT requests (but mask sensitive data)
        if (in_array($request->getMethod(), ['POST', 'PATCH', 'PUT']) && $request->getContent()) {
            $requestBody = json_decode($request->getContent(), true);
            if (is_array($requestBody)) {
                $context['request_data'] = $this->maskSensitiveData($requestBody);
            }
        }

        // Add query parameters for GET requests
        if ($request->getMethod() === 'GET' && $request->query->count() > 0) {
            $context['query_params'] = $request->query->all();
        }

        // Add error details from JSON response if available
        if ($response->headers->get('content-type') === 'application/json') {
            $responseContent = json_decode($response->getContent(), true);
            if (is_array($responseContent) && isset($responseContent['error'])) {
                $context['error_details'] = [
                    'code' => $responseContent['error']['code'] ?? 'UNKNOWN',
                    'message' => $responseContent['error']['message'] ?? 'No message provided',
                ];
                
                // Add validation errors if present
                if (isset($responseContent['error']['context']['errors'])) {
                    $context['validation_errors'] = array_keys($responseContent['error']['context']['errors']);
                }
            }
        }

        return $context;
    }

    /**
     * Mask sensitive data from request body for logging.
     *
     * @param  array  $data
     * @return array
     */
    private function maskSensitiveData(array $data): array
    {
        $sensitiveFields = [
            'password',
            'password_confirmation', 
            'token',
            'api_key',
            'secret',
            'credit_card',
            'ssn',
            'pin',
            'otp'
        ];

        $masked = $data;

        foreach ($sensitiveFields as $field) {
            if (isset($masked[$field])) {
                $masked[$field] = '***MASKED***';
            }
        }

        return $masked;
    }
}