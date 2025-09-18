"""
Route optimization for TrackWise Railway Optimization System
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass
import heapq

from .base import BaseOptimizer, OptimizationProblem, OptimizationResult, OptimizationStatus
from .solver_factory import SolverFactory

logger = logging.getLogger(__name__)


@dataclass
class RouteSegment:
    """Route segment data structure"""
    from_section: int
    to_section: int
    distance: float
    travel_time: int  # minutes
    capacity: int
    current_load: int
    cost: float


@dataclass
class RouteOption:
    """Route option with metadata"""
    route: List[int]  # List of section IDs
    total_distance: float
    total_time: int  # minutes
    total_cost: float
    congestion_score: float
    safety_score: float
    feasible: bool


class RouteOptimizer:
    """Optimizer for train routing problems"""
    
    def __init__(self, solver_type: Optional[str] = None):
        self.solver_type = solver_type or "heuristic"
        self.section_graph: Dict[int, List[RouteSegment]] = {}
        self.route_cache: Dict[Tuple[int, int], List[RouteOption]] = {}
        
    async def optimize_routes(
        self,
        trains: List[Dict[str, Any]],
        sections: List[Dict[str, Any]],
        objectives: Optional[List[str]] = None,
        constraints: Optional[List[Dict[str, Any]]] = None
    ) -> OptimizationResult:
        """Optimize routes for multiple trains"""
        
        logger.info(f"Starting route optimization for {len(trains)} trains")
        
        # Build section graph
        await self._build_section_graph(sections)
        
        # Set default objectives
        if objectives is None:
            objectives = ["minimize_distance", "minimize_time", "minimize_congestion"]
        
        # Create optimization problem
        problem = self._create_route_problem(trains, sections, objectives, constraints)
        
        # Solve route optimization
        if self.solver_type == "dijkstra":
            result = await self._solve_with_dijkstra(problem)
        elif self.solver_type == "a_star":
            result = await self._solve_with_a_star(problem)
        else:
            # Use general solver framework
            solver = SolverFactory.create_solver(self.solver_type)
            result = await solver.solve(problem, timeout_seconds=300)
        
        return result
    
    async def find_optimal_route(
        self,
        start_section: int,
        end_section: int,
        train_requirements: Optional[Dict[str, Any]] = None,
        avoid_sections: Optional[List[int]] = None
    ) -> RouteOption:
        """Find optimal route between two sections"""
        
        # Check cache first
        cache_key = (start_section, end_section)
        if cache_key in self.route_cache:
            cached_routes = self.route_cache[cache_key]
            if cached_routes:
                return cached_routes[0]  # Return best cached route
        
        # Find routes using different algorithms
        routes = []
        
        # Shortest path route
        shortest_route = await self._find_shortest_path(start_section, end_section, avoid_sections)
        if shortest_route:
            routes.append(shortest_route)
        
        # Fastest route
        fastest_route = await self._find_fastest_path(start_section, end_section, avoid_sections)
        if fastest_route and fastest_route.route != shortest_route.route:
            routes.append(fastest_route)
        
        # Low congestion route
        low_congestion_route = await self._find_low_congestion_path(start_section, end_section, avoid_sections)
        if low_congestion_route and low_congestion_route.route not in [r.route for r in routes]:
            routes.append(low_congestion_route)
        
        # Select best route based on multiple criteria
        best_route = self._select_best_route(routes, train_requirements)
        
        # Cache result
        self.route_cache[cache_key] = routes
        
        return best_route
    
    async def _build_section_graph(self, sections: List[Dict[str, Any]]):
        """Build graph representation of section network"""
        
        self.section_graph = {}
        
        for section in sections:
            section_id = section["id"]
            self.section_graph[section_id] = []
        
        # Build connections (simplified - assumes sections are connected if they're adjacent in ID)
        for section in sections:
            section_id = section["id"]
            
            # Connect to adjacent sections (simplified logic)
            for other_section in sections:
                other_id = other_section["id"]
                if abs(section_id - other_id) == 1:  # Adjacent sections
                    # Calculate segment properties
                    distance = section.get("length_km", 10.0)
                    max_speed = min(section.get("max_speed_kmh", 80), other_section.get("max_speed_kmh", 80))
                    travel_time = int((distance / max_speed) * 60) if max_speed > 0 else 30
                    
                    segment = RouteSegment(
                        from_section=section_id,
                        to_section=other_id,
                        distance=distance,
                        travel_time=travel_time,
                        capacity=section.get("max_capacity", 1),
                        current_load=0,  # Would be calculated from current train positions
                        cost=distance * 10  # Simple cost model
                    )
                    
                    self.section_graph[section_id].append(segment)
    
    def _create_route_problem(
        self,
        trains: List[Dict[str, Any]],
        sections: List[Dict[str, Any]],
        objectives: List[str],
        constraints: Optional[List[Dict[str, Any]]]
    ) -> OptimizationProblem:
        """Create optimization problem for routing"""
        
        # Variables: train routes and assignments
        variables = {
            "trains": trains,
            "sections": sections,
            "section_graph": {
                section_id: [
                    {
                        "to_section": seg.to_section,
                        "distance": seg.distance,
                        "travel_time": seg.travel_time,
                        "capacity": seg.capacity,
                        "cost": seg.cost
                    }
                    for seg in segments
                ]
                for section_id, segments in self.section_graph.items()
            }
        }
        
        # Constraints
        problem_constraints = constraints or []
        
        # Add capacity constraints for route segments
        for section_id, segments in self.section_graph.items():
            for segment in segments:
                problem_constraints.append({
                    "type": "segment_capacity",
                    "from_section": segment.from_section,
                    "to_section": segment.to_section,
                    "max_capacity": segment.capacity,
                    "description": f"Segment {segment.from_section}->{segment.to_section} capacity"
                })
        
        # Add route feasibility constraints
        for train in trains:
            problem_constraints.append({
                "type": "route_feasibility",
                "train_id": train["id"],
                "start_section": train.get("current_section"),
                "end_section": train.get("destination_section"),
                "description": f"Train {train['id']} must have valid route"
            })
        
        # Objectives
        problem_objectives = []
        for obj in objectives:
            if obj == "minimize_distance":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "total_distance",
                    "weight": 1.0
                })
            elif obj == "minimize_time":
                problem_objectives.append({
                    "type": "minimize", 
                    "function": "total_travel_time",
                    "weight": 1.5
                })
            elif obj == "minimize_congestion":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "route_congestion",
                    "weight": 2.0
                })
            elif obj == "minimize_cost":
                problem_objectives.append({
                    "type": "minimize",
                    "function": "total_cost",
                    "weight": 0.8
                })
        
        return OptimizationProblem(
            problem_type="route_optimization",
            variables=variables,
            constraints=problem_constraints,
            objectives=problem_objectives,
            parameters={
                "solver_timeout": 300,
                "max_route_length": 20
            }
        )
    
    async def _solve_with_dijkstra(self, problem: OptimizationProblem) -> OptimizationResult:
        """Solve routing using Dijkstra's algorithm"""
        
        start_time = datetime.utcnow()
        decisions = []
        
        try:
            trains = problem.variables["trains"]
            
            for train in trains:
                start_section = train.get("current_section")
                end_section = train.get("destination_section")
                
                if start_section and end_section:
                    route = await self._dijkstra_shortest_path(start_section, end_section)
                    
                    if route:
                        decision = {
                            "type": "route_assignment",
                            "train_id": train["id"],
                            "route": route.route,
                            "total_distance": route.total_distance,
                            "total_time": route.total_time,
                            "algorithm": "dijkstra"
                        }
                        decisions.append(decision)
            
            runtime = (datetime.utcnow() - start_time).total_seconds()
            total_distance = sum(d.get("total_distance", 0) for d in decisions)
            
            return OptimizationResult(
                status=OptimizationStatus.COMPLETED,
                objective_value=total_distance,
                runtime_seconds=runtime,
                solver_used="dijkstra",
                decisions=decisions
            )
            
        except Exception as e:
            logger.error(f"Dijkstra routing failed: {e}")
            runtime = (datetime.utcnow() - start_time).total_seconds()
            
            return OptimizationResult(
                status=OptimizationStatus.FAILED,
                runtime_seconds=runtime,
                solver_used="dijkstra",
                error_message=str(e)
            )
    
    async def _dijkstra_shortest_path(self, start: int, end: int) -> Optional[RouteOption]:
        """Find shortest path using Dijkstra's algorithm"""
        
        if start not in self.section_graph or end not in self.section_graph:
            return None
        
        # Initialize distances and previous nodes
        distances = {node: float('inf') for node in self.section_graph}
        distances[start] = 0
        previous = {}
        visited = set()
        
        # Priority queue: (distance, node)
        pq = [(0, start)]
        
        while pq:
            current_distance, current_node = heapq.heappop(pq)
            
            if current_node in visited:
                continue
            
            visited.add(current_node)
            
            if current_node == end:
                break
            
            # Check neighbors
            if current_node in self.section_graph:
                for segment in self.section_graph[current_node]:
                    neighbor = segment.to_section
                    distance = current_distance + segment.distance
                    
                    if distance < distances[neighbor]:
                        distances[neighbor] = distance
                        previous[neighbor] = current_node
                        heapq.heappush(pq, (distance, neighbor))
        
        # Reconstruct path
        if end not in previous and end != start:
            return None
        
        path = []
        current = end
        while current is not None:
            path.append(current)
            current = previous.get(current)
        
        path.reverse()
        
        # Calculate route properties
        total_distance = distances[end]
        total_time = 0
        total_cost = 0
        
        for i in range(len(path) - 1):
            from_section = path[i]
            to_section = path[i + 1]
            
            # Find segment
            for segment in self.section_graph.get(from_section, []):
                if segment.to_section == to_section:
                    total_time += segment.travel_time
                    total_cost += segment.cost
                    break
        
        return RouteOption(
            route=path,
            total_distance=total_distance,
            total_time=total_time,
            total_cost=total_cost,
            congestion_score=0.5,  # Default
            safety_score=0.9,      # Default
            feasible=True
        )
    
    async def _find_shortest_path(self, start: int, end: int, avoid: Optional[List[int]] = None) -> Optional[RouteOption]:
        """Find shortest distance path"""
        return await self._dijkstra_shortest_path(start, end)
    
    async def _find_fastest_path(self, start: int, end: int, avoid: Optional[List[int]] = None) -> Optional[RouteOption]:
        """Find fastest time path"""
        
        # Modified Dijkstra using travel time instead of distance
        if start not in self.section_graph or end not in self.section_graph:
            return None
        
        times = {node: float('inf') for node in self.section_graph}
        times[start] = 0
        previous = {}
        visited = set()
        pq = [(0, start)]
        
        while pq:
            current_time, current_node = heapq.heappop(pq)
            
            if current_node in visited:
                continue
            
            visited.add(current_node)
            
            if current_node == end:
                break
            
            if current_node in self.section_graph:
                for segment in self.section_graph[current_node]:
                    if avoid and segment.to_section in avoid:
                        continue
                    
                    neighbor = segment.to_section
                    time = current_time + segment.travel_time
                    
                    if time < times[neighbor]:
                        times[neighbor] = time
                        previous[neighbor] = current_node
                        heapq.heappush(pq, (time, neighbor))
        
        # Reconstruct path
        if end not in previous and end != start:
            return None
        
        path = []
        current = end
        while current is not None:
            path.append(current)
            current = previous.get(current)
        
        path.reverse()
        
        # Calculate properties
        total_time = times[end]
        total_distance = 0
        total_cost = 0
        
        for i in range(len(path) - 1):
            from_section = path[i]
            to_section = path[i + 1]
            
            for segment in self.section_graph.get(from_section, []):
                if segment.to_section == to_section:
                    total_distance += segment.distance
                    total_cost += segment.cost
                    break
        
        return RouteOption(
            route=path,
            total_distance=total_distance,
            total_time=int(total_time),
            total_cost=total_cost,
            congestion_score=0.4,
            safety_score=0.9,
            feasible=True
        )
    
    async def _find_low_congestion_path(self, start: int, end: int, avoid: Optional[List[int]] = None) -> Optional[RouteOption]:
        """Find path with low congestion"""
        
        # Modified Dijkstra using congestion-weighted cost
        if start not in self.section_graph or end not in self.section_graph:
            return None
        
        costs = {node: float('inf') for node in self.section_graph}
        costs[start] = 0
        previous = {}
        visited = set()
        pq = [(0, start)]
        
        while pq:
            current_cost, current_node = heapq.heappop(pq)
            
            if current_node in visited:
                continue
            
            visited.add(current_node)
            
            if current_node == end:
                break
            
            if current_node in self.section_graph:
                for segment in self.section_graph[current_node]:
                    if avoid and segment.to_section in avoid:
                        continue
                    
                    neighbor = segment.to_section
                    # Weight cost by congestion (current_load / capacity)
                    congestion_factor = 1 + (segment.current_load / segment.capacity) if segment.capacity > 0 else 2
                    weighted_cost = current_cost + segment.cost * congestion_factor
                    
                    if weighted_cost < costs[neighbor]:
                        costs[neighbor] = weighted_cost
                        previous[neighbor] = current_node
                        heapq.heappush(pq, (weighted_cost, neighbor))
        
        # Reconstruct path
        if end not in previous and end != start:
            return None
        
        path = []
        current = end
        while current is not None:
            path.append(current)
            current = previous.get(current)
        
        path.reverse()
        
        # Calculate properties
        total_distance = 0
        total_time = 0
        total_cost = 0
        congestion_sum = 0
        
        for i in range(len(path) - 1):
            from_section = path[i]
            to_section = path[i + 1]
            
            for segment in self.section_graph.get(from_section, []):
                if segment.to_section == to_section:
                    total_distance += segment.distance
                    total_time += segment.travel_time
                    total_cost += segment.cost
                    congestion_sum += segment.current_load / segment.capacity if segment.capacity > 0 else 1
                    break
        
        avg_congestion = congestion_sum / (len(path) - 1) if len(path) > 1 else 0
        
        return RouteOption(
            route=path,
            total_distance=total_distance,
            total_time=total_time,
            total_cost=total_cost,
            congestion_score=avg_congestion,
            safety_score=0.9,
            feasible=True
        )
    
    def _select_best_route(
        self,
        routes: List[RouteOption],
        train_requirements: Optional[Dict[str, Any]] = None
    ) -> RouteOption:
        """Select best route from options based on criteria"""
        
        if not routes:
            # Return empty route if no options
            return RouteOption(
                route=[],
                total_distance=0,
                total_time=0,
                total_cost=0,
                congestion_score=0,
                safety_score=0,
                feasible=False
            )
        
        if len(routes) == 1:
            return routes[0]
        
        # Score routes based on multiple criteria
        best_route = None
        best_score = float('-inf')
        
        for route in routes:
            if not route.feasible:
                continue
            
            # Multi-criteria scoring (lower is better for distances/times/costs)
            score = 0
            
            # Distance factor (weight: -0.3)
            max_distance = max(r.total_distance for r in routes)
            if max_distance > 0:
                score -= 0.3 * (route.total_distance / max_distance)
            
            # Time factor (weight: -0.4)
            max_time = max(r.total_time for r in routes)
            if max_time > 0:
                score -= 0.4 * (route.total_time / max_time)
            
            # Congestion factor (weight: -0.2)
            score -= 0.2 * route.congestion_score
            
            # Safety factor (weight: +0.1)
            score += 0.1 * route.safety_score
            
            if score > best_score:
                best_score = score
                best_route = route
        
        return best_route or routes[0]
    
    async def validate_route(
        self,
        route: List[int],
        train_requirements: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Validate a route for feasibility and constraints"""
        
        if not route or len(route) < 2:
            return {
                "is_valid": False,
                "errors": ["Route must have at least 2 sections"],
                "warnings": []
            }
        
        errors = []
        warnings = []
        
        # Check connectivity
        for i in range(len(route) - 1):
            current_section = route[i]
            next_section = route[i + 1]
            
            # Check if sections are connected
            connected = False
            if current_section in self.section_graph:
                for segment in self.section_graph[current_section]:
                    if segment.to_section == next_section:
                        connected = True
                        break
            
            if not connected:
                errors.append(f"No connection from section {current_section} to {next_section}")
        
        # Check capacity constraints
        capacity_violations = []
        for section_id in route:
            if section_id in self.section_graph:
                for segment in self.section_graph[section_id]:
                    if segment.current_load >= segment.capacity:
                        capacity_violations.append(section_id)
        
        if capacity_violations:
            warnings.append(f"Sections at capacity: {capacity_violations}")
        
        # Check train requirements
        if train_requirements:
            max_speed = train_requirements.get("max_speed")
            if max_speed:
                speed_violations = []
                for i in range(len(route) - 1):
                    current_section = route[i]
                    if current_section in self.section_graph:
                        for segment in self.section_graph[current_section]:
                            if segment.to_section == route[i + 1]:
                                # Would check against section speed limits
                                # This is simplified - in reality you'd check section properties
                                break
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "route_length": len(route),
            "connectivity_check": "passed" if len(errors) == 0 else "failed"
        }


# Export classes
__all__ = [
    "RouteOptimizer",
    "RouteSegment", 
    "RouteOption"
]