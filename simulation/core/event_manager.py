import heapq
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
import logging
import asyncio

logger = logging.getLogger(__name__)

class SimulationEvent:
    """Represents a simulation event"""
    
    def __init__(self, time: datetime, event_type: str, data: Dict[str, Any], priority: int = 0):
        self.time = time
        self.event_type = event_type
        self.data = data
        self.priority = priority
        self.event_id = f"{event_type}_{time.strftime('%Y%m%d_%H%M%S_%f')}"
    
    def __lt__(self, other):
        """For heap ordering - earlier times have higher priority"""
        if self.time != other.time:
            return self.time < other.time
        return self.priority < other.priority
    
    def __eq__(self, other):
        return self.time == other.time and self.event_type == other.event_type
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'event_id': self.event_id,
            'time': self.time.isoformat(),
            'event_type': self.event_type,
            'data': self.data,
            'priority': self.priority
        }

class EventManager:
    """Manages simulation events using a priority queue"""
    
    def __init__(self):
        self.event_queue = []  # Priority queue (heap)
        self.processed_events = []
        self.event_handlers = {}
        self.event_stats = {
            'total_scheduled': 0,
            'total_processed': 0,
            'events_by_type': {}
        }
    
    def schedule_event(self, time: datetime, event_type: str, data: Dict[str, Any], priority: int = 0):
        """Schedule a new event"""
        event = SimulationEvent(time, event_type, data, priority)
        heapq.heappush(self.event_queue, event)
        
        self.event_stats['total_scheduled'] += 1
        if event_type not in self.event_stats['events_by_type']:
            self.event_stats['events_by_type'][event_type] = {'scheduled': 0, 'processed': 0}
        self.event_stats['events_by_type'][event_type]['scheduled'] += 1
        
        logger.debug(f"Scheduled event {event.event_id} at {time}")
    
    def get_events_at_time(self, current_time: datetime) -> List[SimulationEvent]:
        """Get all events that should be processed at the current time"""
        events_to_process = []
        
        while self.event_queue and self.event_queue[0].time <= current_time:
            event = heapq.heappop(self.event_queue)
            events_to_process.append(event)
            self.processed_events.append(event)
            
            self.event_stats['total_processed'] += 1
            if event.event_type in self.event_stats['events_by_type']:
                self.event_stats['events_by_type'][event.event_type]['processed'] += 1
        
        return events_to_process
    
    def get_next_event_time(self) -> Optional[datetime]:
        """Get the time of the next scheduled event"""
        if self.event_queue:
            return self.event_queue[0].time
        return None
    
    def cancel_events(self, filter_func: Callable[[SimulationEvent], bool]):
        """Cancel events that match the filter function"""
        cancelled_events = []
        remaining_events = []
        
        for event in self.event_queue:
            if filter_func(event):
                cancelled_events.append(event)
            else:
                remaining_events.append(event)
        
        # Rebuild heap
        self.event_queue = remaining_events
        heapq.heapify(self.event_queue)
        
        logger.info(f"Cancelled {len(cancelled_events)} events")
        return cancelled_events
    
    def register_handler(self, event_type: str, handler: Callable):
        """Register an event handler for a specific event type"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)
        logger.debug(f"Registered handler for event type: {event_type}")
    
    async def process_event(self, event: SimulationEvent):
        """Process an event using registered handlers"""
        if event.event_type in self.event_handlers:
            for handler in self.event_handlers[event.event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)
                except Exception as e:
                    logger.error(f"Error in event handler for {event.event_type}: {str(e)}")
        else:
            logger.warning(f"No handler registered for event type: {event.event_type}")
    
    def get_pending_events(self) -> List[Dict[str, Any]]:
        """Get list of pending events"""
        return [event.to_dict() for event in sorted(self.event_queue)]
    
    def get_processed_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get list of recently processed events"""
        return [event.to_dict() for event in self.processed_events[-limit:]]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get event processing statistics"""
        return {
            'total_scheduled': self.event_stats['total_scheduled'],
            'total_processed': self.event_stats['total_processed'],
            'pending_events': len(self.event_queue),
            'events_by_type': self.event_stats['events_by_type'],
            'processing_rate': (
                self.event_stats['total_processed'] / max(1, self.event_stats['total_scheduled'])
            )
        }
    
    def clear_events(self):
        """Clear all events"""
        self.event_queue.clear()
        self.processed_events.clear()
        self.event_stats = {
            'total_scheduled': 0,
            'total_processed': 0,
            'events_by_type': {}
        }
        logger.info("Cleared all events")
    
    def schedule_recurring_event(
        self, 
        start_time: datetime, 
        interval: timedelta, 
        event_type: str, 
        data: Dict[str, Any], 
        count: Optional[int] = None,
        end_time: Optional[datetime] = None
    ):
        """Schedule a recurring event"""
        current_time = start_time
        events_scheduled = 0
        
        while True:
            # Check stopping conditions
            if count is not None and events_scheduled >= count:
                break
            if end_time is not None and current_time > end_time:
                break
            
            # Schedule the event
            event_data = data.copy()
            event_data['recurring_sequence'] = events_scheduled
            self.schedule_event(current_time, event_type, event_data)
            
            # Move to next occurrence
            current_time += interval
            events_scheduled += 1
        
        logger.info(f"Scheduled {events_scheduled} recurring events of type {event_type}")