"""
Simple database setup for TrackWise
"""

import asyncio
import sqlite3
from pathlib import Path

def create_simple_database():
    """Create a simple SQLite database for development"""
    
    db_path = Path("railway_optimization.db")
    
    # Remove existing database
    if db_path.exists():
        db_path.unlink()
    
    # Create new database
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Create basic tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_number VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(200),
            train_type VARCHAR(50) DEFAULT 'PASSENGER',
            status VARCHAR(50) DEFAULT 'STOPPED',
            max_speed_kmh REAL DEFAULT 80.0,
            current_speed REAL DEFAULT 0.0,
            current_section INTEGER DEFAULT 1,
            delay_minutes REAL DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(200),
            section_type VARCHAR(50) DEFAULT 'MAIN_LINE',
            status VARCHAR(50) DEFAULT 'AVAILABLE',
            length_km REAL DEFAULT 10.0,
            max_speed_kmh REAL DEFAULT 80.0,
            max_capacity INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            full_name VARCHAR(200),
            hashed_password VARCHAR(200),
            is_active BOOLEAN DEFAULT 1,
            is_superuser BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Insert sample data
    cursor.execute("""
        INSERT OR REPLACE INTO trains (train_number, name, train_type, status, max_speed_kmh, current_speed, current_section)
        VALUES 
            ('TW001', 'Central Express', 'PASSENGER', 'RUNNING', 120.0, 85.0, 1),
            ('TW002', 'Northern Commuter', 'PASSENGER', 'STOPPED', 100.0, 0.0, 2),
            ('TW003', 'Freight Hauler', 'FREIGHT', 'RUNNING', 80.0, 60.0, 3),
            ('TW004', 'City Shuttle', 'PASSENGER', 'RUNNING', 90.0, 70.0, 1),
            ('TW005', 'Cargo Express', 'FREIGHT', 'STOPPED', 70.0, 0.0, 4)
    """)
    
    cursor.execute("""
        INSERT OR REPLACE INTO sections (section_code, name, section_type, status, length_km, max_speed_kmh, max_capacity)
        VALUES 
            ('SEC-001', 'Central Terminal', 'STATION', 'AVAILABLE', 5.0, 60.0, 3),
            ('SEC-002', 'Main Line North', 'MAIN_LINE', 'AVAILABLE', 15.0, 120.0, 2),
            ('SEC-003', 'Junction Alpha', 'JUNCTION', 'AVAILABLE', 8.0, 80.0, 2),
            ('SEC-004', 'Freight Yard', 'YARD', 'AVAILABLE', 12.0, 50.0, 4),
            ('SEC-005', 'Branch Line East', 'BRANCH_LINE', 'AVAILABLE', 20.0, 100.0, 1)
    """)
    
    cursor.execute("""
        INSERT OR REPLACE INTO users (username, email, full_name, hashed_password, is_superuser)
        VALUES ('admin', 'admin@trackwise.com', 'System Administrator', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewaMrQFgBQ7xV5Dy', 1)
    """)
    
    conn.commit()
    conn.close()
    
    print(f"✅ Database created at {db_path.absolute()}")
    return str(db_path.absolute())

if __name__ == "__main__":
    create_simple_database()