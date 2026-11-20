import logging
import re
import sys
from typing import Any

from app.core.config import settings

class SensitiveDataFilter(logging.Filter):
    """Filter that scrubs MongoDB credentials and passwords from log records."""
    PASSWORD_PATTERN = re.compile(r":([^@/:\s]+)@")
    TOKEN_PATTERN = re.compile(r"Bearer\s+([A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*)")

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.PASSWORD_PATTERN.sub(":***@", record.msg)
            record.msg = self.TOKEN_PATTERN.sub("Bearer [REDACTED]", record.msg)
        return True

def setup_logging():
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger = logging.getLogger("predictmaint")
    logger.setLevel(log_level)
    
    # Avoid duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [pm-v1] %(name)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%SZ"
        )
        handler.setFormatter(formatter)
        handler.addFilter(SensitiveDataFilter())
        logger.addHandler(handler)
        
    return logger

logger = setup_logging()
