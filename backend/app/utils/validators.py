"""
Validation utilities for TrackWise Railway Optimization System
"""

import re
import ipaddress
from typing import Any, Dict, List, Optional, Union, Callable
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
import phonenumbers
from email_validator import validate_email as email_validate, EmailNotValidError
import logging

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Custom validation error"""
    
    def __init__(self, message: str, field: Optional[str] = None, code: Optional[str] = None):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(message)


class ValidationResult:
    """Validation result container"""
    
    def __init__(self, is_valid: bool = True, errors: Optional[List[Dict[str, str]]] = None):
        self.is_valid = is_valid
        self.errors = errors or []
    
    def add_error(self, field: str, message: str, code: Optional[str] = None):
        """Add validation error"""
        self.is_valid = False
        self.errors.append({
            "field": field,
            "message": message,
            "code": code
        })
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "is_valid": self.is_valid,
            "errors": self.errors
        }


class Validator:
    """Base validator class"""
    
    def __init__(self, required: bool = True, allow_none: bool = False):
        self.required = required
        self.allow_none = allow_none
    
    def validate(self, value: Any, field_name: str = "field") -> ValidationResult:
        """Validate value"""
        result = ValidationResult()
        
        # Check if value is None
        if value is None:
            if self.required and not self.allow_none:
                result.add_error(field_name, "This field is required", "required")
            return result
        
        # Perform specific validation
        return self._validate_value(value, field_name)
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        """Override this method in subclasses"""
        return ValidationResult()


class StringValidator(Validator):
    """String validation"""
    
    def __init__(
        self,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
        pattern: Optional[str] = None,
        allowed_values: Optional[List[str]] = None,
        strip_whitespace: bool = True,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.min_length = min_length
        self.max_length = max_length
        self.pattern = re.compile(pattern) if pattern else None
        self.allowed_values = allowed_values
        self.strip_whitespace = strip_whitespace
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        # Convert to string if needed
        if not isinstance(value, str):
            value = str(value)
        
        # Strip whitespace if requested
        if self.strip_whitespace:
            value = value.strip()
        
        # Check minimum length
        if self.min_length is not None and len(value) < self.min_length:
            result.add_error(
                field_name,
                f"Minimum length is {self.min_length} characters",
                "min_length"
            )
        
        # Check maximum length
        if self.max_length is not None and len(value) > self.max_length:
            result.add_error(
                field_name,
                f"Maximum length is {self.max_length} characters",
                "max_length"
            )
        
        # Check pattern
        if self.pattern and not self.pattern.match(value):
            result.add_error(
                field_name,
                "Invalid format",
                "pattern"
            )
        
        # Check allowed values
        if self.allowed_values and value not in self.allowed_values:
            result.add_error(
                field_name,
                f"Value must be one of: {', '.join(self.allowed_values)}",
                "allowed_values"
            )
        
        return result


class EmailValidator(Validator):
    """Email validation"""
    
    def __init__(self, check_deliverability: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.check_deliverability = check_deliverability
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        if not isinstance(value, str):
            result.add_error(field_name, "Email must be a string", "type")
            return result
        
        try:
            validated_email = email_validate(
                value,
                check_deliverability=self.check_deliverability
            )
            # Return normalized email
            value = validated_email.email
        except EmailNotValidError as e:
            result.add_error(field_name, str(e), "invalid_email")
        
        return result


class PhoneValidator(Validator):
    """Phone number validation"""
    
    def __init__(self, region: str = "US", **kwargs):
        super().__init__(**kwargs)
        self.region = region
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        if not isinstance(value, str):
            result.add_error(field_name, "Phone number must be a string", "type")
            return result
        
        try:
            parsed_number = phonenumbers.parse(value, self.region)
            if not phonenumbers.is_valid_number(parsed_number):
                result.add_error(field_name, "Invalid phone number", "invalid_phone")
        except phonenumbers.NumberParseException as e:
            result.add_error(field_name, f"Phone number parse error: {e}", "parse_error")
        
        return result


class NumberValidator(Validator):
    """Numeric validation"""
    
    def __init__(
        self,
        min_value: Optional[Union[int, float]] = None,
        max_value: Optional[Union[int, float]] = None,
        allow_float: bool = True,
        decimal_places: Optional[int] = None,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.min_value = min_value
        self.max_value = max_value
        self.allow_float = allow_float
        self.decimal_places = decimal_places
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        # Try to convert to number
        try:
            if isinstance(value, str):
                if self.allow_float:
                    value = float(value)
                else:
                    value = int(value)
            elif not isinstance(value, (int, float)):
                raise ValueError("Not a number")
        except (ValueError, TypeError):
            result.add_error(field_name, "Must be a valid number", "type")
            return result
        
        # Check if float is allowed
        if not self.allow_float and isinstance(value, float) and not value.is_integer():
            result.add_error(field_name, "Decimal numbers not allowed", "no_decimal")
            return result
        
        # Check minimum value
        if self.min_value is not None and value < self.min_value:
            result.add_error(
                field_name,
                f"Minimum value is {self.min_value}",
                "min_value"
            )
        
        # Check maximum value
        if self.max_value is not None and value > self.max_value:
            result.add_error(
                field_name,
                f"Maximum value is {self.max_value}",
                "max_value"
            )
        
        # Check decimal places
        if self.decimal_places is not None and isinstance(value, float):
            decimal_str = str(value)
            if '.' in decimal_str:
                actual_decimal_places = len(decimal_str.split('.')[1])
                if actual_decimal_places > self.decimal_places:
                    result.add_error(
                        field_name,
                        f"Maximum {self.decimal_places} decimal places allowed",
                        "decimal_places"
                    )
        
        return result


class DateValidator(Validator):
    """Date validation"""
    
    def __init__(
        self,
        min_date: Optional[date] = None,
        max_date: Optional[date] = None,
        date_format: Optional[str] = None,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.min_date = min_date
        self.max_date = max_date
        self.date_format = date_format or "%Y-%m-%d"
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        # Convert string to date if needed
        if isinstance(value, str):
            try:
                value = datetime.strptime(value, self.date_format).date()
            except ValueError:
                result.add_error(
                    field_name,
                    f"Invalid date format. Expected: {self.date_format}",
                    "format"
                )
                return result
        elif isinstance(value, datetime):
            value = value.date()
        elif not isinstance(value, date):
            result.add_error(field_name, "Must be a valid date", "type")
            return result
        
        # Check minimum date
        if self.min_date and value < self.min_date:
            result.add_error(
                field_name,
                f"Date must be after {self.min_date}",
                "min_date"
            )
        
        # Check maximum date
        if self.max_date and value > self.max_date:
            result.add_error(
                field_name,
                f"Date must be before {self.max_date}",
                "max_date"
            )
        
        return result


class DateTimeValidator(Validator):
    """DateTime validation"""
    
    def __init__(
        self,
        min_datetime: Optional[datetime] = None,
        max_datetime: Optional[datetime] = None,
        datetime_format: Optional[str] = None,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.min_datetime = min_datetime
        self.max_datetime = max_datetime
        self.datetime_format = datetime_format or "%Y-%m-%d %H:%M:%S"
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        # Convert string to datetime if needed
        if isinstance(value, str):
            try:
                value = datetime.strptime(value, self.datetime_format)
            except ValueError:
                result.add_error(
                    field_name,
                    f"Invalid datetime format. Expected: {self.datetime_format}",
                    "format"
                )
                return result
        elif not isinstance(value, datetime):
            result.add_error(field_name, "Must be a valid datetime", "type")
            return result
        
        # Check minimum datetime
        if self.min_datetime and value < self.min_datetime:
            result.add_error(
                field_name,
                f"DateTime must be after {self.min_datetime}",
                "min_datetime"
            )
        
        # Check maximum datetime
        if self.max_datetime and value > self.max_datetime:
            result.add_error(
                field_name,
                f"DateTime must be before {self.max_datetime}",
                "max_datetime"
            )
        
        return result


class URLValidator(Validator):
    """URL validation"""
    
    def __init__(self, allowed_schemes: Optional[List[str]] = None, **kwargs):
        super().__init__(**kwargs)
        self.allowed_schemes = allowed_schemes or ['http', 'https']
        self.url_pattern = re.compile(
            r'^(?:(?P<scheme>[a-z][a-z0-9+.-]*):\/\/)?'  # scheme
            r'(?:(?P<user>[^\s:@]+)(?::(?P<password>[^\s@]+))?@)?'  # user:pass
            r'(?P<host>(?:[a-z0-9.-]+|\[[a-f0-9:]+\]))'  # host
            r'(?::(?P<port>\d+))?'  # port
            r'(?P<path>\/[^\s?]*)?'  # path
            r'(?:\?(?P<query>[^\s#]*))?'  # query
            r'(?:#(?P<fragment>[^\s]*))?$',  # fragment
            re.IGNORECASE
        )
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        if not isinstance(value, str):
            result.add_error(field_name, "URL must be a string", "type")
            return result
        
        match = self.url_pattern.match(value)
        if not match:
            result.add_error(field_name, "Invalid URL format", "format")
            return result
        
        scheme = match.group('scheme')
        if scheme and scheme.lower() not in self.allowed_schemes:
            result.add_error(
                field_name,
                f"URL scheme must be one of: {', '.join(self.allowed_schemes)}",
                "scheme"
            )
        
        return result


class IPAddressValidator(Validator):
    """IP address validation"""
    
    def __init__(self, version: Optional[int] = None, **kwargs):
        super().__init__(**kwargs)
        self.version = version  # 4, 6, or None for both
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        if not isinstance(value, str):
            result.add_error(field_name, "IP address must be a string", "type")
            return result
        
        try:
            ip = ipaddress.ip_address(value)
            
            if self.version == 4 and not isinstance(ip, ipaddress.IPv4Address):
                result.add_error(field_name, "Must be a valid IPv4 address", "version")
            elif self.version == 6 and not isinstance(ip, ipaddress.IPv6Address):
                result.add_error(field_name, "Must be a valid IPv6 address", "version")
                
        except ValueError:
            result.add_error(field_name, "Invalid IP address", "format")
        
        return result


class ListValidator(Validator):
    """List validation"""
    
    def __init__(
        self,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
        item_validator: Optional[Validator] = None,
        unique_items: bool = False,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.min_length = min_length
        self.max_length = max_length
        self.item_validator = item_validator
        self.unique_items = unique_items
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        if not isinstance(value, list):
            result.add_error(field_name, "Must be a list", "type")
            return result
        
        # Check minimum length
        if self.min_length is not None and len(value) < self.min_length:
            result.add_error(
                field_name,
                f"Minimum {self.min_length} items required",
                "min_length"
            )
        
        # Check maximum length
        if self.max_length is not None and len(value) > self.max_length:
            result.add_error(
                field_name,
                f"Maximum {self.max_length} items allowed",
                "max_length"
            )
        
        # Check unique items
        if self.unique_items and len(value) != len(set(value)):
            result.add_error(field_name, "All items must be unique", "unique")
        
        # Validate each item
        if self.item_validator:
            for i, item in enumerate(value):
                item_result = self.item_validator.validate(item, f"{field_name}[{i}]")
                if not item_result.is_valid:
                    result.errors.extend(item_result.errors)
                    result.is_valid = False
        
        return result


class DictValidator(Validator):
    """Dictionary validation"""
    
    def __init__(
        self,
        required_keys: Optional[List[str]] = None,
        optional_keys: Optional[List[str]] = None,
        key_validators: Optional[Dict[str, Validator]] = None,
        allow_extra_keys: bool = True,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.required_keys = required_keys or []
        self.optional_keys = optional_keys or []
        self.key_validators = key_validators or {}
        self.allow_extra_keys = allow_extra_keys
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        if not isinstance(value, dict):
            result.add_error(field_name, "Must be a dictionary", "type")
            return result
        
        # Check required keys
        for key in self.required_keys:
            if key not in value:
                result.add_error(
                    f"{field_name}.{key}",
                    f"Required key '{key}' is missing",
                    "required_key"
                )
        
        # Check for extra keys
        if not self.allow_extra_keys:
            allowed_keys = set(self.required_keys + self.optional_keys)
            extra_keys = set(value.keys()) - allowed_keys
            if extra_keys:
                result.add_error(
                    field_name,
                    f"Extra keys not allowed: {', '.join(extra_keys)}",
                    "extra_keys"
                )
        
        # Validate individual keys
        for key, val in value.items():
            if key in self.key_validators:
                key_result = self.key_validators[key].validate(val, f"{field_name}.{key}")
                if not key_result.is_valid:
                    result.errors.extend(key_result.errors)
                    result.is_valid = False
        
        return result


class CoordinateValidator(Validator):
    """Geographic coordinate validation"""
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        if not isinstance(value, dict):
            result.add_error(field_name, "Coordinates must be a dictionary", "type")
            return result
        
        # Check required keys
        required_keys = ['latitude', 'longitude']
        for key in required_keys:
            if key not in value:
                result.add_error(
                    f"{field_name}.{key}",
                    f"Required coordinate '{key}' is missing",
                    "required"
                )
                continue
            
            coord_value = value[key]
            
            # Validate coordinate value
            try:
                coord_value = float(coord_value)
            except (ValueError, TypeError):
                result.add_error(
                    f"{field_name}.{key}",
                    f"Coordinate '{key}' must be a number",
                    "type"
                )
                continue
            
            # Validate ranges
            if key == 'latitude' and not (-90 <= coord_value <= 90):
                result.add_error(
                    f"{field_name}.{key}",
                    "Latitude must be between -90 and 90",
                    "range"
                )
            elif key == 'longitude' and not (-180 <= coord_value <= 180):
                result.add_error(
                    f"{field_name}.{key}",
                    "Longitude must be between -180 and 180",
                    "range"
                )
        
        return result


class FileValidator(Validator):
    """File validation"""
    
    def __init__(
        self,
        max_size: Optional[int] = None,
        allowed_types: Optional[List[str]] = None,
        allowed_extensions: Optional[List[str]] = None,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.max_size = max_size  # in bytes
        self.allowed_types = allowed_types or []
        self.allowed_extensions = [ext.lower() for ext in (allowed_extensions or [])]
    
    def _validate_value(self, value: Any, field_name: str) -> ValidationResult:
        result = ValidationResult()
        
        # Assume value is a file-like object or dict with file info
        if hasattr(value, 'size'):
            file_size = value.size
        elif isinstance(value, dict):
            file_size = value.get('size', 0)
        else:
            result.add_error(field_name, "Invalid file object", "type")
            return result
        
        # Check file size
        if self.max_size and file_size > self.max_size:
            max_size_mb = self.max_size / (1024 * 1024)
            result.add_error(
                field_name,
                f"File size exceeds maximum of {max_size_mb:.1f} MB",
                "max_size"
            )
        
        # Check file type
        if hasattr(value, 'content_type'):
            content_type = value.content_type
        elif isinstance(value, dict):
            content_type = value.get('content_type', '')
        else:
            content_type = ''
        
        if self.allowed_types and content_type not in self.allowed_types:
            result.add_error(
                field_name,
                f"File type '{content_type}' not allowed",
                "type"
            )
        
        # Check file extension
        if hasattr(value, 'filename'):
            filename = value.filename
        elif isinstance(value, dict):
            filename = value.get('filename', '')
        else:
            filename = ''
        
        if self.allowed_extensions and filename:
            file_ext = filename.split('.')[-1].lower() if '.' in filename else ''
            if file_ext not in self.allowed_extensions:
                result.add_error(
                    field_name,
                    f"File extension '.{file_ext}' not allowed",
                    "extension"
                )
        
        return result


def validate_train_number(train_number: str) -> ValidationResult:
    """Validate train number format"""
    result = ValidationResult()
    
    if not train_number:
        result.add_error("train_number", "Train number is required", "required")
        return result
    
    # Train number should be alphanumeric, 3-10 characters
    if not re.match(r'^[A-Z0-9]{3,10}$', train_number.upper()):
        result.add_error(
            "train_number",
            "Train number must be 3-10 alphanumeric characters",
            "format"
        )
    
    return result


def validate_section_code(section_code: str) -> ValidationResult:
    """Validate section code format"""
    result = ValidationResult()
    
    if not section_code:
        result.add_error("section_code", "Section code is required", "required")
        return result
    
    # Section code should be alphanumeric with optional hyphens, 2-15 characters
    if not re.match(r'^[A-Z0-9-]{2,15}$', section_code.upper()):
        result.add_error(
            "section_code",
            "Section code must be 2-15 alphanumeric characters (hyphens allowed)",
            "format"
        )
    
    return result


def validate_speed(speed: Union[int, float]) -> ValidationResult:
    """Validate train speed"""
    result = ValidationResult()
    
    try:
        speed = float(speed)
    except (ValueError, TypeError):
        result.add_error("speed", "Speed must be a number", "type")
        return result
    
    if speed < 0:
        result.add_error("speed", "Speed cannot be negative", "range")
    elif speed > 300:  # Max realistic train speed in km/h
        result.add_error("speed", "Speed cannot exceed 300 km/h", "range")
    
    return result


def validate_delay(delay_minutes: Union[int, float]) -> ValidationResult:
    """Validate delay in minutes"""
    result = ValidationResult()
    
    try:
        delay_minutes = float(delay_minutes)
    except (ValueError, TypeError):
        result.add_error("delay_minutes", "Delay must be a number", "type")
        return result
    
    if delay_minutes < 0:
        result.add_error("delay_minutes", "Delay cannot be negative", "range")
    elif delay_minutes > 1440:  # More than 24 hours
        result.add_error("delay_minutes", "Delay cannot exceed 24 hours", "range")
    
    return result


# Railway-specific validators
train_number_validator = StringValidator(
    min_length=3,
    max_length=10,
    pattern=r'^[A-Z0-9]+$'
)

section_code_validator = StringValidator(
    min_length=2,
    max_length=15,
    pattern=r'^[A-Z0-9-]+$'
)

speed_validator = NumberValidator(
    min_value=0,
    max_value=300,
    allow_float=True,
    decimal_places=1
)

delay_validator = NumberValidator(
    min_value=0,
    max_value=1440,
    allow_float=True,
    decimal_places=1
)

coordinate_validator = CoordinateValidator()

# Export all validators
__all__ = [
    "ValidationError",
    "ValidationResult",
    "Validator",
    "StringValidator",
    "EmailValidator",
    "PhoneValidator",
    "NumberValidator",
    "DateValidator",
    "DateTimeValidator",
    "URLValidator",
    "IPAddressValidator",
    "ListValidator",
    "DictValidator",
    "CoordinateValidator",
    "FileValidator",
    "validate_train_number",
    "validate_section_code",
    "validate_speed",
    "validate_delay",
    "train_number_validator",
    "section_code_validator",
    "speed_validator",
    "delay_validator",
    "coordinate_validator"
]