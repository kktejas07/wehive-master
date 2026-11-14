"""Error alerts: push ERROR-level log lines to a chat webhook.

Logs go to stdout as JSON, which nobody watches. When `ALERT_WEBHOOK_URL` is set
(a Slack, Discord, Teams or any `{"text": ...}` incoming webhook), every ERROR
or CRITICAL record is also posted there, so an unhandled exception, a failed
payment email or a client crash report reaches a person.

- Repeats of the same log call are held back for `ALERT_COOLDOWN_SECONDS`
  (default 600) and reported as a count on the next alert, so an outage is one
  message, not a flood.
- Sending happens on a daemon thread and never raises: alerting must not slow
  down or break the request that logged the error.
- With no URL configured this module does nothing.
"""
import json
import logging
import os
import threading
import time
import urllib.request
from typing import Callable, Optional

_log = logging.getLogger('wehive.alerting')
_MAX_KEYS = 500  # distinct log call sites remembered for de-duplication


def _post(url: str, text: str) -> None:
    key = 'content' if 'discord' in url else 'text'  # Discord names the field differently
    req = urllib.request.Request(
        url, data=json.dumps({key: text}).encode(), headers={'Content-Type': 'application/json'}, method='POST',
    )
    urllib.request.urlopen(req, timeout=5).close()  # noqa: S310 (URL comes from our own env, https only)


class WebhookAlertHandler(logging.Handler):
    def __init__(self, url: str, cooldown: float = 600, send: Optional[Callable[[str, str], None]] = None,
                 clock: Callable[[], float] = time.monotonic, env: str = ''):
        super().__init__(level=logging.ERROR)
        self.url = url
        self.cooldown = cooldown
        self._send = send or _post
        self._clock = clock
        self._env = env
        self._lock = threading.Lock()
        self._last: dict = {}  # (logger, message template) -> [last alert time, repeats held back since]

    def emit(self, record: logging.LogRecord) -> None:
        if record.name.startswith('wehive.alerting'):
            return  # never alert about a failed alert
        try:
            key = (record.name, str(record.msg))
            now = self._clock()
            with self._lock:
                entry = self._last.get(key)
                if entry and now - entry[0] < self.cooldown:
                    entry[1] += 1
                    return
                held_back = entry[1] if entry else 0
                if len(self._last) >= _MAX_KEYS:
                    self._last.clear()
                self._last[key] = [now, 0]
            text = self.format_alert(record, held_back)
            threading.Thread(target=self._deliver, args=(text,), daemon=True).start()
        except Exception:  # a logging handler must never raise into the code that logged
            self.handleError(record)

    def format_alert(self, record: logging.LogRecord, held_back: int = 0) -> str:
        from request_context import request_id_var
        parts = [f'[{self._env}]' if self._env else '', record.levelname, f'{record.name}:', record.getMessage()[:600]]
        request_id = getattr(record, 'request_id', None) or request_id_var.get()
        if request_id:
            parts.append(f'(request {request_id})')
        if held_back:
            parts.append(f'(+{held_back} more of the same since the last alert)')
        return ' '.join(p for p in parts if p)

    def _deliver(self, text: str) -> None:
        try:
            self._send(self.url, text)
        except Exception as exc:
            _log.warning('could not deliver alert: %s', exc)


def install_alerting(root: logging.Logger) -> Optional[WebhookAlertHandler]:
    """Attach the webhook handler if ALERT_WEBHOOK_URL is a usable https URL."""
    url = os.environ.get('ALERT_WEBHOOK_URL', '').strip()
    if not url:
        return None
    if not url.startswith('https://'):
        _log.warning('ALERT_WEBHOOK_URL ignored: it must start with https://')
        return None
    handler = WebhookAlertHandler(
        url, cooldown=float(os.environ.get('ALERT_COOLDOWN_SECONDS', '600')), env=os.environ.get('APP_ENV', ''),
    )
    root.addHandler(handler)
    return handler
