"""
Scenario generation for TrackWise Railway Optimization System
"""

import asyncio
import logging
import numpy as np
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from enum import Enum
import itertools
import copy

logger = logging.getLogger(__name__)


class ScenarioType(str, Enum):
    """Types of simulation scenarios"""
    NORMAL_OPERATIONS = "normal_operations"
    PEAK_HOUR = "peak_hour"
    WEATHER_DISRUPTION = "weather_disruption"
    EQUIPMENT_FAILURE = "equipment_failure"
    MAINTENANCE_WINDOW = "maintenance_window"
    EMERGENCY_SITUATION = "emergency_situation"
    CAPACITY_STRESS_TEST = "capacity_stress_test"
    OPTIMIZATION_VALIDATION = "optimization_validation"
    MONTE_CARLO = "monte_carlo"


class ScenarioComplexity(str, Enum):
    """Scenario complexity levels"""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    EXTREME = "extreme"


@dataclass
class ScenarioParameters:
    """Parameters for scenario generation"""
    scenario_type: ScenarioType
    complexity: ScenarioComplexity
    duration_hours: float
    train_count: int
    section_count: int
    delay_probability: float
    maintenance_probability: float
    weather_impact: float
    passenger_load_factor: float
    freight_ratio: float
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ScenarioDefinition:
    """Complete scenario definition"""
    scenario_id: str
    name: str
    description: str
    parameters: ScenarioParameters
    initial_conditions: Dict[str, Any]
    events: List[Dict[str, Any]]
    expected_outcomes: Dict[str, Any]
    validation_criteria: List[Dict[str, Any]]
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result["parameters"] = self.parameters.to_dict()
        return result


class ScenarioTemplate:
    """Template for generating scenarios"""
    
    def __init__(self, scenario_type: ScenarioType):
        self.scenario_type = scenario_type
        self.parameter_ranges = self._get_parameter_ranges()
        self.event_templates = self._get_event_templates()
    
    def _get_parameter_ranges(self) -> Dict[str, Tuple[float, float]]:
        """Get parameter ranges for this scenario type"""
        
        base_ranges = {
            "duration_hours": (2.0, 24.0),
            "train_count": (5, 50),
            "section_count": (3, 20),
            "delay_probability": (0.05, 0.3),
            "maintenance_probability": (0.01, 0.1),
            "weather_impact": (0.0, 1.0),
            "passenger_load_factor": (0.3, 1.0),
            "freight_ratio": (0.0, 0.5)
        }
        
        # Adjust ranges based on scenario type
        if self.scenario_type == ScenarioType.PEAK_HOUR:
            base_ranges.update({
                "passenger_load_factor": (0.8, 1.0),
                "delay_probability": (0.15, 0.4)
            })
        elif self.scenario_type == ScenarioType.WEATHER_DISRUPTION:
            base_ranges.update({
                "weather_impact": (0.5, 1.0),
                "delay_probability": (0.2, 0.6)
            })
        elif self.scenario_type == ScenarioType.EQUIPMENT_FAILURE:
            base_ranges.update({
                "maintenance_probability": (0.1, 0.3),
                "delay_probability": (0.3, 0.7)
            })
        elif self.scenario_type == ScenarioType.CAPACITY_STRESS_TEST:
            base_ranges.update({
                "train_count": (30, 100),
                "passenger_load_factor": (0.9, 1.2)
            })
        
        return base_ranges
    
    def _get_event_templates(self) -> List[Dict[str, Any]]:
        """Get event templates for this scenario type"""
        
        base_events = []
        
        if self.scenario_type == ScenarioType.WEATHER_DISRUPTION:
            base_events.extend([
                {
                    "event_type": "weather_event",
                    "probability": 0.8,
                    "timing": "random",
                    "duration_range": (60, 180),
                    "severity_range": (0.5, 0.9)
                },
                {
                    "event_type": "speed_reduction",
                    "probability": 0.6,
                    "timing": "after_weather",
                    "duration_range": (30, 120),
                    "severity_range": (0.3, 0.7)
                }
            ])
        
        elif self.scenario_type == ScenarioType.EQUIPMENT_FAILURE:
            base_events.extend([
                {
                    "event_type": "train_breakdown",
                    "probability": 0.7,
                    "timing": "random",
                    "duration_range": (30, 180),
                    "severity_range": (0.6, 1.0)
                },
                {
                    "event_type": "signal_failure",
                    "probability": 0.5,
                    "timing": "random",
                    "duration_range": (15, 60),
                    "severity_range": (0.4, 0.8)
                }
            ])
        
        elif self.scenario_type == ScenarioType.PEAK_HOUR:
            base_events.extend([
                {
                    "event_type": "passenger_surge",
                    "probability": 1.0,
                    "timing": "start",
                    "duration_range": (120, 180),
                    "severity_range": (0.7, 1.0)
                },
                {
                    "event_type": "platform_congestion",
                    "probability": 0.8,
                    "timing": "during_surge",
                    "duration_range": (30, 90),
                    "severity_range": (0.5, 0.9)
                }
            ])
        
        elif self.scenario_type == ScenarioType.MAINTENANCE_WINDOW:
            base_events.extend([
                {
                    "event_type": "scheduled_maintenance",
                    "probability": 1.0,
                    "timing": "start",
                    "duration_range": (120, 480),
                    "severity_range": (0.8, 1.0)
                },
                {
                    "event_type": "capacity_reduction",
                    "probability": 0.9,
                    "timing": "during_maintenance",
                    "duration_range": (60, 240),
                    "severity_range": (0.5, 0.8)
                }
            ])
        
        return base_events


class ScenarioGenerator:
    """Generates simulation scenarios for testing and validation"""
    
    def __init__(self):
        self.templates = {
            scenario_type: ScenarioTemplate(scenario_type)
            for scenario_type in ScenarioType
        }
        self.generated_scenarios: List[ScenarioDefinition] = []
    
    async def generate_scenario(
        self,
        scenario_type: ScenarioType,
        complexity: ScenarioComplexity = ScenarioComplexity.MODERATE,
        custom_parameters: Optional[Dict[str, Any]] = None
    ) -> ScenarioDefinition:
        """Generate a single scenario"""
        
        template = self.templates[scenario_type]
        
        # Generate parameters
        parameters = await self._generate_parameters(template, complexity, custom_parameters)
        
        # Generate initial conditions
        initial_conditions = await self._generate_initial_conditions(parameters)
        
        # Generate events
        events = await self._generate_events(template, parameters)
        
        # Generate expected outcomes
        expected_outcomes = await self._generate_expected_outcomes(parameters, events)
        
        # Generate validation criteria
        validation_criteria = await self._generate_validation_criteria(scenario_type, parameters)
        
        # Create scenario definition
        scenario_id = f"{scenario_type.value}_{complexity.value}_{int(datetime.utcnow().timestamp())}"
        
        scenario = ScenarioDefinition(
            scenario_id=scenario_id,
            name=f"{scenario_type.value.replace('_', ' ').title()} - {complexity.value.title()}",
            description=self._generate_description(scenario_type, complexity),
            parameters=parameters,
            initial_conditions=initial_conditions,
            events=events,
            expected_outcomes=expected_outcomes,
            validation_criteria=validation_criteria
        )
        
        self.generated_scenarios.append(scenario)
        
        logger.info(f"Generated scenario: {scenario.name}")
        return scenario
    
    async def generate_scenario_suite(
        self,
        scenario_types: Optional[List[ScenarioType]] = None,
        complexity_levels: Optional[List[ScenarioComplexity]] = None,
        count_per_combination: int = 1
    ) -> List[ScenarioDefinition]:
        """Generate a suite of scenarios for comprehensive testing"""
        
        if scenario_types is None:
            scenario_types = list(ScenarioType)
        
        if complexity_levels is None:
            complexity_levels = [ScenarioComplexity.SIMPLE, ScenarioComplexity.MODERATE, ScenarioComplexity.COMPLEX]
        
        scenarios = []
        
        # Generate scenarios for each combination
        for scenario_type, complexity in itertools.product(scenario_types, complexity_levels):
            for i in range(count_per_combination):
                scenario = await self.generate_scenario(scenario_type, complexity)
                scenarios.append(scenario)
        
        logger.info(f"Generated scenario suite with {len(scenarios)} scenarios")
        return scenarios
    
    async def generate_monte_carlo_scenarios(
        self,
        base_scenario_type: ScenarioType,
        num_scenarios: int = 100,
        parameter_variations: Optional[Dict[str, Tuple[float, float]]] = None
    ) -> List[ScenarioDefinition]:
        """Generate Monte Carlo scenarios with parameter variations"""
        
        scenarios = []
        template = self.templates[base_scenario_type]
        
        for i in range(num_scenarios):
            # Generate random parameter variations
            custom_parameters = {}
            
            if parameter_variations:
                for param, (min_val, max_val) in parameter_variations.items():
                    custom_parameters[param] = np.random.uniform(min_val, max_val)
            
            # Add random seed for reproducibility
            custom_parameters["random_seed"] = np.random.randint(1, 1000000)
            
            scenario = await self.generate_scenario(
                base_scenario_type,
                ScenarioComplexity.MODERATE,
                custom_parameters
            )
            
            # Mark as Monte Carlo
            scenario.scenario_id = f"mc_{scenario.scenario_id}_{i:03d}"
            scenario.name = f"Monte Carlo {i+1:03d}: {scenario.name}"
            
            scenarios.append(scenario)
        
        logger.info(f"Generated {num_scenarios} Monte Carlo scenarios")
        return scenarios
    
    async def _generate_parameters(
        self,
        template: ScenarioTemplate,
        complexity: ScenarioComplexity,
        custom_parameters: Optional[Dict[str, Any]] = None
    ) -> ScenarioParameters:
        """Generate scenario parameters"""
        
        # Start with template ranges
        param_ranges = template.parameter_ranges.copy()
        
        # Adjust for complexity
        complexity_factors = {
            ScenarioComplexity.SIMPLE: 0.3,
            ScenarioComplexity.MODERATE: 0.6,
            ScenarioComplexity.COMPLEX: 0.8,
            ScenarioComplexity.EXTREME: 1.0
        }
        
        factor = complexity_factors[complexity]
        
        # Generate parameters
        params = {}
        for param, (min_val, max_val) in param_ranges.items():
            if param in ["train_count", "section_count"]:
                # Discrete parameters
                range_size = max_val - min_val
                adjusted_max = min_val + int(range_size * factor)
                params[param] = np.random.randint(int(min_val), int(adjusted_max) + 1)
            else:
                # Continuous parameters
                range_size = max_val - min_val
                adjusted_max = min_val + range_size * factor
                params[param] = np.random.uniform(min_val, adjusted_max)
        
        # Apply custom parameters
        if custom_parameters:
            params.update(custom_parameters)
        
        return ScenarioParameters(
            scenario_type=template.scenario_type,
            complexity=complexity,
            duration_hours=params["duration_hours"],
            train_count=params["train_count"],
            section_count=params["section_count"],
            delay_probability=params["delay_probability"],
            maintenance_probability=params["maintenance_probability"],
            weather_impact=params["weather_impact"],
            passenger_load_factor=params["passenger_load_factor"],
            freight_ratio=params["freight_ratio"]
        )
    
    async def _generate_initial_conditions(self, parameters: ScenarioParameters) -> Dict[str, Any]:
        """Generate initial conditions for the scenario"""
        
        # Generate trains
        trains = []
        passenger_count = int(parameters.train_count * (1 - parameters.freight_ratio))
        freight_count = parameters.train_count - passenger_count
        
        for i in range(passenger_count):
            train = {
                "id": i + 1,
                "train_number": f"P{i+1:03d}",
                "name": f"Passenger Train {i+1}",
                "train_type": "PASSENGER",
                "status": "STOPPED",
                "operator": "TrackWise Railways",
                "max_speed_kmh": np.random.uniform(80, 120),
                "current_speed": 0.0,
                "capacity_passengers": int(np.random.uniform(150, 300)),
                "current_section": np.random.randint(1, parameters.section_count + 1),
                "delay_minutes": 0.0,
                "scheduled_departure": (datetime.utcnow() + timedelta(minutes=np.random.uniform(10, 60))).isoformat(),
                "route": self._generate_route(parameters.section_count),
                "passenger_load": parameters.passenger_load_factor * np.random.uniform(0.8, 1.2)
            }
            trains.append(train)
        
        for i in range(freight_count):
            train = {
                "id": passenger_count + i + 1,
                "train_number": f"F{i+1:03d}",
                "name": f"Freight Train {i+1}",
                "train_type": "FREIGHT",
                "status": "STOPPED",
                "operator": "TrackWise Freight",
                "max_speed_kmh": np.random.uniform(60, 100),
                "current_speed": 0.0,
                "capacity_cargo_tons": np.random.uniform(1000, 3000),
                "current_section": np.random.randint(1, parameters.section_count + 1),
                "delay_minutes": 0.0,
                "scheduled_departure": (datetime.utcnow() + timedelta(minutes=np.random.uniform(30, 120))).isoformat(),
                "route": self._generate_route(parameters.section_count),
                "cargo_load": np.random.uniform(0.5, 1.0)
            }
            trains.append(train)
        
        # Generate sections
        sections = []
        for i in range(parameters.section_count):
            section = {
                "id": i + 1,
                "section_code": f"SEC-{i+1:03d}",
                "name": f"Section {i+1}",
                "section_type": np.random.choice(["MAIN_LINE", "BRANCH_LINE", "STATION", "JUNCTION"]),
                "status": "AVAILABLE",
                "railway_line": "Main Line" if i < parameters.section_count // 2 else "Branch Line",
                "length_km": np.random.uniform(5, 20),
                "max_speed_kmh": np.random.uniform(60, 120),
                "max_capacity": np.random.randint(1, 3),
                "signal_state": "GREEN",
                "weather_condition": "clear",
                "track_condition": "good"
            }
            sections.append(section)
        
        return {
            "trains": trains,
            "sections": sections,
            "scenario_start_time": datetime.utcnow().isoformat(),
            "weather_conditions": {
                "temperature": 20.0,
                "humidity": 60.0,
                "wind_speed": 10.0,
                "visibility": 50.0,
                "conditions": "clear"
            }
        }
    
    def _generate_route(self, section_count: int) -> List[int]:
        """Generate a random route through sections"""
        
        route_length = np.random.randint(2, min(6, section_count + 1))
        
        # Ensure no duplicate sections in route
        available_sections = list(range(1, section_count + 1))
        route = []
        
        for _ in range(route_length):
            if available_sections:
                section = np.random.choice(available_sections)
                route.append(section)
                available_sections.remove(section)
        
        return route
    
    async def _generate_events(
        self,
        template: ScenarioTemplate,
        parameters: ScenarioParameters
    ) -> List[Dict[str, Any]]:
        """Generate events for the scenario"""
        
        events = []
        scenario_duration_minutes = parameters.duration_hours * 60
        
        for event_template in template.event_templates:
            if np.random.random() < event_template["probability"]:
                
                # Determine event timing
                if event_template["timing"] == "start":
                    event_time = 5  # 5 minutes after start
                elif event_template["timing"] == "random":
                    event_time = np.random.uniform(10, scenario_duration_minutes - 30)
                else:
                    event_time = np.random.uniform(scenario_duration_minutes * 0.3, scenario_duration_minutes * 0.7)
                
                # Generate event duration
                duration_min, duration_max = event_template["duration_range"]
                duration = np.random.uniform(duration_min, duration_max)
                
                # Generate severity
                severity_min, severity_max = event_template["severity_range"]
                severity = np.random.uniform(severity_min, severity_max)
                
                # Select affected entity
                if "train" in event_template["event_type"]:
                    affected_entity = np.random.randint(1, parameters.train_count + 1)
                else:
                    affected_entity = np.random.randint(1, parameters.section_count + 1)
                
                event = {
                    "event_type": event_template["event_type"],
                    "event_time_minutes": event_time,
                    "duration_minutes": duration,
                    "severity": severity,
                    "affected_entity_id": affected_entity,
                    "description": f"{event_template['event_type'].replace('_', ' ').title()} affecting entity {affected_entity}"
                }
                
                events.append(event)
        
        # Sort events by time
        events.sort(key=lambda e: e["event_time_minutes"])
        
        return events
    
    async def _generate_expected_outcomes(
        self,
        parameters: ScenarioParameters,
        events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate expected outcomes for the scenario"""
        
        # Calculate expected delays based on events
        expected_total_delay = 0
        for event in events:
            if "delay" in event["event_type"] or "failure" in event["event_type"]:
                expected_total_delay += event["duration_minutes"] * event["severity"]
        
        # Estimate average delay per train
        expected_avg_delay = expected_total_delay / max(parameters.train_count, 1)
        
        # Calculate expected throughput reduction
        disruption_factor = sum(event["severity"] for event in events) / max(len(events), 1)
        expected_throughput_reduction = min(0.5, disruption_factor * 0.3)
        
        # Calculate expected resource utilization
        base_utilization = 0.7  # Assume 70% base utilization
        stress_factor = (parameters.train_count / 20) * parameters.passenger_load_factor
        expected_utilization = min(1.0, base_utilization * stress_factor)
        
        return {
            "expected_total_delay_minutes": expected_total_delay,
            "expected_average_delay_minutes": expected_avg_delay,
            "expected_throughput_reduction": expected_throughput_reduction,
            "expected_resource_utilization": expected_utilization,
            "expected_completion_rate": max(0.5, 1.0 - disruption_factor * 0.2),
            "expected_energy_consumption_increase": disruption_factor * 0.15,
            "performance_benchmarks": {
                "max_acceptable_delay": expected_avg_delay * 1.5,
                "min_completion_rate": 0.8,
                "max_energy_increase": 0.3
            }
        }
    
    async def _generate_validation_criteria(
        self,
        scenario_type: ScenarioType,
        parameters: ScenarioParameters
    ) -> List[Dict[str, Any]]:
        """Generate validation criteria for the scenario"""
        
        criteria = [
            {
                "criterion": "simulation_completion",
                "description": "Simulation must complete without errors",
                "type": "boolean",
                "expected_value": True
            },
            {
                "criterion": "data_consistency",
                "description": "All data must remain consistent throughout simulation",
                "type": "boolean",
                "expected_value": True
            }
        ]
        
        # Add scenario-specific criteria
        if scenario_type == ScenarioType.PEAK_HOUR:
            criteria.extend([
                {
                    "criterion": "passenger_handling",
                    "description": "System must handle peak passenger loads",
                    "type": "threshold",
                    "metric": "passenger_utilization",
                    "threshold": 0.95,
                    "operator": "less_than"
                },
                {
                    "criterion": "delay_management",
                    "description": "Delays must be kept within acceptable limits",
                    "type": "threshold",
                    "metric": "average_delay_minutes",
                    "threshold": 15.0,
                    "operator": "less_than"
                }
            ])
        
        elif scenario_type == ScenarioType.WEATHER_DISRUPTION:
            criteria.extend([
                {
                    "criterion": "weather_response",
                    "description": "System must respond appropriately to weather",
                    "type": "threshold",
                    "metric": "speed_reduction",
                    "threshold": 0.3,
                    "operator": "greater_than"
                },
                {
                    "criterion": "safety_compliance",
                    "description": "Safety protocols must be maintained",
                    "type": "boolean",
                    "expected_value": True
                }
            ])
        
        elif scenario_type == ScenarioType.EQUIPMENT_FAILURE:
            criteria.extend([
                {
                    "criterion": "failure_response_time",
                    "description": "System must respond to failures quickly",
                    "type": "threshold",
                    "metric": "response_time_minutes",
                    "threshold": 10.0,
                    "operator": "less_than"
                },
                {
                    "criterion": "alternative_routing",
                    "description": "Alternative routes must be provided",
                    "type": "boolean",
                    "expected_value": True
                }
            ])
        
        return criteria
    
    def _generate_description(self, scenario_type: ScenarioType, complexity: ScenarioComplexity) -> str:
        """Generate human-readable description for the scenario"""
        
        descriptions = {
            ScenarioType.NORMAL_OPERATIONS: "Standard railway operations under normal conditions",
            ScenarioType.PEAK_HOUR: "High-traffic scenario simulating rush hour conditions",
            ScenarioType.WEATHER_DISRUPTION: "Scenario with adverse weather conditions affecting operations",
            ScenarioType.EQUIPMENT_FAILURE: "Multiple equipment failures testing system resilience",
            ScenarioType.MAINTENANCE_WINDOW: "Scheduled maintenance affecting network capacity",
            ScenarioType.EMERGENCY_SITUATION: "Emergency conditions requiring immediate response",
            ScenarioType.CAPACITY_STRESS_TEST: "Maximum capacity testing with overloaded system",
            ScenarioType.OPTIMIZATION_VALIDATION: "Validation scenario for optimization algorithms",
            ScenarioType.MONTE_CARLO: "Statistical scenario with random parameter variations"
        }
        
        base_desc = descriptions.get(scenario_type, "Custom scenario")
        complexity_desc = f" with {complexity.value} complexity level"
        
        return base_desc + complexity_desc
    
    def export_scenarios(self, scenarios: List[ScenarioDefinition], filename: str):
        """Export scenarios to JSON file"""
        
        try:
            scenario_data = {
                "export_timestamp": datetime.utcnow().isoformat(),
                "scenario_count": len(scenarios),
                "scenarios": [scenario.to_dict() for scenario in scenarios]
            }
            
            with open(filename, 'w') as f:
                json.dump(scenario_data, f, indent=2, default=str)
            
            logger.info(f"Exported {len(scenarios)} scenarios to {filename}")
            
        except Exception as e:
            logger.error(f"Failed to export scenarios: {e}")
    
    def import_scenarios(self, filename: str) -> List[ScenarioDefinition]:
        """Import scenarios from JSON file"""
        
        try:
            with open(filename, 'r') as f:
                scenario_data = json.load(f)
            
            scenarios = []
            for scenario_dict in scenario_data.get("scenarios", []):
                # Reconstruct ScenarioParameters
                params_dict = scenario_dict["parameters"]
                parameters = ScenarioParameters(
                    scenario_type=ScenarioType(params_dict["scenario_type"]),
                    complexity=ScenarioComplexity(params_dict["complexity"]),
                    duration_hours=params_dict["duration_hours"],
                    train_count=params_dict["train_count"],
                    section_count=params_dict["section_count"],
                    delay_probability=params_dict["delay_probability"],
                    maintenance_probability=params_dict["maintenance_probability"],
                    weather_impact=params_dict["weather_impact"],
                    passenger_load_factor=params_dict["passenger_load_factor"],
                    freight_ratio=params_dict["freight_ratio"]
                )
                
                # Reconstruct ScenarioDefinition
                scenario = ScenarioDefinition(
                    scenario_id=scenario_dict["scenario_id"],
                    name=scenario_dict["name"],
                    description=scenario_dict["description"],
                    parameters=parameters,
                    initial_conditions=scenario_dict["initial_conditions"],
                    events=scenario_dict["events"],
                    expected_outcomes=scenario_dict["expected_outcomes"],
                    validation_criteria=scenario_dict["validation_criteria"]
                )
                
                scenarios.append(scenario)
            
            logger.info(f"Imported {len(scenarios)} scenarios from {filename}")
            return scenarios
            
        except Exception as e:
            logger.error(f"Failed to import scenarios: {e}")
            return []


# Export classes
__all__ = [
    "ScenarioGenerator",
    "ScenarioDefinition",
    "ScenarioParameters",
    "ScenarioTemplate",
    "ScenarioType",
    "ScenarioComplexity"
]