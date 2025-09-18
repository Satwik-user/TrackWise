from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging

from optimization.models.train_model import TrainModel
from optimization.models.section_model import SectionModel
from optimization.models.optimization_model import OptimizationSolution

logger = logging.getLogger(__name__)

class SafetyValidator:
    """Validates safety constraints and requirements"""
    
    def __init__(self):
        self.min_separation_time = 300  # 5 minutes in seconds
        self.min_braking_distance = 200  # meters
        self.max_speed_deviation = 0.2  # 20% speed deviation allowed
        
    def validate_train_separation(
        self, 
        train1: TrainModel, 
        train2: TrainModel, 
        section: SectionModel
    ) -> Tuple[bool, str]:
        """Validate minimum separation between two trains"""
        try:
            # Calculate time separation
            if train1.scheduled_arrival and train2.scheduled_arrival:
                time_diff = abs((train1.scheduled_arrival - train2.scheduled_arrival).total_seconds())
                
                if time_diff < self.min_separation_time:
                    return False, f"Insufficient time separation: {time_diff}s < {self.min_separation_time}s"
            
            # Calculate distance separation if both trains are in same section
            if (train1.current_section_id == train2.current_section_id == section.id):
                distance_diff = abs(train1.current_position - train2.current_position)
                
                # Consider braking distances
                train1_braking = train1.get_braking_distance()
                train2_braking = train2.get_braking_distance()
                required_separation = max(train1_braking, train2_braking) + self.min_braking_distance
                
                if distance_diff < required_separation:
                    return False, f"Insufficient distance separation: {distance_diff}m < {required_separation}m"
            
            return True, "Safe separation maintained"
            
        except Exception as e:
            logger.error(f"Error validating train separation: {str(e)}")
            return False, f"Validation error: {str(e)}"
    
    def validate_speed_limits(self, train: TrainModel, section: SectionModel) -> Tuple[bool, str]:
        """Validate speed limits and restrictions"""
        try:
            # Check section speed limit
            if train.current_speed > section.max_speed:
                return False, f"Train speed {train.current_speed} exceeds section limit {section.max_speed}"
            
            # Check train's own speed limit
            if train.current_speed > train.max_speed:
                return False, f"Train speed {train.current_speed} exceeds train limit {train.max_speed}"
            
            # Check temporary speed restrictions
            for restriction in section.temporary_restrictions:
                if restriction.get('active', True):
                    max_restricted_speed = restriction.get('max_speed', section.max_speed)
                    if train.current_speed > max_restricted_speed:
                        return False, f"Train speed violates temporary restriction: {restriction.get('reason', 'Unknown')}"
            
            return True, "Speed limits respected"
            
        except Exception as e:
            logger.error(f"Error validating speed limits: {str(e)}")
            return False, f"Validation error: {str(e)}"
    
    def validate_capacity_constraints(self, section: SectionModel, trains: List[TrainModel]) -> Tuple[bool, str]:
        """Validate section capacity constraints"""
        try:
            # Count trains currently in section
            trains_in_section = len([t for t in trains if t.current_section_id == section.id])
            
            if trains_in_section > section.max_occupancy:
                return False, f"Section capacity exceeded: {trains_in_section} > {section.max_occupancy}"
            
            # Check block-level capacity
            for block in section.blocks:
                trains_in_block = len([
                    t for t in trains 
                    if (t.current_section_id == section.id and 
                        block.contains_position(t.current_position))
                ])
                
                if trains_in_block > 1:  # Assuming one train per block
                    return False, f"Block {block.block_code} has multiple trains"
            
            return True, "Capacity constraints satisfied"
            
        except Exception as e:
            logger.error(f"Error validating capacity: {str(e)}")
            return False, f"Validation error: {str(e)}"
    
    def validate_signal_aspects(self, section: SectionModel) -> Tuple[bool, str]:
        """Validate signal aspects and block occupancy"""
        try:
            for block in section.blocks:
                # If block is occupied, signal should be RED
                if block.is_occupied and block.signal_aspect != "RED":
                    return False, f"Block {block.block_code} occupied but signal not RED"
                
                # If block is empty, signal should not be RED (unless maintenance)
                if (not block.is_occupied and 
                    block.signal_aspect == "RED" and 
                    not section.maintenance_mode):
                    return False, f"Block {block.block_code} empty but signal RED"
            
            return True, "Signal aspects valid"
            
        except Exception as e:
            logger.error(f"Error validating signals: {str(e)}")
            return False, f"Validation error: {str(e)}"
    
    def validate_solution_safety(self, solution: OptimizationSolution) -> List[Dict[str, Any]]:
        """Validate overall solution safety"""
        safety_issues = []
        
        try:
            # Check for conflicting decisions
            decisions_by_section = {}
            for decision in solution.decisions:
                section_id = decision["section_id"]
                if section_id not in decisions_by_section:
                    decisions_by_section[section_id] = []
                decisions_by_section[section_id].append(decision)
            
            # Validate timing conflicts within each section
            for section_id, section_decisions in decisions_by_section.items():
                conflicts = self._check_timing_conflicts(section_decisions)
                safety_issues.extend(conflicts)
            
            # Check for unsafe speed recommendations
            for decision in solution.decisions:
                if decision.get("type") == "SPEED_CONTROL":
                    constraints = decision.get("constraints", {})
                    speed_adj = constraints.get("speed_adjustment", 100)
                    
                    if speed_adj > 120:  # More than 20% increase
                        safety_issues.append({
                            "type": "UNSAFE_SPEED",
                            "train_id": decision["train_id"],
                            "section_id": decision["section_id"],
                            "speed_adjustment": speed_adj,
                            "message": f"Excessive speed increase: {speed_adj}%"
                        })
            
        except Exception as e:
            logger.error(f"Error validating solution safety: {str(e)}")
            safety_issues.append({
                "type": "VALIDATION_ERROR",
                "message": f"Safety validation failed: {str(e)}"
            })
        
        return safety_issues
    
    def _check_timing_conflicts(self, decisions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Check for timing conflicts between decisions in same section"""
        conflicts = []
        
        try:
            # Extract timing information
            train_timings = []
            for decision in decisions:
                constraints = decision.get("constraints", {})
                if "arrival_time" in constraints and "departure_time" in constraints:
                    arrival = constraints["arrival_time"]
                    departure = constraints["departure_time"]
                    
                    # Convert string timestamps to datetime if needed
                    if isinstance(arrival, str):
                        arrival = datetime.fromisoformat(arrival)
                        departure = datetime.fromisoformat(departure)
                    
                    train_timings.append({
                        "train_id": decision["train_id"],
                        "arrival": arrival,
                        "departure": departure
                    })
            
            # Sort by arrival time
            train_timings.sort(key=lambda x: x["arrival"])
            
            # Check for overlaps
            for i in range(len(train_timings) - 1):
                current = train_timings[i]
                next_train = train_timings[i + 1]
                
                # Check if current train departs after next train arrives
                if isinstance(current["departure"], datetime) and isinstance(next_train["arrival"], datetime):
                    gap = (next_train["arrival"] - current["departure"]).total_seconds()
                else:
                    gap = next_train["arrival"] - current["departure"]
                
                if gap < self.min_separation_time:
                    conflicts.append({
                        "type": "TIMING_CONFLICT",
                        "train1_id": current["train_id"],
                        "train2_id": next_train["train_id"],
                        "gap": gap,
                        "required": self.min_separation_time,
                        "message": f"Insufficient separation between trains {current['train_id']} and {next_train['train_id']}"
                    })
        
        except Exception as e:
            logger.error(f"Error checking timing conflicts: {str(e)}")
            conflicts.append({
                "type": "CONFLICT_CHECK_ERROR",
                "message": f"Failed to check conflicts: {str(e)}"
            })
        
        return conflicts

class PerformanceValidator:
    """Validates performance and efficiency metrics"""
    
    def __init__(self):
        self.max_acceptable_delay = 900  # 15 minutes
        self.min_throughput_efficiency = 0.7  # 70% of theoretical max
        self.max_energy_increase = 0.3  # 30% increase over baseline
    
    def validate_delay_targets(self, solution: OptimizationSolution) -> Dict[str, Any]:
        """Validate delay performance targets"""
        total_delay = solution.metrics.get("total_delay", 0)
        safety_violations = solution.metrics.get("safety_violations", 0)
        
        validation_result = {
            "meets_delay_target": total_delay <= self.max_acceptable_delay,
            "total_delay": total_delay,
            "delay_target": self.max_acceptable_delay,
            "has_safety_violations": safety_violations > 0,
            "safety_violations": safety_violations
        }
        
        return validation_result
    
    def validate_throughput_efficiency(self, solution: OptimizationSolution, theoretical_max: float) -> Dict[str, Any]:
        """Validate throughput efficiency"""
        actual_throughput = solution.metrics.get("throughput", 0)
        efficiency = actual_throughput / theoretical_max if theoretical_max > 0 else 0
        
        validation_result = {
            "meets_throughput_target": efficiency >= self.min_throughput_efficiency,
            "actual_throughput": actual_throughput,
            "theoretical_max": theoretical_max,
            "efficiency": efficiency,
            "efficiency_target": self.min_throughput_efficiency
        }
        
        return validation_result
    
    def validate_solution_quality(self, solution: OptimizationSolution) -> Dict[str, Any]:
        """Overall solution quality validation"""
        quality_score = 0.0
        
        # Feasibility score (40% weight)
        if solution.is_feasible():
            quality_score += 0.4
        
        # Safety score (30% weight)
        safety_violations = solution.metrics.get("safety_violations", 0)
        if safety_violations == 0:
            quality_score += 0.3
        
        # Performance score (30% weight)
        total_delay = solution.metrics.get("total_delay", 0)
        if total_delay <= self.max_acceptable_delay:
            delay_score = max(0, 1 - (total_delay / self.max_acceptable_delay))
            quality_score += 0.3 * delay_score
        
        return {
            "quality_score": quality_score,
            "grade": self._get_quality_grade(quality_score),
            "feasible": solution.is_feasible(),
            "safe": safety_violations == 0,
            "efficient": total_delay <= self.max_acceptable_delay,
            "recommendations": self._get_improvement_recommendations(solution)
        }
    
    def _get_quality_grade(self, score: float) -> str:
        """Convert quality score to letter grade"""
        if score >= 0.9:
            return "A"
        elif score >= 0.8:
            return "B"
        elif score >= 0.7:
            return "C"
        elif score >= 0.6:
            return "D"
        else:
            return "F"
    
    def _get_improvement_recommendations(self, solution: OptimizationSolution) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        if not solution.is_feasible():
            recommendations.append("Relax some constraints to find feasible solution")
        
        safety_violations = solution.metrics.get("safety_violations", 0)
        if safety_violations > 0:
            recommendations.append("Address safety violations before implementation")
        
        total_delay = solution.metrics.get("total_delay", 0)
        if total_delay > self.max_acceptable_delay:
            recommendations.append("Reduce total delay through better scheduling")
        
        if len(solution.decisions) == 0:
            recommendations.append("Generate more optimization decisions")
        
        return recommendations