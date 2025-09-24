import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

from ml_models.models.delay_predictor import DelayPredictor

logger = logging.getLogger(__name__)

class PredictionService:
    """Centralized service for ML predictions"""
    
    def __init__(self):
        self.delay_predictor = DelayPredictor()
        self.models_loaded = False
        self.model_paths = {
            'delay_predictor': 'ml_models/models/delay_predictor.joblib'
        }
    
    async def initialize(self):
        """Initialize and load ML models"""
        try:
            # Load delay predictor
            try:
                self.delay_predictor.load_model(self.model_paths['delay_predictor'])
                logger.info("Delay predictor model loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load delay predictor: {str(e)}")
                # Use default model if loading fails
                self._initialize_default_models()
            
            self.models_loaded = True
            
        except Exception as e:
            logger.error(f"Error initializing prediction service: {str(e)}")
            self._initialize_default_models()
    
    def _initialize_default_models(self):
        """Initialize with default/dummy models"""
        logger.info("Initializing with default models")
        # For demo purposes, we'll use simple heuristic models
        self.models_loaded = True
    
    async def predict_delay(
        self, 
        train: Dict[str, Any], 
        section: Dict[str, Any], 
        time_horizon: int = 1800
    ) -> Dict[str, Any]:
        """Predict delay for a train in a section"""
        try:
            if not self.models_loaded:
                await self.initialize()
            
            # Convert models to dict if needed
            train_data = train
            section_data = section
            
            # Prepare prediction input
            input_data = [{
                **train_data,
                'section_length': section_data.get('length', 1000),
                'section_max_speed': section_data.get('max_speed', 100),
                'section_occupancy': section_data.get('current_occupancy', 0),
                'section_capacity': section_data.get('max_occupancy', 1),
                'time_horizon': time_horizon,
                'current_time': datetime.now().isoformat(),
                'weather': self._get_current_weather(),
                'traffic_density': self._estimate_traffic_density(section_data)
            }]
            
            # Use ML model if available, otherwise use heuristic
            if self.delay_predictor.is_trained:
                predictions = self.delay_predictor.predict(input_data)
                result = predictions[0]
            else:
                result = self._heuristic_delay_prediction(train_data, section_data, time_horizon)
            
            return result
            
        except Exception as e:
            logger.error(f"Error predicting delay: {str(e)}")
            # Return fallback prediction
            return {
                'value': 5.0,  # 5 minute default delay
                'confidence_interval': (2.0, 8.0),
                'uncertainty': 2.0,
                'factors': {'error': 'prediction_failed'}
            }
    
    async def predict_arrival(
        self, 
        train: Dict[str, Any], 
        section: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Predict arrival time at a section"""
        try:
            # Convert models to dict if needed
            train_data = train
            section_data = section
            
            # Calculate base travel time
            distance = section_data.get('length', 1000)  # meters
            max_speed = min(
                train_data.get('max_speed', 100),
                section_data.get('max_speed', 100)
            )
            
            # Convert to m/s
            speed_ms = max_speed * 1000 / 3600
            base_time = distance / speed_ms
            
            # Add delays and variations
            delay_prediction = await self.predict_delay(train, section)
            predicted_delay = delay_prediction.get('value', 0)
            
            # Calculate arrival time
            current_time = datetime.now()
            estimated_arrival = current_time + timedelta(seconds=base_time + predicted_delay * 60)
            
            return {
                'value': estimated_arrival.timestamp(),
                'arrival_time': estimated_arrival.isoformat(),
                'base_travel_time': base_time,
                'predicted_delay': predicted_delay,
                'confidence_interval': (
                    (estimated_arrival - timedelta(minutes=3)).timestamp(),
                    (estimated_arrival + timedelta(minutes=8)).timestamp()
                ),
                'factors': {
                    'distance': distance,
                    'max_speed': max_speed,
                    'predicted_delay': predicted_delay
                }
            }
            
        except Exception as e:
            logger.error(f"Error predicting arrival: {str(e)}")
            return {
                'value': (datetime.now() + timedelta(minutes=10)).timestamp(),
                'arrival_time': (datetime.now() + timedelta(minutes=10)).isoformat(),
                'factors': {'error': 'prediction_failed'}
            }
    
    async def predict_conflict(
        self, 
        train: Dict[str, Any], 
        section: Dict[str, Any], 
        time_horizon: int = 1800
    ) -> Dict[str, Any]:
        """Predict potential conflicts"""
        try:
            # Convert models to dict if needed
            train_data = train
            section_data = section
            
            # Calculate conflict probability based on multiple factors
            base_conflict_prob = 0.1  # 10% base probability
            
            # Factor 1: Section capacity utilization
            occupancy = section_data.get('current_occupancy', 0)
            capacity = section_data.get('max_occupancy', 1)
            utilization = occupancy / capacity if capacity > 0 else 0
            capacity_factor = utilization ** 2  # Exponential increase with utilization
            
            # Factor 2: Train priority (lower priority = higher conflict risk)
            priority = train_data.get('priority', 3)
            priority_factor = (6 - priority) / 5  # Scale to 0-1
            
            # Factor 3: Time of day (peak hours have higher conflict risk)
            current_hour = datetime.now().hour
            if current_hour in [7, 8, 9, 17, 18, 19]:  # Peak hours
                time_factor = 1.5
            elif 22 <= current_hour or current_hour <= 5:  # Night hours
                time_factor = 0.5
            else:
                time_factor = 1.0
            
            # Factor 4: Weather conditions
            weather_factor = self._get_weather_conflict_factor()
            
            # Calculate total conflict probability
            conflict_probability = min(0.95, base_conflict_prob * (
                1 + capacity_factor + priority_factor * 0.3
            ) * time_factor * weather_factor)
            
            # Determine conflict type
            if conflict_probability > 0.7:
                conflict_type = "HIGH_RISK"
            elif conflict_probability > 0.4:
                conflict_type = "MEDIUM_RISK"
            elif conflict_probability > 0.2:
                conflict_type = "LOW_RISK"
            else:
                conflict_type = "MINIMAL_RISK"
            
            return {
                'value': float(conflict_probability),
                'conflict_type': conflict_type,
                'confidence_interval': (
                    max(0, conflict_probability - 0.1),
                    min(1, conflict_probability + 0.1)
                ),
                'factors': {
                    'capacity_utilization': utilization,
                    'priority_factor': priority_factor,
                    'time_factor': time_factor,
                    'weather_factor': weather_factor,
                    'base_probability': base_conflict_prob
                }
            }
            
        except Exception as e:
            logger.error(f"Error predicting conflict: {str(e)}")
            return {
                'value': 0.3,  # Default medium risk
                'conflict_type': "MEDIUM_RISK",
                'factors': {'error': 'prediction_failed'}
            }
    
    def _heuristic_delay_prediction(
        self, 
        train_data: Dict[str, Any], 
        section_data: Dict[str, Any], 
        time_horizon: int
    ) -> Dict[str, Any]:
        """Heuristic-based delay prediction when ML model unavailable"""
        
        # Base delay factors
        base_delay = 2.0  # 2 minutes base
        
        # Priority factor (higher priority = lower delay)
        priority = train_data.get('priority', 3)
        priority_factor = priority / 3  # Normalize
        
        # Section congestion factor
        occupancy = section_data.get('current_occupancy', 0)
        capacity = section_data.get('max_occupancy', 1)
        congestion_factor = (occupancy / capacity) if capacity > 0 else 0
        
        # Time of day factor
        current_hour = datetime.now().hour
        if current_hour in [7, 8, 9, 17, 18, 19]:  # Peak hours
            time_factor = 1.5
        else:
            time_factor = 1.0
        
        # Train type factor
        train_type = train_data.get('train_type', 'SUBURBAN')
        if train_type == 'EXPRESS':
            type_factor = 0.8  # Express trains have priority
        elif train_type == 'FREIGHT':
            type_factor = 1.3  # Freight trains more likely to be delayed
        else:
            type_factor = 1.0
        
        # Calculate predicted delay
        predicted_delay = base_delay * priority_factor * (1 + congestion_factor) * time_factor * type_factor
        
        # Add some randomness for realism
        import random
        random_factor = random.uniform(0.8, 1.2)
        predicted_delay *= random_factor
        
        return {
            'value': max(0, predicted_delay),  # Main prediction value
            'predicted_delay': max(0, predicted_delay),
            'confidence_interval': (max(0, predicted_delay - 2), predicted_delay + 3),
            'uncertainty': 1.5,
            'risk_level': 'MEDIUM' if predicted_delay > 5 else 'LOW',
            'factors': {
                'priority_factor': priority_factor,
                'congestion_factor': congestion_factor,
                'time_factor': time_factor,
                'type_factor': type_factor
            }
        }
    
    def _get_current_weather(self) -> str:
        """Get current weather conditions (simplified)"""
        # In a real implementation, this would connect to weather API
        import random
        weather_conditions = ["CLEAR", "CLOUDY", "RAIN", "FOG"]
        return random.choice(weather_conditions)
    
    def _get_weather_conflict_factor(self) -> float:
        """Get weather impact factor for conflicts"""
        weather = self._get_current_weather()
        weather_factors = {
            "CLEAR": 1.0,
            "CLOUDY": 1.1,
            "RAIN": 1.3,
            "FOG": 1.5,
            "STORM": 2.0,
            "SNOW": 1.8
        }
        return weather_factors.get(weather, 1.0)
    
    def _estimate_traffic_density(self, section_data: Dict[str, Any]) -> float:
        """Estimate current traffic density"""
        occupancy = section_data.get('current_occupancy', 0)
        capacity = section_data.get('max_occupancy', 1)
        return occupancy / capacity if capacity > 0 else 0
    
    async def batch_predict(
        self, 
        requests: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Process multiple prediction requests"""
        results = []
        
        for request in requests:
            try:
                prediction_type = request.get('type', 'delay')
                train_data = request.get('train', {})
                section_data = request.get('section', {})
                
                if prediction_type == 'delay':
                    result = await self.predict_delay(train_data, section_data)
                elif prediction_type == 'arrival':
                    result = await self.predict_arrival(train_data, section_data)
                elif prediction_type == 'conflict':
                    result = await self.predict_conflict(train_data, section_data)
                else:
                    result = {'error': f'Unknown prediction type: {prediction_type}'}
                
                results.append({
                    'request_id': request.get('id'),
                    'type': prediction_type,
                    'result': result
                })
                
            except Exception as e:
                logger.error(f"Error in batch prediction: {str(e)}")
                results.append({
                    'request_id': request.get('id'),
                    'error': str(e)
                })
        
        return results

    async def predict_disruption(
        self, 
        train: Dict[str, Any], 
        section: Dict[str, Any], 
        time_horizon: int = 1800
    ) -> Dict[str, Any]:
        """Predict potential disruptions for a train in a section"""
        try:
            if not self.models_loaded:
                await self.initialize()
            
            # Convert models to dict if needed
            train_data = train
            section_data = section
            
            # Calculate disruption probability based on multiple factors
            factors = []
            probability = 0.0
            
            # Weather factor
            weather = self._get_current_weather()
            if weather in ["RAIN", "FOG", "STORM", "SNOW"]:
                probability += 0.2
                factors.append(f"adverse_weather_{weather.lower()}")
            
            # Traffic density factor
            traffic_density = self._estimate_traffic_density(section_data)
            if traffic_density > 0.8:
                probability += 0.3
                factors.append("high_traffic_density")
            
            # Train characteristics
            train_priority = train_data.get('priority', 5)
            if train_priority < 3:  # High priority trains are more disruptive
                probability += 0.15
                factors.append("high_priority_train")
            
            # Section characteristics
            section_capacity = section_data.get('max_occupancy', 1)
            if section_capacity == 1:  # Single track sections are more prone to disruptions
                probability += 0.2
                factors.append("single_track_section")
            
            # Historical performance
            punctuality = train_data.get('punctuality_score', 0.9)
            if punctuality < 0.7:
                probability += 0.25
                factors.append("poor_punctuality_history")
            
            # Time of day
            current_hour = datetime.now().hour
            if current_hour in [7, 8, 9, 17, 18, 19]:  # Peak hours
                probability += 0.1
                factors.append("peak_hour_operations")
            
            # Cap probability at 1.0
            probability = min(probability, 1.0)
            
            # Determine risk level
            if probability < 0.2:
                risk_level = "LOW"
                recommended_actions = ["Monitor train progress", "Continue normal operations"]
            elif probability < 0.5:
                risk_level = "MEDIUM"
                recommended_actions = [
                    "Increase monitoring frequency",
                    "Prepare alternative routes",
                    "Alert control center"
                ]
            elif probability < 0.8:
                risk_level = "HIGH"
                recommended_actions = [
                    "Implement speed restrictions",
                    "Activate alternative routes",
                    "Coordinate with neighboring sections",
                    "Prepare delay notifications"
                ]
            else:
                risk_level = "CRITICAL"
                recommended_actions = [
                    "Consider train rerouting",
                    "Implement emergency protocols",
                    "Coordinate with all stakeholders",
                    "Prepare passenger notifications",
                    "Alert emergency services if needed"
                ]
            
            return {
                'probability': probability,
                'risk_level': risk_level,
                'factors': factors,
                'recommended_actions': recommended_actions,
                'prediction_time': datetime.now().isoformat(),
                'time_horizon_minutes': time_horizon // 60
            }
            
        except Exception as e:
            logger.error(f"Error predicting disruption: {str(e)}")
            return {
                'probability': 0.3,  # Default moderate risk
                'risk_level': 'MEDIUM',
                'factors': ['prediction_error'],
                'recommended_actions': ['Manual assessment required'],
                'prediction_time': datetime.now().isoformat(),
                'error': str(e)
            }

    async def train_models(self) -> Dict[str, Any]:
        """Train ML models using synthetic data"""
        try:
            # Generate synthetic training data
            from ml_models.data.synthetic_generator import generate_synthetic_data
            
            logger.info("Generating synthetic training data...")
            training_data = generate_synthetic_data(num_samples=1000)
            
            # Train delay predictor
            logger.info("Training delay predictor...")
            metrics = self.delay_predictor.train(training_data)
            
            return {
                'delay_predictor_metrics': metrics,
                'training_samples': len(training_data),
                'status': 'success',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error training models: {str(e)}")
            return {
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }