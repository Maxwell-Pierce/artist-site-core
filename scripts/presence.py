"""Validate optional public events and artist links without affecting legacy sites."""
import re
from datetime import datetime
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo,ZoneInfoNotFoundError

def safe_url(value,email=False):
    if not isinstance(value,str) or re.search(r'[\s\x00-\x1f]',value):return False
    if email and re.fullmatch(r'mailto:[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+',value):return True
    try:
        u=urlsplit(value)
        return u.scheme=='https' and bool(u.hostname) and not u.username and not u.password
    except ValueError:return False

def instant(value):
    if not isinstance(value,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})',value):raise ValueError('Events need ISO dates with explicit timezone offsets')
    return datetime.fromisoformat(value.replace('Z','+00:00'))

def validate_presence(config):
    socials=config.get('socials')
    if socials is not None:
        if not isinstance(socials,dict) or not isinstance(socials.get('links'),list):raise ValueError('Social links must be a list')
        for link in socials['links']:
            if not link.get('platform') or not safe_url(link.get('url'),link.get('platform')=='email'):raise ValueError('Social links need a platform and safe URL')
            if link.get('platform')=='custom' and not str(link.get('label','')).strip():raise ValueError('Custom links need a label')
    calendar=config.get('calendar')
    if calendar is not None:
        if not isinstance(calendar,dict) or not isinstance(calendar.get('enabled'),bool) or not isinstance(calendar.get('events'),list):raise ValueError('Invalid calendar settings')
        try:ZoneInfo(calendar.get('timezone') or 'UTC')
        except (ZoneInfoNotFoundError,ValueError):raise ValueError('Invalid event timezone')
        if 'limit' in calendar and (not isinstance(calendar['limit'],int) or not 1<=calendar['limit']<=24):raise ValueError('Event limit must be between 1 and 24')
        seen=set()
        for event in calendar['events']:
            ident=event.get('id','')
            if not re.fullmatch(r'[a-zA-Z0-9_-]+',ident) or ident in seen:raise ValueError('Event IDs must be unique')
            seen.add(ident)
            if not str(event.get('title','')).strip():raise ValueError('Events need a title')
            start=instant(event.get('start'))
            if event.get('end') and instant(event['end'])<=start:raise ValueError('Event end must be after start')
            if event.get('url') and not safe_url(event['url']):raise ValueError('Event URLs must use HTTPS')
