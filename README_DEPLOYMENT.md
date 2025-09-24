# TrackWise Railway Optimization System 🚂

## Executive Summary

TrackWise is a comprehensive railway traffic optimization system designed to provide real-time decision support for railway traffic controllers. The system optimizes train precedence decisions at critical sections (junctions, stations, bridges) to minimize delays, maximize throughput, and ensure safe operations.

## 🏗️ System Architecture

### Backend (FastAPI + Python)
- **FastAPI**: High-performance REST API framework
- **SQLAlchemy**: Database ORM with async support
- **OR-Tools CP-SAT**: Constraint programming solver for optimization
- **JWT Authentication**: Secure user authentication
- **WebSocket Support**: Real-time updates
- **ML Integration**: Delay prediction and disruption detection

### Frontend (React + TypeScript)
- **React 18**: Modern UI framework
- **Tailwind CSS**: Utility-first styling
- **React Query**: Data fetching and caching
- **Zustand**: State management
- **Recharts**: Data visualization
- **Real-time Dashboard**: Live traffic monitoring

### Database
- **SQLite**: Lightweight, embedded database
- **Alembic**: Database migrations
- **Async Support**: Non-blocking database operations

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TrackWise
   ```

2. **Automated Deployment**
   ```bash
   ./deploy_production.sh
   ```

3. **Manual Installation**
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt
   
   # Install Node.js dependencies
   cd Frontend && npm install && cd ..
   
   # Setup database
   cd backend && python setup_database.py && cd ..
   
   # Build frontend
   cd Frontend && npm run build && cd ..
   ```

### Starting the System

```bash
# Quick start (recommended)
./start_production.sh

# Or start components individually
npm run start:backend    # Backend API (port 8000)
npm run start:frontend   # Frontend (port 3000)
```

### Health Check

```bash
./health_check.sh
```

## 📊 System Features

### 1. Real-Time Decision Support
- **Train Precedence Optimization**: Determines optimal train ordering at junctions
- **Constraint Programming**: Uses OR-Tools CP-SAT for complex optimization
- **Multi-Objective Optimization**: Balances delay minimization and throughput maximization
- **Safety Constraints**: Ensures minimum headway and capacity limits

### 2. Machine Learning Predictions
- **Delay Prediction**: ML models predict train delays based on historical patterns
- **Disruption Detection**: Early warning system for potential disruptions
- **Weather Integration**: Weather impact on operations
- **Traffic Pattern Analysis**: Learns from historical data

### 3. Controller Dashboard
- **Real-Time Monitoring**: Live view of train positions and status
- **Decision Recommendations**: AI-powered suggestions for traffic controllers
- **What-If Analysis**: Scenario planning and impact assessment
- **KPI Tracking**: Performance metrics and analytics

### 4. API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - User profile

#### Decision Support
- `POST /api/decisions/optimize` - Traffic optimization
- `POST /api/decisions/analyze` - What-if analysis
- `GET /api/decisions/kpis` - Performance metrics

#### Train Management
- `GET /api/trains` - List trains
- `POST /api/trains` - Create train
- `PUT /api/trains/{id}` - Update train
- `DELETE /api/trains/{id}` - Delete train

#### Section Management
- `GET /api/sections` - List sections
- `POST /api/sections` - Create section
- `PUT /api/sections/{id}` - Update section

#### Analytics
- `GET /api/analytics/performance` - System performance
- `GET /api/analytics/delays` - Delay analysis
- `GET /api/analytics/throughput` - Throughput metrics

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Application
ENVIRONMENT=production
LOG_LEVEL=INFO
SECRET_KEY=your-secret-key

# Database
DATABASE_URL=sqlite:///./railway_optimization.db

# API Configuration
API_RATE_LIMIT=100
API_TIMEOUT_SECONDS=30
CORS_ORIGINS=http://localhost:3000

# ML Configuration
ENABLE_ML_PREDICTIONS=true
ML_MODEL_PATH=./ml_models/
RETRAIN_INTERVAL_HOURS=24

# Optimization
SOLVER_TIMEOUT_SECONDS=30
MAX_OPTIMIZATION_HORIZON=240
DEFAULT_OPTIMIZATION_OBJECTIVE=minimize_delays
```

## 🏛️ Data Models

### Train Model
```python
{
    "train_id": "T001",
    "train_type": "EXPRESS",
    "priority": 1,
    "max_speed": 120,
    "current_section": "S001",
    "destination": "STATION_B",
    "estimated_arrival": "2025-01-01T10:30:00Z"
}
```

### Section Model
```python
{
    "section_id": "S001",
    "section_type": "JUNCTION",
    "capacity": 1,
    "length": 1000,
    "max_speed": 80,
    "current_occupancy": 0,
    "status": "ACTIVE"
}
```

### Optimization Request
```python
{
    "situations": [
        {
            "section_id": "S001",
            "train_id": "T001",
            "train_priority": 1,
            "expected_arrival": "2025-01-01T10:30:00Z",
            "section_capacity": 1,
            "current_occupancy": 0
        }
    ],
    "time_horizon_minutes": 60,
    "optimization_objective": "minimize_delays"
}
```

## 🔍 API Documentation

Once the system is running, access the interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest tests/ -v
```

### Frontend Tests
```bash
cd Frontend
npm test
```

### Integration Tests
```bash
# Run full test suite
npm run test
```

## 📈 Performance Monitoring

### Key Performance Indicators (KPIs)
- **On-Time Performance**: Percentage of trains arriving on schedule
- **Average Delay**: Mean delay across all trains
- **Throughput Efficiency**: Section utilization rate
- **Conflict Resolution**: Number of conflicts resolved
- **API Response Time**: Average response time for optimization requests

### Monitoring Endpoints
- `/health` - System health check
- `/metrics` - Prometheus metrics (if enabled)
- `/api/analytics/performance` - Performance dashboard

## 🐳 Docker Deployment

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Dockerfile Configuration
- **Backend**: Multi-stage Python build
- **Frontend**: Nginx-served React build
- **Database**: SQLite volume mount

## 🔐 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure authentication
- **Role-Based Access**: Different access levels
- **Token Refresh**: Automatic token renewal
- **Session Management**: Secure session handling

### API Security
- **Rate Limiting**: Prevents API abuse
- **CORS Configuration**: Cross-origin request handling
- **Input Validation**: Request payload validation
- **SQL Injection Protection**: ORM-based queries

## 🛠️ Development

### Development Setup
```bash
# Install development dependencies
pip install -r requirements-dev.txt
cd Frontend && npm install && cd ..

# Start development servers
npm run start:backend    # Backend with hot reload
npm run start:frontend   # Frontend with hot reload
```

### Code Quality
```bash
# Backend linting and formatting
cd backend
black .
flake8 .
mypy .

# Frontend linting
cd Frontend
npm run lint
npm run format
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :8000
   # Kill process
   kill -9 <PID>
   ```

2. **Database Connection Issues**
   ```bash
   # Reset database
   rm railway_optimization.db
   cd backend && python setup_database.py
   ```

3. **Frontend Build Errors**
   ```bash
   # Clear cache and reinstall
   cd Frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Python Import Errors**
   ```bash
   # Install missing dependencies
   pip install -r requirements.txt
   
   # Check Python path
   export PYTHONPATH=$PWD:$PYTHONPATH
   ```

### Logs
- **Application Logs**: `./logs/trackwise.log`
- **Database Logs**: SQLite doesn't generate separate logs
- **API Access Logs**: Included in application logs

## 📞 Support

### System Status
- Check system health: `./health_check.sh`
- View active processes: `ps aux | grep trackwise`
- Monitor resource usage: `htop` or `top`

### Getting Help
1. Check the logs: `tail -f logs/trackwise.log`
2. Verify configuration: Check `.env` file
3. Test endpoints: Use the API documentation at `/docs`
4. Restart services: `./stop_production.sh && ./start_production.sh`

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**TrackWise Railway Optimization System** - Optimizing railway operations through intelligent decision support. 🚂✨