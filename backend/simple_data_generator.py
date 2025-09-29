#!/usr/bin/env python3
"""
Simple synthetic data generator using direct SQL for TrackWise Railway System
"""

import sqlite3
import random
from datetime import datetime

# Train types and their characteristics
TRAIN_TYPES = ["PASSENGER", "EXPRESS", "FREIGHT", "HIGH_SPEED", "LOCAL", "MAIL", "METRO"]
TRAIN_STATUSES = ["RUNNING", "STOPPED", "DELAYED", "MAINTENANCE", "DEPARTED", "ARRIVED"]

# Section types and their characteristics
SECTION_TYPES = ["MAIN_LINE", "BRANCH_LINE", "TERMINAL", "JUNCTION", "YARD", "PLATFORM", "DEPOT"]
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

def clear_existing_data(cursor):
    """Clear existing train and section data"""
    print("🗑️  Clearing existing data...")
    cursor.execute("DELETE FROM trains")
    cursor.execute("DELETE FROM sections")
    print("✅ Existing data cleared")

def generate_sections(cursor, count=35):
    """Generate realistic railway sections"""
    print(f"🚉 Generating {count} sections...")
    
    used_codes = set()
    sections_data = []
    
    for i in range(count):
        # Generate unique section code
        while True:
            code = f"SEC{random.randint(100, 999)}"
            if code not in used_codes:
                used_codes.add(code)
                break
        
        # Pick random station and section type
        station = random.choice(STATION_NAMES)
        section_type = random.choice(SECTION_TYPES)
        
        # Generate section name
        section_names = [
            f"{station} {section_type.replace('_', ' ').title()}",
            f"{station} Platform {random.randint(1, 6)}",
            f"{station} Yard {random.randint(1, 3)}",
            f"{station} - {random.choice(STATION_NAMES)} Line"
        ]
        name = random.choice(section_names)[:200]  # Limit to 200 chars
        
        # Random properties
        status = random.choice(SECTION_STATUSES)
        length = round(random.uniform(2.0, 25.0), 1)
        max_speed = random.randint(60, 180)
        max_capacity = random.randint(1, 8)
        
        # Current timestamp
        now = datetime.now().isoformat()
        
        sections_data.append((
            code, name, section_type, status, length, max_speed, max_capacity, now
        ))
    
    # Insert all sections
    cursor.executemany("""
        INSERT INTO sections (section_code, name, section_type, status, length_km, max_speed_kmh, max_capacity, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, sections_data)
    
    print(f"✅ Generated {len(sections_data)} sections")
    return len(sections_data)

def generate_trains(cursor, count=75, max_section_id=35):
    """Generate realistic trains"""
    print(f"🚂 Generating {count} trains...")
    
    used_numbers = set()
    trains_data = []
    
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
        train_type = random.choice(TRAIN_TYPES)
        
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
        name = random.choice(train_names)[:200]  # Limit to 200 chars
        
        # Random properties
        status = random.choice(TRAIN_STATUSES)
        max_speed = random.randint(80, 200)
        current_speed = 0 if status in ["STOPPED", "MAINTENANCE"] else random.randint(40, int(max_speed * 0.9))
        current_section = random.randint(1, max_section_id)
        delay = round(random.uniform(-5.0, 45.0), 1) if status == "DELAYED" else round(random.uniform(-2.0, 5.0), 1)
        
        # Current timestamp
        now = datetime.now().isoformat()
        
        trains_data.append((
            number, name, train_type, status, max_speed, current_speed, current_section, delay, now
        ))
    
    # Insert all trains
    cursor.executemany("""
        INSERT INTO trains (train_number, name, train_type, status, max_speed_kmh, current_speed, current_section, delay_minutes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, trains_data)
    
    print(f"✅ Generated {len(trains_data)} trains")
    return len(trains_data)

def print_summary(cursor):
    """Print summary of generated data"""
    print("\n📊 Data Generation Summary:")
    print("=" * 50)
    
    # Count records
    cursor.execute("SELECT COUNT(*) FROM trains")
    train_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM sections")
    section_count = cursor.fetchone()[0]
    
    print(f"🚂 Total Trains: {train_count}")
    print(f"🚉 Total Sections: {section_count}")
    
    # Train status breakdown
    print("\n🚂 Train Status Breakdown:")
    for status in TRAIN_STATUSES:
        cursor.execute("SELECT COUNT(*) FROM trains WHERE status = ?", (status,))
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"   {status}: {count}")
    
    # Train type breakdown
    print("\n🚂 Train Type Breakdown:")
    for train_type in TRAIN_TYPES:
        cursor.execute("SELECT COUNT(*) FROM trains WHERE train_type = ?", (train_type,))
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"   {train_type}: {count}")
    
    # Section status breakdown
    print("\n🚉 Section Status Breakdown:")
    for status in SECTION_STATUSES:
        cursor.execute("SELECT COUNT(*) FROM sections WHERE status = ?", (status,))
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"   {status}: {count}")

def main():
    """Main data generation function"""
    print("🚀 Starting TrackWise Synthetic Data Generation")
    print("=" * 60)
    
    try:
        # Connect to the database
        conn = sqlite3.connect('railway_optimization.db')
        cursor = conn.cursor()
        
        # Clear existing data
        clear_existing_data(cursor)
        
        # Generate sections first (trains reference sections)
        max_section_id = generate_sections(cursor, count=35)
        
        # Generate trains
        generate_trains(cursor, count=75, max_section_id=max_section_id)
        
        # Commit all changes
        conn.commit()
        
        # Print summary
        print_summary(cursor)
        
        print("\n✅ Synthetic data generation completed successfully!")
        print("🚂 Your TrackWise application should now show populated data")
        
        return True
        
    except Exception as e:
        print(f"❌ Error generating synthetic data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)