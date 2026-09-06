import re
from typing import Optional, Tuple

EMAIL_REGEX = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b',
    re.IGNORECASE
)

# Common recruiter/contact keywords followed by name patterns
RECRUITER_NAME_PATTERNS = [
    r'(?:recruiter|talent acquisition|contact person|hr|hiring manager|point of contact)\s*[:\-–]\s*([A-Za-z\s\.]{3,35})\b',
    r'(?:reach out to|contact)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b',
    r'(?:posted by|shared by)\s*[:\-–]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b',
]

# Phone number patterns (handles Indian mobile numbers +91, 0, or plain 10 digits with spacers)
PHONE_PATTERNS = [
    r'(?:\+91[\-\s]?)?[6789]\d{9}\b',
    r'(?:\+91[\-\s]?)?[6789]\d{4}[\-\s]?\d{5}\b',
    r'\b0\d{2,4}[\-\s]?\d{6,8}\b',
    r'\b\+?[1-9]\d{1,3}[\s\-\.]?\(?\d{2,4}\)?[\s\-\.]?\d{3,4}[\s\-\.]?\d{3,4}\b'
]

# Common non-recruiter emails to discard
DISCARD_EMAIL_DOMAINS = {
    "sentry.io", "example.com", "domain.com", "w3.org", "schema.org",
    "github.com", "gitlab.com", "google.com"
}

def extract_email(text: str) -> Optional[str]:
    """Finds the most probable recruiter/HR contact email in a text."""
    if not text:
        return None
    matches = EMAIL_REGEX.findall(text)
    for match in matches:
        match_lower = match.lower()
        domain = match_lower.split("@")[-1]
        if domain in DISCARD_EMAIL_DOMAINS:
            continue
        if any(match_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]):
            continue
        # Prioritize HR / career emails
        if any(keyword in match_lower for keyword in ["career", "hr", "job", "recruitment", "talent", "hire"]):
            return match
    # If no explicitly tagged email found, return first valid email if exists
    for match in matches:
        domain = match.lower().split("@")[-1]
        if domain not in DISCARD_EMAIL_DOMAINS and not any(match.lower().endswith(ext) for ext in [".png", ".jpg"]):
            return match
    return None

def extract_phone(text: str) -> Optional[str]:
    """Finds phone or mobile numbers in text."""
    if not text:
        return None
    for pattern in PHONE_PATTERNS:
        match = re.search(pattern, text)
        if match:
            clean_phone = match.group(0).strip()
            # Avoid matching pure year strings or large IDs
            if len(clean_phone) >= 10:
                return clean_phone
    return None

def extract_recruiter_name(text: str) -> Optional[str]:
    """Extracts recruiter name from job description."""
    if not text:
        return None
    for pattern in RECRUITER_NAME_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            # Sanity check on extracted name
            words = candidate.split()
            if 1 <= len(words) <= 3 and not any(w.lower() in ["hr", "team", "recruiter", "manager"] for w in words):
                return candidate
    return None

def extract_all_contacts(text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Convenience helper to extract email, phone, and name."""
    return extract_email(text), extract_phone(text), extract_recruiter_name(text)
