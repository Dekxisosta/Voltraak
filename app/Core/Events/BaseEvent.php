<?php

namespace App\Core\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

/**
 * Base event class for all IMS events
 */
abstract class BaseEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Carbon $timestamp;
    public ?int $userId;
    public array $context;

    /**
     * Create a new event instance.
     */
    public function __construct(?int $userId = null, array $context = [])
    {
        $this->timestamp = Carbon::now();
        $this->userId = $userId ?? auth()->id();
        $this->context = $context;
    }

    /**
     * Get event name for logging
     */
    abstract public function getEventName(): string;

    /**
     * Get event data for serialization
     */
    public function getEventData(): array
    {
        return [
            'event' => $this->getEventName(),
            'timestamp' => $this->timestamp->toISOString(),
            'user_id' => $this->userId,
            'context' => $this->context,
        ];
    }
}