"""
Network flow simulation for TrackWise Railway Optimization System
"""

import asyncio
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass
from collections import defaultdict, deque

from .base import BaseSimulator, SimulationEvent, SimulationConfig, SimulationResult, SimulationStatus, SimulationType

logger = logging.getLogger(__name__)


@dataclass
class NetworkNode:
    """Network node (junction/station) representation"""
    node_id: int
    node_type: str  # "station", "junction", "terminal"
    capacity: int
    current_occupancy: int
    processing_time: float  # minutes
    coordinates: Optional[Tuple[float, float]] = None
    
    def utilization(self) -> float:
        """Calculate current utilization"""
        return self.current_occupancy / max(self.capacity, 1)
    
    def is_available(self) -> bool:
        """Check if node has available capacity"""
        return self.current_occupancy < self.capacity


@dataclass
class NetworkEdge:
    """Network edge (section) representation"""
    edge_id: int
    from_node: int
    to_node: int
    length_km: float
    capacity: int
    current_flow: int
    max_speed_kmh: float
    travel_time_minutes: float
    status: str = "AVAILABLE"
    
    def utilization(self) -> float:
        """Calculate current utilization"""
        return self.current_flow / max(self.capacity, 1)
    
    def is_available(self) -> bool:
        """Check if edge has available capacity"""
        return self.current_flow < self.capacity and self.status == "AVAILABLE"


@dataclass
class FlowUnit:
    """Unit of flow through the network (train or train group)"""
    unit_id: int
    origin_node: int
    destination_node: int
    current_node: int
    current_edge: Optional[int]
    route: List[int]
    route_index: int
    arrival_time: datetime
    departure_time: Optional[datetime]
    priority: int
    flow_type: str  # "passenger", "freight", "maintenance"
    
    def get_next_node(self) -> Optional[int]:
        """Get next node in route"""
        if self.route_index + 1 < len(self.route):
            return self.route[self.route_index + 1]
        return None


class NetworkSimulator(BaseSimulator):
    """Network flow simulator for railway systems"""
    
    def __init__(self):
        super().__init__(SimulationType.NETWORK_FLOW)
        self.nodes: Dict[int, NetworkNode] = {}
        self.edges: Dict[int, NetworkEdge] = {}
        self.flow_units: Dict[int, FlowUnit] = {}
        self.network_graph: Dict[int, List[int]] = {}  # adjacency list
        self.flow_queues: Dict[int, deque] = defaultdict(deque)  # node_id -> queue of waiting units
        self.routing_table: Dict[Tuple[int, int], List[int]] = {}  # (origin, dest) -> route
        self.time_step = 1.0  # minutes
        
    async def initialize(self, config: SimulationConfig, initial_data: Dict[str, Any]) -> bool:
        """Initialize the network simulator"""
        try:
            self.current_state = self._create_initial_state(initial_data)
            
            # Build network topology
            await self._build_network(initial_data.get("sections", []))
            
            # Initialize flow units from trains
            await self._initialize_flow_units(initial_data.get("trains", []))
            
            # Precompute routing table
            await self._compute_routing_table()
            
            logger.info(f"Network simulator initialized with {len(self.nodes)} nodes, {len(self.edges)} edges, {len(self.flow_units)} flow units")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize network simulator: {e}")
            return False
    
    async def step(self) -> bool:
        """Execute one network simulation step"""
        try:
            # Process flow at each node
            await self._process_node_flows()
            
            # Move flow units along edges
            await self._update_edge_flows()
            
            # Generate new flow units (arrivals)
            await self._generate_new_flows()
            
            # Update network metrics
            await self._update_network_metrics()
            
            # Advance simulation time
            self.current_state.simulation_time += timedelta(minutes=self.time_step)
            self.current_state.real_time = datetime.utcnow()
            
            self._update_metrics()
            
            return True
            
        except Exception as e:
            logger.error(f"Error in network simulation step: {e}")
            return False
    
    async def finalize(self) -> SimulationResult:
        """Finalize the network simulation"""
        end_time = datetime.utcnow()
        
        # Calculate network performance metrics
        final_metrics = await self._calculate_network_metrics()
        
        return SimulationResult(
            simulation_id=self.simulation_id,
            status=SimulationStatus.COMPLETED if not self.is_cancelled else SimulationStatus.CANCELLED,
            start_time=self.start_time,
            end_time=end_time,
            final_state=self.current_state,
            metrics=final_metrics,
            events_processed=len(self.current_state.events) if self.current_state else 0
        )
    
    async def _build_network(self, sections: List[Dict[str, Any]]):
        """Build network topology from sections"""
        
        # Create nodes from unique section endpoints
        node_set = set()
        section_to_nodes = {}
        
        for i, section in enumerate(sections):
            # For simplicity, treat each section as an edge with nodes at endpoints
            start_node_id = i * 2
            end_node_id = i * 2 + 1
            
            node_set.add(start_node_id)
            node_set.add(end_node_id)
            section_to_nodes[section["id"]] = (start_node_id, end_node_id)
        
        # Create network nodes
        for node_id in node_set:
            # Determine node type based on connections (simplified)
            node_type = "junction" if node_id % 4 == 0 else "station"
            capacity = 3 if node_type == "junction" else 2
            
            self.nodes[node_id] = NetworkNode(
                node_id=node_id,
                node_type=node_type,
                capacity=capacity,
                current_occupancy=0,
                processing_time=2.0 if node_type == "station" else 1.0
            )
        
        # Create network edges from sections
        for section in sections:
            start_node, end_node = section_to_nodes[section["id"]]
            
            # Calculate travel time
            length = section.get("length_km", 10.0)
            max_speed = section.get("max_speed_kmh", 80.0)
            travel_time = (length / max_speed) * 60  # minutes
            
            edge = NetworkEdge(
                edge_id=section["id"],
                from_node=start_node,
                to_node=end_node,
                length_km=length,
                capacity=section.get("max_capacity", 1),
                current_flow=0,
                max_speed_kmh=max_speed,
                travel_time_minutes=travel_time,
                status=section.get("status", "AVAILABLE")
            )
            
            self.edges[section["id"]] = edge
            
            # Build adjacency list
            if start_node not in self.network_graph:
                self.network_graph[start_node] = []
            self.network_graph[start_node].append(end_node)
    
    async def _initialize_flow_units(self, trains: List[Dict[str, Any]]):
        """Initialize flow units from train data"""
        
        for train in trains:
            train_id = train["id"]
            
            # Determine origin and destination nodes
            route = train.get("route", [])
            if len(route) < 2:
                continue
            
            # Map route sections to nodes
            node_route = []
            for section_id in route:
                if section_id in self.edges:
                    edge = self.edges[section_id]
                    if not node_route:
                        node_route.append(edge.from_node)
                    node_route.append(edge.to_node)
            
            if len(node_route) < 2:
                continue
            
            origin_node = node_route[0]
            destination_node = node_route[-1]
            
            # Determine current position
            current_section = train.get("current_section")
            current_node = origin_node
            current_edge = None
            
            if current_section and current_section in self.edges:
                current_edge = current_section
                edge = self.edges[current_section]
                current_node = edge.from_node
            
            # Create flow unit
            flow_unit = FlowUnit(
                unit_id=train_id,
                origin_node=origin_node,
                destination_node=destination_node,
                current_node=current_node,
                current_edge=current_edge,
                route=node_route,
                route_index=0,
                arrival_time=self.current_state.simulation_time,
                departure_time=None,
                priority=train.get("priority_level", 1),
                flow_type=train.get("train_type", "passenger").lower()
            )
            
            self.flow_units[train_id] = flow_unit
            
            # Add to current node's queue
            self.flow_queues[current_node].append(flow_unit)
            if current_node in self.nodes:
                self.nodes[current_node].current_occupancy += 1
    
    async def _compute_routing_table(self):
        """Precompute shortest paths between all node pairs"""
        
        # Use Floyd-Warshall algorithm for all-pairs shortest paths
        nodes = list(self.nodes.keys())
        n = len(nodes)
        node_index = {node: i for i, node in enumerate(nodes)}
        
        # Initialize distance matrix
        INF = float('inf')
        dist = [[INF for _ in range(n)] for _ in range(n)]
        next_node = [[None for _ in range(n)] for _ in range(n)]
        
        # Initialize distances for direct edges
        for i in range(n):
            dist[i][i] = 0
        
        for edge in self.edges.values():
            i = node_index[edge.from_node]
            j = node_index[edge.to_node]
            dist[i][j] = edge.travel_time_minutes
            next_node[i][j] = edge.to_node
        
        # Floyd-Warshall algorithm
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    if dist[i][k] + dist[k][j] < dist[i][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
                        next_node[i][j] = next_node[i][k]
        
        # Build routing table
        for i, origin in enumerate(nodes):
            for j, destination in enumerate(nodes):
                if dist[i][j] < INF and i != j:
                    route = []
                    current = origin
                    while current != destination:
                        route.append(current)
                        current = next_node[node_index[current]][j]
                    route.append(destination)
                    self.routing_table[(origin, destination)] = route
    
    async def _process_node_flows(self):
        """Process flow units at each node"""
        
        for node_id, node in self.nodes.items():
            if not self.flow_queues[node_id]:
                continue
            
            # Process queue based on node capacity and processing time
            processed_units = []
            
            while (self.flow_queues[node_id] and 
                   len(processed_units) < node.capacity):
                
                flow_unit = self.flow_queues[node_id].popleft()
                
                # Check if unit has reached destination
                if flow_unit.current_node == flow_unit.destination_node:
                    await self._complete_flow_unit(flow_unit)
                    processed_units.append(flow_unit)
                    continue
                
                # Find next edge in route
                next_node = flow_unit.get_next_node()
                if next_node is None:
                    # No next node - unit is stuck
                    await self._handle_stuck_unit(flow_unit)
                    continue
                
                # Find edge to next node
                next_edge = self._find_edge(flow_unit.current_node, next_node)
                if next_edge is None or not next_edge.is_available():
                    # No available edge - unit waits
                    self.flow_queues[node_id].append(flow_unit)
                    break
                
                # Move unit to edge
                await self._move_unit_to_edge(flow_unit, next_edge)
                processed_units.append(flow_unit)
            
            # Update node occupancy
            node.current_occupancy = len(self.flow_queues[node_id])
    
    async def _update_edge_flows(self):
        """Update flow units moving along edges"""
        
        completed_moves = []
        
        for flow_unit in self.flow_units.values():
            if flow_unit.current_edge is None:
                continue
            
            edge = self.edges[flow_unit.current_edge]
            
            # Check if unit has completed edge traversal
            if flow_unit.departure_time:
                arrival_time = flow_unit.departure_time + timedelta(minutes=edge.travel_time_minutes)
                if self.current_state.simulation_time >= arrival_time:
                    completed_moves.append(flow_unit)
        
        # Process completed moves
        for flow_unit in completed_moves:
            await self._complete_edge_traversal(flow_unit)
    
    async def _generate_new_flows(self):
        """Generate new flow units (train arrivals)"""
        
        # Simple random generation for demonstration
        if np.random.random() < 0.1:  # 10% chance per time step
            await self._generate_random_flow_unit()
    
    async def _move_unit_to_edge(self, flow_unit: FlowUnit, edge: NetworkEdge):
        """Move flow unit from node to edge"""
        
        # Remove from current node
        if flow_unit.current_node in self.nodes:
            self.nodes[flow_unit.current_node].current_occupancy -= 1
        
        # Update flow unit
        flow_unit.current_edge = edge.edge_id
        flow_unit.departure_time = self.current_state.simulation_time
        flow_unit.route_index += 1
        
        # Update edge flow
        edge.current_flow += 1
        
        # Generate event
        event = SimulationEvent(
            event_id=f"edge_entry_{flow_unit.unit_id}_{edge.edge_id}",
            event_type="edge_entry",
            timestamp=self.current_state.simulation_time,
            entity_id=flow_unit.unit_id,
            data={
                "flow_unit_id": flow_unit.unit_id,
                "edge_id": edge.edge_id,
                "from_node": edge.from_node,
                "to_node": edge.to_node
            }
        )
        self.current_state.events.append(event)
        await self.emit_event(event)
    
    async def _complete_edge_traversal(self, flow_unit: FlowUnit):
        """Complete flow unit traversal of an edge"""
        
        edge = self.edges[flow_unit.current_edge]
        
        # Update flow unit
        flow_unit.current_node = edge.to_node
        flow_unit.current_edge = None
        flow_unit.departure_time = None
        
        # Update edge flow
        edge.current_flow -= 1
        
        # Add to destination node queue
        self.flow_queues[edge.to_node].append(flow_unit)
        if edge.to_node in self.nodes:
            self.nodes[edge.to_node].current_occupancy += 1
        
        # Generate event
        event = SimulationEvent(
            event_id=f"node_arrival_{flow_unit.unit_id}_{edge.to_node}",
            event_type="node_arrival",
            timestamp=self.current_state.simulation_time,
            entity_id=flow_unit.unit_id,
            data={
                "flow_unit_id": flow_unit.unit_id,
                "node_id": edge.to_node,
                "from_edge": edge.edge_id
            }
        )
        self.current_state.events.append(event)
        await self.emit_event(event)
    
    async def _complete_flow_unit(self, flow_unit: FlowUnit):
        """Complete flow unit journey"""
        
        # Remove from system
        if flow_unit.unit_id in self.flow_units:
            del self.flow_units[flow_unit.unit_id]
        
        # Generate completion event
        event = SimulationEvent(
            event_id=f"journey_complete_{flow_unit.unit_id}",
            event_type="journey_completion",
            timestamp=self.current_state.simulation_time,
            entity_id=flow_unit.unit_id,
            data={
                "flow_unit_id": flow_unit.unit_id,
                "origin_node": flow_unit.origin_node,
                "destination_node": flow_unit.destination_node,
                "journey_time": (self.current_state.simulation_time - flow_unit.arrival_time).total_seconds() / 60
            }
        )
        self.current_state.events.append(event)
        await self.emit_event(event)
    
    async def _handle_stuck_unit(self, flow_unit: FlowUnit):
        """Handle flow unit that cannot proceed"""
        
        # For now, just complete the unit
        await self._complete_flow_unit(flow_unit)
        
        # Generate stuck event
        event = SimulationEvent(
            event_id=f"unit_stuck_{flow_unit.unit_id}",
            event_type="flow_stuck",
            timestamp=self.current_state.simulation_time,
            entity_id=flow_unit.unit_id,
            data={
                "flow_unit_id": flow_unit.unit_id,
                "stuck_node": flow_unit.current_node,
                "reason": "no_available_route"
            }
        )
        self.current_state.events.append(event)
        await self.emit_event(event)
    
    def _find_edge(self, from_node: int, to_node: int) -> Optional[NetworkEdge]:
        """Find edge between two nodes"""
        
        for edge in self.edges.values():
            if edge.from_node == from_node and edge.to_node == to_node:
                return edge
        return None
    
    async def _generate_random_flow_unit(self):
        """Generate a random flow unit"""
        
        if len(self.nodes) < 2:
            return
        
        # Select random origin and destination
        nodes = list(self.nodes.keys())
        origin = np.random.choice(nodes)
        destination = np.random.choice([n for n in nodes if n != origin])
        
        # Get route from routing table
        route = self.routing_table.get((origin, destination), [origin, destination])
        
        # Create new flow unit
        new_unit_id = max(self.flow_units.keys()) + 1 if self.flow_units else 1000
        
        flow_unit = FlowUnit(
            unit_id=new_unit_id,
            origin_node=origin,
            destination_node=destination,
            current_node=origin,
            current_edge=None,
            route=route,
            route_index=0,
            arrival_time=self.current_state.simulation_time,
            departure_time=None,
            priority=np.random.randint(1, 4),
            flow_type="passenger"
        )
        
        self.flow_units[new_unit_id] = flow_unit
        self.flow_queues[origin].append(flow_unit)
        
        if origin in self.nodes:
            self.nodes[origin].current_occupancy += 1
    
    async def _update_network_metrics(self):
        """Update network-level metrics"""
        
        # Calculate network utilization
        total_node_capacity = sum(node.capacity for node in self.nodes.values())
        total_node_occupancy = sum(node.current_occupancy for node in self.nodes.values())
        node_utilization = total_node_occupancy / max(total_node_capacity, 1)
        
        total_edge_capacity = sum(edge.capacity for edge in self.edges.values())
        total_edge_flow = sum(edge.current_flow for edge in self.edges.values())
        edge_utilization = total_edge_flow / max(total_edge_capacity, 1)
        
        # Calculate queue lengths
        total_queue_length = sum(len(queue) for queue in self.flow_queues.values())
        max_queue_length = max((len(queue) for queue in self.flow_queues.values()), default=0)
        
        # Update current state metrics
        self.current_state.metrics.update({
            "network_node_utilization": node_utilization,
            "network_edge_utilization": edge_utilization,
            "total_flow_units": len(self.flow_units),
            "total_queue_length": total_queue_length,
            "max_queue_length": max_queue_length,
            "active_flows": sum(1 for unit in self.flow_units.values() if unit.current_edge is not None)
        })
    
    async def _calculate_network_metrics(self) -> Dict[str, Any]:
        """Calculate final network performance metrics"""
        
        # Node metrics
        node_metrics = {}
        for node_id, node in self.nodes.items():
            node_metrics[node_id] = {
                "utilization": node.utilization(),
                "total_processed": 0,  # Would track in real implementation
                "average_processing_time": node.processing_time,
                "queue_length": len(self.flow_queues[node_id])
            }
        
        # Edge metrics
        edge_metrics = {}
        for edge_id, edge in self.edges.items():
            edge_metrics[edge_id] = {
                "utilization": edge.utilization(),
                "total_flow": 0,  # Would track in real implementation
                "average_travel_time": edge.travel_time_minutes,
                "current_flow": edge.current_flow
            }
        
        # Overall network metrics
        avg_node_utilization = np.mean([node.utilization() for node in self.nodes.values()])
        avg_edge_utilization = np.mean([edge.utilization() for edge in self.edges.values()])
        
        return {
            "network_performance": {
                "average_node_utilization": avg_node_utilization,
                "average_edge_utilization": avg_edge_utilization,
                "total_nodes": len(self.nodes),
                "total_edges": len(self.edges),
                "final_flow_units": len(self.flow_units)
            },
            "node_metrics": node_metrics,
            "edge_metrics": edge_metrics,
            "events_generated": len(self.current_state.events)
        }


# Export classes
__all__ = [
    "NetworkSimulator",
    "NetworkNode",
    "NetworkEdge",
    "FlowUnit"
]