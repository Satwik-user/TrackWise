#!/usr/bin/env python3
"""
Comprehensive synthetic data generator for TrackWise Railway System
"""

import sys
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def setup_database():
    """Setup database connection without model conflicts"""
    try:
        # Import SQLAlchemy core
        from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Float, DateTime, text
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.sql import func
        
        # Create engine
        DATABASE_URL = "sqlite:///./railway_optimization.db"
        engine = create_engine(DATABASE_URL)
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        return engine, SessionLocal
    except Exception as e:
        print(f"Database setup error: {e}")
        raise

# Train types and their characteristics
TRAIN_TYPES = {
    "PASSENGER": {"max_speed": 120, "priority": 3},
    "EXPRESS": {"max_speed": 160, "priority": 2},
    "FREIGHT": {"max_speed": 80, "priority": 4},
    "HIGH_SPEED": {"max_speed": 200, "priority": 1},
    "LOCAL": {"max_speed": 100, "priority": 5},
    "MAIL": {"max_speed": 140, "priority": 2},
    "METRO": {"max_speed": 80, "priority": 3}
}

# Section types and their characteristics
SECTION_TYPES = {
    "MAIN_LINE": {"max_speed": 160, "capacity": 2},
    "BRANCH_LINE": {"max_speed": 100, "capacity": 1},
    "TERMINAL": {"max_speed": 50, "capacity": 5},
    "JUNCTION": {"max_speed": 80, "capacity": 3},
    "YARD": {"max_speed": 30, "capacity": 10},
    "PLATFORM": {"max_speed": 20, "capacity": 2},
    "DEPOT": {"max_speed": 15, "capacity": 8}
}

# Train statuses
TRAIN_STATUSES = ["RUNNING", "STOPPED", "DELAYED", "MAINTENANCE", "DEPARTED", "ARRIVED"]

# Section statuses
SECTION_STATUSES = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "BLOCKED"]

# Indian railway stations for realistic names
STATION_NAMES = [
    "Mumbai Central", "New Delhi", "Chennai Central", "Kolkata", "Bangalore City",
    "Hyderabad", "Pune Junction", "Ahmedabad", "Surat", "Kanpur Central",
    "Lucknow Junction", "Nagpur Junction", "Indore Junction", "Bhopal Junction",
    "Patna Junction", "Guwahati", "Ranchi", "Raipur Junction", "Vijayawada Junction",
    "Coimbatore Junction", "Madurai Junction", "Trivandrum Central", "Cochin",
    "Mangalore Central", "Mysore Junction", "Hubli Junction", "Belgaum",
    "Sholapur Junction", "Nashik Road", "Aurangabad", "Amritsar Junction",
    "Jalandhar City", "Ludhiana Junction", "Chandigarh", "Dehradun",
    "Haridwar Junction", "Rishikesh", "Jammu Tawi", "Udaipur City",
    "Jodhpur Junction", "Bikaner Junction", "Jaipur Junction", "Ajmer Junction",
    "Gwalior Junction", "Jhansi Junction", "Agra Cantt", "Mathura Junction",
    "Varanasi Junction", "Allahabad Junction", "Gorakhpur Junction", "Bareilly"
]

def clear_existing_data(db):
    """Clear existing train and section data"""
    print("🗑️  Clearing existing data...")
    db.query(Train).delete()
    db.query(Section).delete()
    db.commit()
    print("✅ Existing data cleared")

def generate_sections(db, count=30):
    """Generate realistic railway sections"""
    print(f"🚉 Generating {count} sections...")
    
    sections = []
    used_codes = set()
    
    for i in range(count):
        # Generate unique section code
        while True:
            code = f"SEC{random.randint(100, 999)}"
            if code not in used_codes:
                used_codes.add(code)
                break
        
        # Pick random station and section type
        station = random.choice(STATION_NAMES)
        section_type = random.choice(list(SECTION_TYPES.keys()))
        type_config = SECTION_TYPES[section_type]
        
        # Generate section name
        section_names = [
            f"{station} {section_type.replace('_', ' ').title()}",
            f"{station} Platform {random.randint(1, 6)}",
            f"{station} Yard {random.randint(1, 3)}",
            f"{station} - {random.choice(STATION_NAMES)} Line"
        ]
        name = random.choice(section_names)
        
        # Random properties
        status = random.choice(SECTION_STATUSES)
        length = round(random.uniform(2.0, 25.0), 1)
        max_speed = type_config["max_speed"] + random.randint(-20, 20)
        max_capacity = type_config["capacity"] + random.randint(0, 2)
        
        section = Section(
            section_code=code,
            name=name,
            section_type=section_type,
            status=status,
            length_km=length,
            max_speed_kmh=max_speed,
            max_capacity=max_capacity
        )
        
        sections.append(section)
    
    # Bulk insert
    db.add_all(sections)
    db.commit()
    print(f"✅ Generated {len(sections)} sections")
    return sections

def generate_trains(db, count=60, max_section_id=30):
    """Generate realistic trains"""
    print(f"🚂 Generating {count} trains...")
    
    trains = []
    used_numbers = set()
    
    for i in range(count):
        # Generate unique train number
        while True:
            if random.choice([True, False]):
                # Indian railway numbering pattern
                number = f"{random.randint(10000, 99999)}"
            else:
                # Express train numbering
                number = f"{random.randint(2000, 8999)}"
            
            if number not in used_numbers:
                used_numbers.add(number)
                break
        
        # Pick random train type
        train_type = random.choice(list(TRAIN_TYPES.keys()))
        type_config = TRAIN_TYPES[train_type]
        
        # Generate train name
        origin = random.choice(STATION_NAMES)
        destination = random.choice([s for s in STATION_NAMES if s != origin])
        
        train_names = [
            f"{origin} - {destination} {train_type.replace('_', ' ').title()}",
            f"{origin} Express",
            f"{destination} Special",
            f"Rajdhani Express",
            f"Shatabdi Express",
            f"Duronto Express",
            f"Garib Rath",
            f"Jan Shatabdi"
        ]
        name = random.choice(train_names)
        
        # Random properties
        status = random.choice(TRAIN_STATUSES)
        max_speed = type_config["max_speed"] + random.randint(-10, 10)
        current_speed = 0 if status in ["STOPPED", "MAINTENANCE"] else random.randint(40, int(max_speed * 0.9))
        current_section = random.randint(1, max_section_id)
        delay = round(random.uniform(-5.0, 45.0), 1) if status == "DELAYED" else round(random.uniform(-2.0, 5.0), 1)
        
        train = Train(
            train_number=number,
            name=name,
            train_type=train_type,
            status=status,
            max_speed_kmh=max_speed,
            current_speed=current_speed,
            current_section=current_section,
            delay_minutes=delay
        )
        
        trains.append(train)
    
    # Bulk insert
    db.add_all(trains)
    db.commit()
    print(f"✅ Generated {len(trains)} trains")
    return trains

def print_summary(db):
    """Print summary of generated data"""
    print("\n📊 Data Generation Summary:")
    print("=" * 50)
    
    # Count records
    train_count = db.query(Train).count()
    section_count = db.query(Section).count()
    
    print(f"🚂 Total Trains: {train_count}")
    print(f"🚉 Total Sections: {section_count}")
    
    # Train status breakdown
    print("\n🚂 Train Status Breakdown:")
    for status in TRAIN_STATUSES:
        count = db.query(Train).filter(Train.status == status).count()
        print(f"   {status}: {count}")
    
    # Train type breakdown
    print("\n🚂 Train Type Breakdown:")
    for train_type in TRAIN_TYPES:
        count = db.query(Train).filter(Train.train_type == train_type).count()
        print(f"   {train_type}: {count}")
    
    # Section status breakdown
    print("\n🚉 Section Status Breakdown:")
    for status in SECTION_STATUSES:
        count = db.query(Section).filter(Section.status == status).count()
        print(f"   {status}: {count}")
    
    # Section type breakdown
    print("\n🚉 Section Type Breakdown:")
    for section_type in SECTION_TYPES:
        count = db.query(Section).filter(Section.section_type == section_type).count()
        print(f"   {section_type}: {count}")

def main():
    """Main data generation function"""
    print("🚀 Starting TrackWise Synthetic Data Generation")
    print("=" * 60)
    
    try:
        # Create database session
        db = SessionLocal()
        
        # Clear existing data
        clear_existing_data(db)
        
        # Generate sections first (trains reference sections)
        sections = generate_sections(db, count=35)
        max_section_id = len(sections)
        
        # Generate trains
        trains = generate_trains(db, count=75, max_section_id=max_section_id)
        
        # Print summary
        print_summary(db)
        
        print("\n✅ Synthetic data generation completed successfully!")
        print("🚂 Your TrackWise application should now show populated data")
        
    except Exception as e:
        print(f"❌ Error generating synthetic data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)