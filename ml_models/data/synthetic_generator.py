import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Tuple, Optional
import json

class SyntheticDataGenerator:
    """Generates synthetic railway traffic data for training and testing"""
    
    def __init__(self, seed: int = 42):
        random.seed(seed)
        np.random.seed(seed)
        self.train_types = ["EXPRESS", "FREIGHT", "SUBURBAN", "SPECIAL"]
        self.section_types = ["MAIN_LINE", "BRANCH_LINE", "STATION", "JUNCTION"]
        
    def generate_train_data(self, num_trains: int = 100) -> List[Dict[str, Any]]:
        """Generate synthetic train data"""
        trains = []
        
        for i in range(num_trains):
            train_type = random.choice(self.train_types)
            
            # Type-specific characteristics
            if train_type == "EXPRESS":
                max_speed = random.uniform(140, 180)
                length = random.uniform(180, 250)
                priority = random.choice([1, 2])
                passenger_capacity = random.randint(400, 800)
                cargo_capacity = None
            elif train_type == "FREIGHT":
                max_speed = random.uniform(60, 100)
                length = random.uniform(400, 800)
                priority = random.choice([4, 5])
                passenger_capacity = None
                cargo_capacity = random.uniform(2000, 5000)
            elif train_type == "SUBURBAN":
                max_speed = random.uniform(100, 140)
                length = random.uniform(150, 200)
                priority = random.choice([2, 3])
                passenger_capacity = random.randint(200, 600)
                cargo_capacity = None
            else:  # SPECIAL
                max_speed = random.uniform(80, 160)
                length = random.uniform(200, 400)
                priority = random.choice([1, 2, 3])
                passenger_capacity = random.randint(100, 400)
                cargo_capacity = None
            
            # Generate schedule
            base_time = datetime.now() + timedelta(hours=random.uniform(-2, 8))
            
            train = {
                "id": i + 1,
                "train_number": f"{train_type[0]}{1000 + i}",
                "train_name": f"{train_type.title()} Train {i+1}",
                "train_type": train_type,
                "priority": priority,
                "length": length,
                "max_speed": max_speed,
                "acceleration": random.uniform(0.3, 0.8),
                "deceleration": random.uniform(0.5, 1.2),
                "weight": random.uniform(200, 3000),
                "scheduled_arrival": base_time,
                "scheduled_departure": base_time + timedelta(minutes=random.randint(2, 20)),
                "passenger_capacity": passenger_capacity,
                "cargo_capacity": cargo_capacity,
                "energy_efficiency": random.uniform(0.7, 0.95),
                "punctuality_score": random.uniform(0.6, 0.98),
                "operator": random.choice(["IndianRailways", "PrivateOperator1", "FreightCorp"]),
                "service_class": random.choice(["Regular", "Premium", "Budget"])
            }
            
            trains.append(train)
        
        return trains
    
    def generate_section_data(self, num_sections: int = 20) -> List[Dict[str, Any]]:
        """Generate synthetic section data"""
        sections = []
        
        for i in range(num_sections):
            section_type = random.choice(self.section_types)
            
            # Type-specific characteristics
            if section_type == "MAIN_LINE":
                length = random.uniform(2000, 10000)
                max_speed = random.uniform(120, 180)
                track_count = random.choice([2, 4])
                max_occupancy = random.choice([1, 2])
                hourly_capacity = random.randint(15, 25)
            elif section_type == "BRANCH_LINE":
                length = random.uniform(1000, 5000)
                max_speed = random.uniform(80, 120)
                track_count = random.choice([1, 2])
                max_occupancy = 1
                hourly_capacity = random.randint(8, 15)
            elif section_type == "STATION":
                length = random.uniform(500, 2000)
                max_speed = random.uniform(40, 80)
                track_count = random.choice([2, 4, 6])
                max_occupancy = random.choice([2, 3, 4])
                hourly_capacity = random.randint(20, 35)
            else:  # JUNCTION
                length = random.uniform(800, 3000)
                max_speed = random.uniform(60, 100)
                track_count = random.choice([3, 4, 6])
                max_occupancy = random.choice([2, 3])
                hourly_capacity = random.randint(12, 20)
            
            section = {
                "id": i + 1,
                "section_code": f"SEC_{i+1:03d}",
                "section_name": f"{section_type.replace('_', ' ').title()} {i+1}",
                "section_type": section_type,
                "length": length,
                "max_speed": max_speed,
                "gradient": random.uniform(-2.0, 2.0),
                "curvature": random.uniform(0, 1000) if random.random() > 0.3 else 0,
                "elevation": random.uniform(0, 2000),
                "track_count": track_count,
                "platform_count": random.randint(0, 4) if section_type == "STATION" else 0,
                "has_loop_line": random.random() > 0.7,
                "electrified": random.random() > 0.1,
                "max_occupancy": max_occupancy,
                "hourly_capacity": hourly_capacity,
                "typical_transit_time": int(length / (max_speed * 0.8 * 1000 / 3600)) + random.randint(30, 120),
                "is_active": random.random() > 0.05,
                "maintenance_mode": random.random() < 0.02,
                "weather_restricted": random.random() < 0.1,
                "emergency_restricted": random.random() < 0.01
            }
            
            sections.append(section)
        
        return sections
    
    def generate_delay_scenarios(self, trains: List[Dict[str, Any]], num_scenarios: int = 50) -> List[Dict[str, Any]]:
        """Generate delay scenarios for training delay prediction models"""
        scenarios = []
        
        delay_causes = [
            "SIGNAL_FAILURE", "TRACK_MAINTENANCE", "WEATHER", "MECHANICAL_ISSUE",
            "CREW_CHANGE", "TRAFFIC_CONGESTION", "ACCIDENT", "PASSENGER_INCIDENT",
            "POWER_FAILURE", "COMMUNICATION_ISSUE"
        ]
        
        for i in range(num_scenarios):
            # Select random subset of trains
            affected_trains = random.sample(trains, random.randint(1, min(10, len(trains))))
            
            # Generate scenario characteristics
            cause = random.choice(delay_causes)
            severity = random.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
            
            # Severity affects delay duration and spread
            if severity == "LOW":
                base_delay = random.uniform(2, 8)
                spread_factor = random.uniform(0.5, 1.0)
            elif severity == "MEDIUM":
                base_delay = random.uniform(5, 20)
                spread_factor = random.uniform(0.8, 1.5)
            elif severity == "HIGH":
                base_delay = random.uniform(15, 45)
                spread_factor = random.uniform(1.2, 2.0)
            else:  # CRITICAL
                base_delay = random.uniform(30, 120)
                spread_factor = random.uniform(1.5, 3.0)
            
            scenario = {
                "scenario_id": f"DELAY_{i+1:03d}",
                "cause": cause,
                "severity": severity,
                "start_time": datetime.now() + timedelta(hours=random.uniform(0, 24)),
                "duration": random.uniform(0.5, 6) * spread_factor,  # hours
                "affected_trains": [],
                "weather_conditions": random.choice(["CLEAR", "RAIN", "FOG", "STORM", "SNOW"]),
                "time_of_day": random.choice(["MORNING_PEAK", "AFTERNOON", "EVENING_PEAK", "NIGHT"]),
                "day_of_week": random.choice(["WEEKDAY", "WEEKEND"])
            }
            
            # Generate individual train delays
            for train in affected_trains:
                train_delay = base_delay * random.uniform(0.5, spread_factor)
                
                # Priority affects delay impact
                priority_factor = 1.0 / train["priority"]  # Higher priority = less delay
                adjusted_delay = train_delay * priority_factor
                
                # Train type affects delay propagation
                if train["train_type"] == "EXPRESS":
                    delay_factor = 0.8  # Express trains recover faster
                elif train["train_type"] == "FREIGHT":
                    delay_factor = 1.3  # Freight delays last longer
                else:
                    delay_factor = 1.0
                
                final_delay = adjusted_delay * delay_factor
                
                scenario["affected_trains"].append({
                    "train_id": train["id"],
                    "train_number": train["train_number"],
                    "initial_delay": final_delay,
                    "propagated_delay": final_delay * random.uniform(1.0, 1.5),
                    "recovery_time": random.uniform(0.2, 2.0) * final_delay
                })
            
            scenarios.append(scenario)
        
        return scenarios
    
    def generate_traffic_patterns(self, sections: List[Dict[str, Any]], hours: int = 24) -> Dict[str, Any]:
        """Generate realistic traffic patterns"""
        patterns = {
            "hourly_volumes": {},
            "peak_hours": [],
            "section_utilization": {},
            "train_type_distribution": {}
        }
        
        # Define peak hours
        morning_peak = list(range(7, 10))
        evening_peak = list(range(17, 20))
        patterns["peak_hours"] = morning_peak + evening_peak
        
        # Generate hourly volumes
        for hour in range(24):
            if hour in morning_peak or hour in evening_peak:
                base_volume = 1.0
            elif 6 <= hour <= 22:
                base_volume = random.uniform(0.6, 0.8)
            else:
                base_volume = random.uniform(0.2, 0.4)
            
            patterns["hourly_volumes"][hour] = {
                "total_trains": int(base_volume * random.randint(20, 50)),
                "express_ratio": random.uniform(0.2, 0.4),
                "freight_ratio": random.uniform(0.1, 0.3),
                "suburban_ratio": random.uniform(0.3, 0.6)
            }
        
        # Generate section utilization
        for section in sections:
            utilization = random.uniform(0.3, 0.9)
            patterns["section_utilization"][section["id"]] = {
                "average_utilization": utilization,
                "peak_utilization": min(1.0, utilization * 1.4),
                "off_peak_utilization": utilization * 0.6,
                "congestion_probability": max(0, utilization - 0.7) / 0.3
            }
        
        return patterns
    
    def generate_historical_performance(self, trains: List[Dict[str, Any]], days: int = 30) -> List[Dict[str, Any]]:
        """Generate historical performance data"""
        performance_data = []
        
        for day in range(days):
            date = datetime.now() - timedelta(days=day)
            
            for train in trains:
                # Generate performance metrics
                base_punctuality = train["punctuality_score"]
                daily_variation = random.uniform(-0.1, 0.1)
                daily_punctuality = max(0, min(1, base_punctuality + daily_variation))
                
                # Generate delays
                if random.random() > daily_punctuality:
                    delay_minutes = np.random.exponential(10)  # Exponential distribution
                else:
                    delay_minutes = 0
                
                # Generate energy consumption
                base_energy = random.uniform(50, 200)  # kWh
                efficiency_factor = train["energy_efficiency"]
                actual_energy = base_energy / efficiency_factor
                
                performance = {
                    "date": date.date(),
                    "train_id": train["id"],
                    "train_number": train["train_number"],
                    "scheduled_departure": date.replace(hour=random.randint(5, 22), minute=random.randint(0, 59)),
                    "actual_departure": None,
                    "delay_minutes": delay_minutes,
                    "on_time": delay_minutes <= 5,
                    "energy_consumption": actual_energy,
                    "passenger_load": random.uniform(0.3, 1.0) if train["passenger_capacity"] else None,
                    "cargo_load": random.uniform(0.4, 1.0) if train["cargo_capacity"] else None,
                    "weather": random.choice(["CLEAR", "RAIN", "FOG", "CLOUDY"]),
                    "incidents": random.randint(0, 3),
                    "maintenance_issues": random.random() < 0.05
                }
                
                # Calculate actual departure
                if performance["scheduled_departure"]:
                    performance["actual_departure"] = (
                        performance["scheduled_departure"] + 
                        timedelta(minutes=delay_minutes)
                    )
                
                performance_data.append(performance)
        
        return performance_data
    
    def save_dataset(self, data: Dict[str, Any], filename: str):
        """Save generated dataset to file"""
        # Convert datetime objects to ISO format for JSON serialization
        def serialize_datetime(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            elif isinstance(obj, date):
                return obj.isoformat()
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=serialize_datetime)
    
    def generate_complete_dataset(self, num_trains: int = 50, num_sections: int = 10) -> Dict[str, Any]:
        """Generate complete synthetic dataset"""
        print("Generating trains...")
        trains = self.generate_train_data(num_trains)
        
        print("Generating sections...")
        sections = self.generate_section_data(num_sections)
        
        print("Generating delay scenarios...")
        delays = self.generate_delay_scenarios(trains, num_scenarios=30)
        
        print("Generating traffic patterns...")
        patterns = self.generate_traffic_patterns(sections)
        
        print("Generating historical performance...")
        performance = self.generate_historical_performance(trains, days=30)
        
        dataset = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "num_trains": len(trains),
                "num_sections": len(sections),
                "num_delay_scenarios": len(delays),
                "performance_days": 30
            },
            "trains": trains,
            "sections": sections,
            "delay_scenarios": delays,
            "traffic_patterns": patterns,
            "historical_performance": performance
        }
        
        return dataset

def generate_synthetic_data(num_samples: int = 1000, seed: int = 42) -> List[Dict[str, Any]]:
    """
    Generate synthetic training data for ML models
    
    Args:
        num_samples: Number of training samples to generate
        seed: Random seed for reproducibility
        
    Returns:
        List of training samples with features and target values
    """
    generator = SyntheticDataGenerator(seed=seed)
    
    # Generate base data
    num_trains = min(num_samples // 10, 100)
    num_sections = min(num_samples // 50, 20)
    
    trains = generator.generate_train_data(num_trains)
    sections = generator.generate_section_data(num_sections)
    historical_data = generator.generate_historical_performance(trains, days=30)
    
    # Convert to ML training format
    training_data = []
    
    for performance in historical_data:
        # Find corresponding train
        train = next((t for t in trains if t['id'] == performance['train_id']), None)
        if not train:
            continue
            
        # Select a random section
        section = random.choice(sections)
        
        # Create training sample
        sample = {
                # Train features
                'priority': train['priority'],
                'length': train['length'],
                'max_speed': train['max_speed'],
                'acceleration': train.get('acceleration', 1.0),
                'deceleration': train.get('deceleration', 1.2),
                'weight': train.get('weight', train['length'] * 20),
                'energy_efficiency': train.get('energy_efficiency', 0.8),
                'punctuality_score': train.get('punctuality_score', 0.8),
                'train_type': train['train_type'],            # Section features  
            'section_length': section['length'],
            'section_max_speed': section['max_speed'],
            'section_occupancy': random.uniform(0, section['max_occupancy']),
            'section_capacity': section['max_occupancy'],
            
            # Environmental features
            'weather': performance.get('weather', 'CLEAR'),
            'operator': train.get('operator', 'DEFAULT_OP'),
            'service_class': train.get('service_class', 'REGULAR'),
            
            # Temporal features
            'scheduled_departure': performance['scheduled_departure'].isoformat(),
            'actual_departure': performance['actual_departure'].isoformat() if performance['actual_departure'] else performance['scheduled_departure'].isoformat(),
            
            # Target variable
            'delay_minutes': performance['delay_minutes']
        }
        
        training_data.append(sample)
    
    # Ensure we have enough samples by generating additional ones
    while len(training_data) < num_samples:
        # Generate additional samples by creating variations
        if training_data:
            base_sample = random.choice(training_data[:100])
            new_sample = base_sample.copy()
            
            # Add some variation
            new_sample['priority'] = max(1, min(5, new_sample['priority'] + random.randint(-1, 1)))
            new_sample['punctuality_score'] = max(0.5, min(1.0, new_sample['punctuality_score'] + random.uniform(-0.1, 0.1)))
            new_sample['section_occupancy'] = max(0, min(new_sample['section_capacity'], 
                                                        new_sample['section_occupancy'] + random.uniform(-0.5, 0.5)))
            
            # Adjust delay based on changes
            delay_adjustment = random.uniform(-2, 3)
            new_sample['delay_minutes'] = max(0, new_sample['delay_minutes'] + delay_adjustment)
            
            # Update timestamps
            base_time = datetime.now() + timedelta(hours=random.uniform(0, 48))
            new_sample['scheduled_departure'] = base_time.isoformat()
            new_sample['actual_departure'] = (base_time + timedelta(minutes=new_sample['delay_minutes'])).isoformat()
            
            training_data.append(new_sample)
        else:
            # Create a basic sample if no data exists yet
            basic_sample = {
                'priority': random.randint(1, 5),
                'length': random.uniform(150, 400),
                'max_speed': random.uniform(80, 160),
                'acceleration': 1.0,
                'deceleration': 1.2,
                'weight': random.uniform(3000, 8000),
                'energy_efficiency': random.uniform(0.6, 0.9),
                'punctuality_score': random.uniform(0.7, 0.95),
                'train_type': random.choice(['EXPRESS', 'FREIGHT', 'SUBURBAN']),
                'section_length': random.uniform(500, 2000),
                'section_max_speed': random.uniform(80, 120),
                'section_occupancy': random.uniform(0, 2),
                'section_capacity': random.randint(1, 3),
                'weather': random.choice(['CLEAR', 'CLOUDY', 'RAIN', 'FOG']),
                'operator': 'DEFAULT_OP',
                'service_class': 'REGULAR',
                'scheduled_departure': datetime.now().isoformat(),
                'actual_departure': datetime.now().isoformat(),
                'delay_minutes': random.uniform(0, 15)
            }
            training_data.append(basic_sample)
    
    return training_data[:num_samples]

# Usage example and data generation script
if __name__ == "__main__":
    generator = SyntheticDataGenerator()
    
    # Generate complete dataset
    dataset = generator.generate_complete_dataset(num_trains=100, num_sections=20)
    
    # Save to file
    generator.save_dataset(dataset, "data/synthetic/railway_dataset.json")
    
    print(f"Generated dataset with:")
    print(f"- {len(dataset['trains'])} trains")
    print(f"- {len(dataset['sections'])} sections")
    print(f"- {len(dataset['delay_scenarios'])} delay scenarios")
    print(f"- {len(dataset['historical_performance'])} performance records")