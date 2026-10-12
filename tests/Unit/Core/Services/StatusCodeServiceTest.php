<?php

namespace Tests\Unit\Core\Services;

use Tests\TestCase;
use App\Core\Services\StatusCodeService;
use Illuminate\Http\JsonResponse;

class StatusCodeServiceTest extends TestCase
{
    private StatusCodeService $statusCodeService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->statusCodeService = new StatusCodeService();
    }

    /** @test */
    public function it_creates_success_response_with_default_200_status()
    {
        $data = ['test' => 'data'];
        $response = $this->statusCodeService->successResponse($data);

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(200, $response->getStatusCode());
        
        $responseData = $response->getData(true);
        $this->assertTrue($responseData['success']);
        $this->assertEquals($data, $responseData['data']);
        $this->assertArrayHasKey('timestamp', $responseData);
    }

    /** @test */
    public function it_creates_success_response_with_custom_status_code()
    {
        $data = ['id' => 1];
        $response = $this->statusCodeService->successResponse($data, 201);

        $this->assertEquals(201, $response->getStatusCode());
    }

    /** @test */
    public function it_creates_error_response_with_standardized_format()
    {
        $response = $this->statusCodeService->errorResponse(
            'Test error',
            400,
            'TEST_ERROR',
            ['field' => 'invalid']
        );

        $this->assertEquals(400, $response->getStatusCode());
        
        $responseData = $response->getData(true);
        $this->assertFalse($responseData['success']);
        $this->assertEquals('Test error', $responseData['error']['message']);
        $this->assertEquals('TEST_ERROR', $responseData['error']['code']);
        $this->assertEquals(['field' => 'invalid'], $responseData['error']['context']);
    }

    /** @test */
    public function it_validates_allowed_status_codes()
    {
        $this->assertTrue($this->statusCodeService->validateStatusCode(200));
        $this->assertTrue($this->statusCodeService->validateStatusCode(404));
        $this->assertTrue($this->statusCodeService->validateStatusCode(500));
    }

    /** @test */
    public function it_throws_exception_for_invalid_status_codes()
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->statusCodeService->validateStatusCode(418); // Not in allowed list
    }

    /** @test */
    public function it_provides_convenience_methods()
    {
        $data = ['test' => 'ok'];

        // Test OK method
        $okResponse = $this->statusCodeService->ok($data);
        $this->assertEquals(200, $okResponse->getStatusCode());

        // Test Created method
        $createdResponse = $this->statusCodeService->created($data);
        $this->assertEquals(201, $createdResponse->getStatusCode());

        // Test No Content method
        $noContentResponse = $this->statusCodeService->noContent();
        $this->assertEquals(204, $noContentResponse->getStatusCode());
    }

    /** @test */
    public function it_provides_error_convenience_methods()
    {
        // Test Bad Request
        $badRequestResponse = $this->statusCodeService->badRequest();
        $this->assertEquals(400, $badRequestResponse->getStatusCode());

        // Test Unauthorized
        $unauthorizedResponse = $this->statusCodeService->unauthorized();
        $this->assertEquals(401, $unauthorizedResponse->getStatusCode());

        // Test Forbidden
        $forbiddenResponse = $this->statusCodeService->forbidden();
        $this->assertEquals(403, $forbiddenResponse->getStatusCode());

        // Test Not Found
        $notFoundResponse = $this->statusCodeService->notFound();
        $this->assertEquals(404, $notFoundResponse->getStatusCode());
    }

    /** @test */
    public function it_categorizes_status_codes_correctly()
    {
        $this->assertTrue($this->statusCodeService->isSuccess(200));
        $this->assertTrue($this->statusCodeService->isSuccess(201));
        $this->assertFalse($this->statusCodeService->isSuccess(400));

        $this->assertTrue($this->statusCodeService->isClientError(400));
        $this->assertTrue($this->statusCodeService->isClientError(404));
        $this->assertFalse($this->statusCodeService->isClientError(500));

        $this->assertTrue($this->statusCodeService->isServerError(500));
        $this->assertTrue($this->statusCodeService->isServerError(503));
        $this->assertFalse($this->statusCodeService->isServerError(400));
    }

    /** @test */
    public function it_returns_correct_status_category_names()
    {
        $this->assertEquals('Success', $this->statusCodeService->getStatusCategory(200));
        $this->assertEquals('Client Error', $this->statusCodeService->getStatusCategory(400));
        $this->assertEquals('Server Error', $this->statusCodeService->getStatusCategory(500));
        $this->assertEquals('Unknown', $this->statusCodeService->getStatusCategory(999));
    }

    /** @test */
    public function it_returns_allowed_status_codes_list()
    {
        $allowedCodes = $this->statusCodeService->getAllowedStatusCodes();
        
        $this->assertIsArray($allowedCodes);
        $this->assertContains(200, $allowedCodes);
        $this->assertContains(404, $allowedCodes);
        $this->assertContains(500, $allowedCodes);
        $this->assertNotContains(418, $allowedCodes);
    }
}