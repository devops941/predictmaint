from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

class AlarmDebouncer:
    """
    Industrial alarm debouncing and cool-down manager:
    - Debounce: requires k out of last n windows to exceed threshold
    - Cooldown: minimum hours before re-triggering new alarm for same machine
    - Planned maintenance suppression: suppress alarms during scheduled shutdowns
    """
    def __init__(self, k_windows: int = 3, n_windows: int = 4, cooldown_hours: float = 6.0):
        self.k = k_windows
        self.n = n_windows
        self.cooldown_hours = cooldown_hours

    def should_trigger_alarm(
        self,
        recent_scores: List[float],
        threshold: float,
        last_alarm_time: Optional[datetime],
        current_time: datetime,
        is_in_maintenance: bool = False
    ) -> Tuple[bool, str]:
        """
        Determine if an alarm should be raised.
        Returns: (trigger, severity)
        """
        # 1. Suppress during planned maintenance
        if is_in_maintenance:
            return False, "Suppressed"

        # 2. Check cool-down
        if last_alarm_time:
            if last_alarm_time.tzinfo is None:
                last_alarm_time = last_alarm_time.replace(tzinfo=timezone.utc)
            if current_time.tzinfo is None:
                current_time = current_time.replace(tzinfo=timezone.utc)
            delta_hours = (current_time - last_alarm_time).total_seconds() / 3600.0
            if delta_hours < self.cooldown_hours:
                return False, "Cooldown"

        # 3. Check debounce (k of n)
        if len(recent_scores) < self.n:
            window_scores = recent_scores
        else:
            window_scores = recent_scores[-self.n:]

        exceed_count = sum(1 for s in window_scores if s >= threshold)
        if exceed_count < self.k:
            return False, "Normal"

        # 4. Determine severity from persistence and score
        avg_score = sum(window_scores) / len(window_scores)
        if avg_score >= 0.85:
            severity = "Critical"
        elif avg_score >= 0.65:
            severity = "Alert"
        else:
            severity = "Watch"

        return True, severity
