import random
import csv
from datetime import datetime, timedelta
import os

# Coach configuration by type
COACH_CONFIG = {
    'AC1': {'seats': 18, 'base_fare': 4.0},
    'AC2': {'seats': 46, 'base_fare': 2.5},
    'AC3': {'seats': 64, 'base_fare': 1.8},
    'Sleeper': {'seats': 72, 'base_fare': 0.8},
    'General': {'seats': 90, 'base_fare': 0.4}
}

# Coach distribution by train category
COACH_DISTRIBUTION = {
    'SuperFast': {
        'AC1': (1, 2),      # (min, max) coaches
        'AC2': (2, 4),
        'AC3': (3, 5),
        'Sleeper': (5, 8),
        'General': (2, 4)
    },
    'Express': {
        'AC1': (0, 1),
        'AC2': (1, 3),
        'AC3': (2, 4),
        'Sleeper': (6, 10),
        'General': (3, 6)
    },
    'Passenger': {
        'AC1': (0, 0),
        'AC2': (0, 1),
        'AC3': (1, 2),
        'Sleeper': (2, 4),
        'General': (6, 10)
    }
}

def generate_coach_id(train_number, coach_type, index):
    """Generate a unique coach ID based on train number, coach type and index"""
    type_prefix = {
        'AC1': 'H',
        'AC2': 'A',
        'AC3': 'B',
        'Sleeper': 'S',
        'General': 'G'
    }
    return f"{type_prefix[coach_type]}{train_number % 100:02d}{index:02d}"

def generate_commission_date():
    """Generate a random commission date within the last 15 years"""
    today = datetime.now()
    days_back = random.randint(365, 15*365)  # Between 1 and 15 years ago
    commission_date = today - timedelta(days=days_back)
    return commission_date.strftime('%Y-%m-%d')

def generate_retirement_date(commission_date_str):
    """Generate a retirement date exactly 15 years after commission date"""
    commission_date = datetime.strptime(commission_date_str, '%Y-%m-%d')
    
    # Fixed 15-year service life
    retirement_date = commission_date + timedelta(days=15*365)
    
    return retirement_date.strftime('%Y-%m-%d')

def generate_coaches():
    # Ensure the directory exists
    os.makedirs('initialise/data', exist_ok=True)
    
    # Read train data
    trains = []
    with open('initialise/data/trains.csv', 'r') as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        for row in reader:
            trains.append({
                'train_number': int(row[0]),
                'train_name': row[1],
                'category': row[2],
                'fare_multiplier': float(row[3])
            })
    
    # Generate coaches
    coaches = []
    for train in trains:
        train_number = train['train_number']
        category = train['category']
        
        # Determine total coaches for this train
        coach_counts = {}
        
        for coach_type, count_range in COACH_DISTRIBUTION[category].items():
            min_count, max_count = count_range
            count = random.randint(min_count, max_count)
            coach_counts[coach_type] = count
        
        # Generate each coach
        for coach_type, count in coach_counts.items():
            for i in range(1, count + 1):
                coach_id = generate_coach_id(train_number, coach_type, i)
                commission_date = generate_commission_date()
                retirement_date = generate_retirement_date(commission_date)
                
                coaches.append({
                    'coach_id': coach_id,
                    'train_number': train_number,
                    'coach_category': coach_type,
                    'total_seats': COACH_CONFIG[coach_type]['seats'],
                    'base_fare_per_km': COACH_CONFIG[coach_type]['base_fare'],
                    'commission_date': commission_date,
                    'retirement_date': retirement_date
                })
    
    # Write coaches to CSV
    with open('initialise/data/coaches.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['coach_id', 'train_number', 'coach_category', 'total_seats', 
                         'base_fare_per_km', 'commission_date', 'retirement_date'])
        for coach in coaches:
            writer.writerow([
                coach['coach_id'],
                coach['train_number'],
                coach['coach_category'],
                coach['total_seats'],
                coach['base_fare_per_km'],
                coach['commission_date'],
                coach['retirement_date']
            ])
    
    # Calculate coach counts for reporting only
    train_coach_counts = {}
    for coach in coaches:
        train_number = coach['train_number']
        if train_number not in train_coach_counts:
            train_coach_counts[train_number] = 0
        train_coach_counts[train_number] += 1
    
    total_coaches = sum(train_coach_counts.values())
    
    print(f"Generated {total_coaches} coaches for {len(trains)} trains")
    print(f"File saved to initialise/data/coaches.csv")
    print("Note: Train total_coaches will be updated by the database procedure")

if __name__ == "__main__":
    generate_coaches()
