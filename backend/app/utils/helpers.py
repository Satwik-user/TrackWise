"""
Helper utility functions for TrackWise Railway Optimization System
"""

import re
import hashlib
import secrets
import string
import json
import csv
import io
import base64
from typing import Any, Dict, List, Optional, Union, Tuple
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import asyncio
import logging
from functools import wraps
import time
import uuid

logger = logging.getLogger(__name__)


def generate_random_string(length: int = 12, include_symbols: bool = False) -> str:
    """Generate a random string of specified length"""
    characters = string.ascii_letters + string.digits
    if include_symbols:
        characters += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    return ''.join(secrets.choice(characters) for _ in range(length))


def generate_uuid() -> str:
    """Generate a UUID4 string"""
    return str(uuid.uuid4())


def generate_short_id(length: int = 8) -> str:
    """Generate a short alphanumeric ID"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


def hash_string(text: str, algorithm: str = "sha256") -> str:
    """Hash a string using specified algorithm"""
    
    algorithms = {
        "md5": hashlib.md5,
        "sha1": hashlib.sha1,
        "sha256": hashlib.sha256,
        "sha512": hashlib.sha512
    }
    
    if algorithm not in algorithms:
        raise ValueError(f"Unsupported algorithm: {algorithm}")
    
    hash_obj = algorithms[algorithm]()
    hash_obj.update(text.encode('utf-8'))
    return hash_obj.hexdigest()


def validate_email(email: str) -> bool:
    """Validate email address format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone_number(phone: str, country_code: str = "US") -> bool:
    """Validate phone number format"""
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    
    # Basic validation for US numbers
    if country_code == "US":
        return len(digits_only) == 10 or (len(digits_only) == 11 and digits_only.startswith('1'))
    
    # International format (basic check)
    return 7 <= len(digits_only) <= 15


def sanitize_string(text: str, max_length: Optional[int] = None) -> str:
    """Sanitize string input"""
    if not isinstance(text, str):
        text = str(text)
    
    # Remove control characters and normalize whitespace
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    text = ' '.join(text.split())
    
    # Truncate if max_length specified
    if max_length and len(text) > max_length:
        text = text[:max_length].rstrip()
    
    return text


def format_currency(amount: Union[int, float, Decimal], currency: str = "USD") -> str:
    """Format currency amount"""
    
    currency_symbols = {
        "USD": "$",
        "EUR": "€", 
        "GBP": "£",
        "JPY": "¥",
        "INR": "₹"
    }
    
    symbol = currency_symbols.get(currency, currency)
    
    if currency == "JPY":
        # No decimal places for JPY
        return f"{symbol}{amount:,.0f}"
    else:
        return f"{symbol}{amount:,.2f}"


def format_duration(seconds: Union[int, float]) -> str:
    """Format duration in seconds to human-readable string"""
    
    if seconds < 60:
        return f"{seconds:.1f} seconds"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f} minutes"
    elif seconds < 86400:
        hours = seconds / 3600
        return f"{hours:.1f} hours"
    else:
        days = seconds / 86400
        return f"{days:.1f} days"


def format_file_size(size_bytes: int) -> str:
    """Format file size in bytes to human-readable string"""
    
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB", "PB"]
    i = 0
    
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"


def parse_datetime(date_string: str, format_string: Optional[str] = None) -> Optional[datetime]:
    """Parse datetime string with multiple format attempts"""
    
    formats = [
        format_string,
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%m-%d-%Y",
        "%d-%m-%Y"
    ]
    
    # Remove None from formats list
    formats = [f for f in formats if f is not None]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue
    
    return None


def format_datetime(dt: datetime, format_string: str = "%Y-%m-%d %H:%M:%S", timezone_str: Optional[str] = None) -> str:
    """Format datetime with optional timezone conversion"""
    
    if timezone_str:
        try:
            import pytz
            tz = pytz.timezone(timezone_str)
            if dt.tzinfo is None:
                dt = pytz.utc.localize(dt)
            dt = dt.astimezone(tz)
        except:
            # If timezone conversion fails, use original datetime
            pass
    
    return dt.strftime(format_string)


def get_utc_now() -> datetime:
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)


def to_utc(dt: datetime) -> datetime:
    """Convert datetime to UTC"""
    if dt.tzinfo is None:
        # Assume it's already UTC if no timezone info
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def calculate_age(birth_date: datetime) -> int:
    """Calculate age from birth date"""
    today = datetime.now().date()
    if isinstance(birth_date, datetime):
        birth_date = birth_date.date()
    
    age = today.year - birth_date.year
    
    # Adjust if birthday hasn't occurred this year
    if today < birth_date.replace(year=today.year):
        age -= 1
    
    return age


def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """Split list into chunks of specified size"""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def flatten_dict(d: Dict[str, Any], parent_key: str = '', sep: str = '.') -> Dict[str, Any]:
    """Flatten nested dictionary"""
    items = []
    
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    
    return dict(items)


def unflatten_dict(d: Dict[str, Any], sep: str = '.') -> Dict[str, Any]:
    """Unflatten dictionary with separator"""
    result = {}
    
    for key, value in d.items():
        keys = key.split(sep)
        current = result
        
        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]
        
        current[keys[-1]] = value
    
    return result


def merge_dicts(*dicts: Dict[str, Any]) -> Dict[str, Any]:
    """Merge multiple dictionaries"""
    result = {}
    
    for d in dicts:
        if isinstance(d, dict):
            result.update(d)
    
    return result


def deep_merge_dicts(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """Deep merge two dictionaries"""
    result = dict1.copy()
    
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge_dicts(result[key], value)
        else:
            result[key] = value
    
    return result


def safe_get(d: Dict[str, Any], path: str, default: Any = None, sep: str = '.') -> Any:
    """Safely get nested dictionary value using dot notation"""
    keys = path.split(sep)
    current = d
    
    try:
        for key in keys:
            current = current[key]
        return current
    except (KeyError, TypeError):
        return default


def safe_set(d: Dict[str, Any], path: str, value: Any, sep: str = '.') -> None:
    """Safely set nested dictionary value using dot notation"""
    keys = path.split(sep)
    current = d
    
    for key in keys[:-1]:
        if key not in current or not isinstance(current[key], dict):
            current[key] = {}
        current = current[key]
    
    current[keys[-1]] = value


def remove_none_values(d: Dict[str, Any], recursive: bool = True) -> Dict[str, Any]:
    """Remove None values from dictionary"""
    cleaned = {}
    
    for key, value in d.items():
        if value is None:
            continue
        elif recursive and isinstance(value, dict):
            cleaned_nested = remove_none_values(value, recursive)
            if cleaned_nested:  # Only add if not empty
                cleaned[key] = cleaned_nested
        elif recursive and isinstance(value, list):
            cleaned_list = [
                remove_none_values(item, recursive) if isinstance(item, dict) else item
                for item in value if item is not None
            ]
            if cleaned_list:  # Only add if not empty
                cleaned[key] = cleaned_list
        else:
            cleaned[key] = value
    
    return cleaned


def convert_to_snake_case(text: str) -> str:
    """Convert CamelCase or PascalCase to snake_case"""
    # Handle special cases like HTTPSConnection -> https_connection
    text = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', text)
    text = re.sub('([a-z0-9])([A-Z])', r'\1_\2', text)
    return text.lower()


def convert_to_camel_case(text: str) -> str:
    """Convert snake_case to camelCase"""
    components = text.split('_')
    return components[0] + ''.join(word.capitalize() for word in components[1:])


def convert_to_pascal_case(text: str) -> str:
    """Convert snake_case to PascalCase"""
    return ''.join(word.capitalize() for word in text.split('_'))


def slugify(text: str, max_length: int = 50) -> str:
    """Convert text to URL-friendly slug"""
    # Convert to lowercase and replace spaces/special chars with hyphens
    slug = re.sub(r'[^\w\s-]', '', text.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    slug = slug.strip('-')
    
    if max_length and len(slug) > max_length:
        slug = slug[:max_length].rstrip('-')
    
    return slug


def parse_csv_string(csv_string: str, delimiter: str = ',') -> List[Dict[str, str]]:
    """Parse CSV string to list of dictionaries"""
    csv_file = io.StringIO(csv_string)
    reader = csv.DictReader(csv_file, delimiter=delimiter)
    return list(reader)


def dict_to_csv_string(data: List[Dict[str, Any]], delimiter: str = ',') -> str:
    """Convert list of dictionaries to CSV string"""
    if not data:
        return ""
    
    output = io.StringIO()
    fieldnames = data[0].keys()
    writer = csv.DictWriter(output, fieldnames=fieldnames, delimiter=delimiter)
    
    writer.writeheader()
    for row in data:
        writer.writerow(row)
    
    return output.getvalue()


def encode_base64(data: Union[str, bytes]) -> str:
    """Encode data to base64 string"""
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    return base64.b64encode(data).decode('utf-8')


def decode_base64(encoded_data: str) -> bytes:
    """Decode base64 string to bytes"""
    return base64.b64decode(encoded_data)


def is_valid_json(json_string: str) -> bool:
    """Check if string is valid JSON"""
    try:
        json.loads(json_string)
        return True
    except (json.JSONDecodeError, TypeError):
        return False


def safe_json_loads(json_string: str, default: Any = None) -> Any:
    """Safely parse JSON string with default fallback"""
    try:
        return json.loads(json_string)
    except (json.JSONDecodeError, TypeError):
        return default


def retry_on_exception(max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """Decorator to retry function on exception"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}. Retrying in {current_delay}s...")
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(f"All {max_retries + 1} attempts failed for {func.__name__}")
            
            raise last_exception
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}. Retrying in {current_delay}s...")
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(f"All {max_retries + 1} attempts failed for {func.__name__}")
            
            raise last_exception
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator


def timing_decorator(func):
    """Decorator to measure function execution time"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.info(f"{func.__name__} executed in {execution_time:.3f} seconds")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"{func.__name__} failed after {execution_time:.3f} seconds: {e}")
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.info(f"{func.__name__} executed in {execution_time:.3f} seconds")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"{func.__name__} failed after {execution_time:.3f} seconds: {e}")
            raise
    
    return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper


def rate_limit(max_calls: int, time_window: int):
    """Decorator to rate limit function calls"""
    call_times = []
    
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            nonlocal call_times
            current_time = time.time()
            
            # Remove old calls outside the time window
            call_times = [t for t in call_times if current_time - t < time_window]
            
            if len(call_times) >= max_calls:
                sleep_time = time_window - (current_time - call_times[0])
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    # Update current_time after sleep
                    current_time = time.time()
                    call_times = [t for t in call_times if current_time - t < time_window]
            
            call_times.append(current_time)
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            nonlocal call_times
            current_time = time.time()
            
            # Remove old calls outside the time window
            call_times = [t for t in call_times if current_time - t < time_window]
            
            if len(call_times) >= max_calls:
                sleep_time = time_window - (current_time - call_times[0])
                if sleep_time > 0:
                    time.sleep(sleep_time)
                    # Update current_time after sleep
                    current_time = time.time()
                    call_times = [t for t in call_times if current_time - t < time_window]
            
            call_times.append(current_time)
            return func(*args, **kwargs)
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates using Haversine formula (in kilometers)"""
    import math
    
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth's radius in kilometers
    earth_radius = 6371.0
    
    return earth_radius * c


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """Validate latitude and longitude coordinates"""
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


def normalize_text(text: str) -> str:
    """Normalize text for search and comparison"""
    import unicodedata
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove accents and normalize unicode
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text


def calculate_percentage_change(old_value: float, new_value: float) -> float:
    """Calculate percentage change between two values"""
    if old_value == 0:
        return float('inf') if new_value > 0 else float('-inf') if new_value < 0 else 0
    
    return ((new_value - old_value) / old_value) * 100


def round_to_nearest(value: float, nearest: float = 0.01) -> float:
    """Round value to nearest specified increment"""
    return round(value / nearest) * nearest


def clamp(value: float, min_value: float, max_value: float) -> float:
    """Clamp value between min and max"""
    return max(min_value, min(value, max_value))


def is_business_day(date: datetime) -> bool:
    """Check if date is a business day (Monday-Friday)"""
    return date.weekday() < 5


def get_next_business_day(date: datetime) -> datetime:
    """Get next business day from given date"""
    next_day = date + timedelta(days=1)
    while not is_business_day(next_day):
        next_day += timedelta(days=1)
    return next_day


def get_business_days_between(start_date: datetime, end_date: datetime) -> int:
    """Count business days between two dates"""
    business_days = 0
    current_date = start_date
    
    while current_date <= end_date:
        if is_business_day(current_date):
            business_days += 1
        current_date += timedelta(days=1)
    
    return business_days


class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open
    
    def call(self, func, *args, **kwargs):
        """Call function with circuit breaker protection"""
        if self.state == "open":
            if time.time() - self.last_failure_time < self.recovery_timeout:
                raise Exception("Circuit breaker is open")
            else:
                self.state = "half-open"
        
        try:
            result = func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise
    
    def on_success(self):
        """Handle successful call"""
        self.failure_count = 0
        self.state = "closed"
    
    def on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"


# Export all utility functions
__all__ = [
    "generate_random_string",
    "generate_uuid",
    "generate_short_id",
    "hash_string",
    "validate_email",
    "validate_phone_number",
    "sanitize_string",
    "format_currency",
    "format_duration",
    "format_file_size",
    "parse_datetime",
    "format_datetime",
    "get_utc_now",
    "to_utc",
    "calculate_age",
    "chunk_list",
    "flatten_dict",
    "unflatten_dict",
    "merge_dicts",
    "deep_merge_dicts",
    "safe_get",
    "safe_set",
    "remove_none_values",
    "convert_to_snake_case",
    "convert_to_camel_case",
    "convert_to_pascal_case",
    "slugify",
    "parse_csv_string",
    "dict_to_csv_string",
    "encode_base64",
    "decode_base64",
    "is_valid_json",
    "safe_json_loads",
    "retry_on_exception",
    "timing_decorator",
    "rate_limit",
    "calculate_distance",
    "validate_coordinates",
    "normalize_text",
    "calculate_percentage_change",
    "round_to_nearest",
    "clamp",
    "is_business_day",
    "get_next_business_day",
    "get_business_days_between",
    "CircuitBreaker"
]