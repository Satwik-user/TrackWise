#!/usr/bin/env python3
"""
Debug script to test enhanced simulation initialization
"""

import asyncio
import sys
import os
sys.path.append('/home/satwik/TrackWise/backend')

from app.database import AsyncSessionLocal
from app.services.enhanced_simulation_engine import EnhancedSimulationEngine

async def test_simulation():
    print("=== Enhanced Simulation Debug Test ===")
    
    # Create simulation engine
    engine = EnhancedSimulationEngine()
    print(f"1. Created engine with status: {engine.status}")
    
    try:
        # Test database connection
        async with AsyncSessionLocal() as session:
            print("2. Database connection successful")
            
            # Initialize simulation
            print("3. Initializing simulation...")
            await engine.initialize(session, duration_hours=1)
            
            print(f"4. Initialization complete!")
            print(f"   - Status: {engine.status}")
            print(f"   - Total trains loaded: {len(engine.trains)}")
            print(f"   - Total sections loaded: {len(engine.sections)}")
            print(f"   - Start time: {engine.start_time}")
            print(f"   - End time: {engine.end_time}")
            
            # Show sample train data
            if engine.trains:
                print("5. Sample train data:")
                for i, (train_id, train_state) in enumerate(list(engine.trains.items())[:3]):
                    print(f"   Train {train_id}: Section {train_state.current_section_id}, Speed {train_state.speed_kmh} km/h, Status {train_state.status}")
            
            # Show sample section data  
            if engine.sections:
                print("6. Sample section data:")
                for i, (section_id, section) in enumerate(list(engine.sections.items())[:3]):
                    print(f"   Section {section_id}: {section.section_code}, Length {section.length_km} km")
            
            # Test metrics calculation
            if hasattr(engine, '_update_metrics'):
                await engine._update_metrics()
                if hasattr(engine, 'current_metrics'):
                    metrics = engine.current_metrics
                    print("7. Initial metrics:")
                    print(f"   - Total trains: {metrics.total_trains}")
                    print(f"   - Active trains: {metrics.active_trains}")
                    print(f"   - On-time percentage: {metrics.on_time_percentage}%")
            
            # Test train positions
            positions = engine.get_train_positions()
            print("8. Train positions data:")
            print(f"   - Total trains with positions: {positions['total_trains']}")
            print(f"   - Active trains: {positions['active_trains']}")
            
            return True
            
    except Exception as e:
        print(f"Error during simulation test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_simulation())
    print(f"\n=== Test Result: {'SUCCESS' if result else 'FAILED'} ===")