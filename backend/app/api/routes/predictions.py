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
    # Fallback mock prediction service
    class PredictionService:
        def __init__(self):
            self.models_loaded = False
            self.delay_predictor = None
        
        async def initialize(self):
            pass
        
        async def predict_delay(self, train, section, time_horizon):
            return {
                'value': 2.5,
                'confidence_interval': (1.0, 4.0),
                'uncertainty': 0.3,
                'factors': {'weather': 0.1, 'traffic': 0.8}
            }
        
        async def predict_disruption(self, train, section, time_horizon):
            return {
                'probability': 0.15,
                'risk_level': 'low',
                'factors': ['weather conditions'],
                'recommended_actions': ['monitor closely']
            }
        
        async def train_models(self):
            return {'status': 'mock_training_complete'}

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
            "disruption_detector_available": hasattr(prediction_service, 'disruption_detector'),
            "last_updated": prediction_service.delay_predictor.last_updated if hasattr(prediction_service.delay_predictor, 'last_updated') else None
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting model status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")

@router.post("/train")
async def train_models():
    """Trigger model training with synthetic data"""
    try:
        result = await prediction_service.train_models()
        return {"status": "success", "message": "Models trained successfully", "details": result}
        
    except Exception as e:
        logger.error(f"Error training models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")