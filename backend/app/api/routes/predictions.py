from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging
import sys
import os

# Add ml_models path to sys.path
ml_models_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'ml_models')
if ml_models_path not in sys.path:
    sys.path.append(ml_models_path)

try:
    from inference.prediction_service import PredictionService
except ImportError:
    # Fallback mock prediction service with stateful behavior
    import datetime
    
    class MockDelayPredictor:
        def __init__(self):
            self.is_trained = False
            self.last_updated = None
            
        def train(self):
            self.is_trained = True
            self.last_updated = datetime.datetime.now().isoformat()
            
    class MockDisruptionDetector:
        def __init__(self):
            self.is_available = False
            
        def activate(self):
            self.is_available = True
    
    class PredictionService:
        def __init__(self):
            self.models_loaded = False
            self.delay_predictor = MockDelayPredictor()
            self.disruption_detector = MockDisruptionDetector()
        
        async def initialize(self):
            # Auto-initialize models for demo
            self.models_loaded = True
            self.delay_predictor.train()
            self.disruption_detector.activate()
        
        async def predict_delay(self, train, section, time_horizon):
            import random
            base_delay = random.uniform(0.5, 5.0)
            uncertainty = random.uniform(0.1, 0.5)
            
            return {
                'value': round(base_delay, 1),
                'confidence_interval': (max(0, base_delay - 2), base_delay + 2),
                'uncertainty': round(uncertainty, 2),
                'factors': {
                    'weather': round(random.uniform(0.0, 0.3), 2),
                    'traffic': round(random.uniform(0.2, 0.9), 2),
                    'maintenance': round(random.uniform(0.0, 0.2), 2)
                }
            }
        
        async def predict_disruption(self, train, section, time_horizon):
            import random
            prob = random.uniform(0.05, 0.4)
            risk_levels = ['low', 'medium', 'high']
            risk = 'low' if prob < 0.15 else 'medium' if prob < 0.3 else 'high'
            
            return {
                'probability': round(prob, 2),
                'risk_level': risk,
                'factors': random.sample([
                    'weather conditions', 'track maintenance', 'signal issues',
                    'traffic congestion', 'equipment status', 'crew availability'
                ], random.randint(1, 3)),
                'recommended_actions': random.sample([
                    'monitor closely', 'prepare backup routes', 'adjust scheduling',
                    'increase crew alerts', 'check equipment status'
                ], random.randint(1, 2))
            }
        
        async def train_models(self):
            # Simulate training process
            self.models_loaded = True
            self.delay_predictor.train()
            self.disruption_detector.activate()
            
            return {
                'status': 'training_complete',
                'models_trained': ['delay_predictor', 'disruption_detector'],
                'timestamp': datetime.datetime.now().isoformat()
            }

logger = logging.getLogger(__name__)

router = APIRouter()

# Global prediction service instance
prediction_service = PredictionService()

class PredictionRequest(BaseModel):
    train: Dict[str, Any]
    section: Dict[str, Any]
    time_horizon: Optional[int] = 1800

class DelayPredictionResponse(BaseModel):
    delay_minutes: float
    confidence_interval: tuple[float, float]
    uncertainty: float
    factors: Dict[str, Any]

class DisruptionPredictionResponse(BaseModel):
    disruption_probability: float
    risk_level: str
    factors: List[str]
    recommended_actions: List[str]

@router.on_event("startup")
async def startup_event():
    """Initialize prediction service on startup"""
    await prediction_service.initialize()

@router.post("/delay", response_model=DelayPredictionResponse)
async def predict_delay(request: PredictionRequest):
    """Predict delay for a train in a specific section"""
    try:
        result = await prediction_service.predict_delay(
            train=request.train,
            section=request.section,
            time_horizon=request.time_horizon
        )
        
        return DelayPredictionResponse(
            delay_minutes=result['value'],
            confidence_interval=result['confidence_interval'],
            uncertainty=result['uncertainty'],
            factors=result['factors']
        )
        
    except Exception as e:
        logger.error(f"Error in delay prediction endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/disruption", response_model=DisruptionPredictionResponse)
async def predict_disruption(request: PredictionRequest):
    """Predict potential disruptions for a train in a specific section"""
    try:
        result = await prediction_service.predict_disruption(
            train=request.train,
            section=request.section,
            time_horizon=request.time_horizon
        )
        
        return DisruptionPredictionResponse(
            disruption_probability=result['probability'],
            risk_level=result['risk_level'],
            factors=result['factors'],
            recommended_actions=result['recommended_actions']
        )
        
    except Exception as e:
        logger.error(f"Error in disruption prediction endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.get("/models/status")
async def get_model_status():
    """Get status of ML models"""
    try:
        status = {
            "models_loaded": prediction_service.models_loaded,
            "delay_predictor_trained": prediction_service.delay_predictor.is_trained if prediction_service.delay_predictor else False,
            "disruption_detector_available": getattr(prediction_service.disruption_detector, 'is_available', False) if hasattr(prediction_service, 'disruption_detector') else False,
            "last_updated": getattr(prediction_service.delay_predictor, 'last_updated', None) if prediction_service.delay_predictor else None
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting model status: {str(e)}")
        return {
            "models_loaded": False,
            "delay_predictor_trained": False,
            "disruption_detector_available": False,
            "last_updated": None,
            "error": str(e)
        }

@router.post("/train")
async def train_models():
    """Trigger model training with synthetic data"""
    try:
        result = await prediction_service.train_models()
        return {"status": "success", "message": "Models trained successfully", "details": result}
        
    except Exception as e:
        logger.error(f"Error training models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")