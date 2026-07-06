import hashlib


def mask_ip(ip: str) -> str:
    ip = ip.strip()
    if ":" in ip:
        return ip[:24] + "…" if len(ip) > 24 else ip
    parts = ip.split(".")
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.{parts[2]}.xxx"
    return ip


def hash_ip(ip: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()


def parse_user_agent(user_agent: str | None) -> tuple[str, str, str | None]:
    if not user_agent or not user_agent.strip():
        return "Other", "Other", None

    ua = user_agent.strip()
    ua_lower = ua.lower()

    browser = "Other"
    if "edg/" in ua_lower or "edge/" in ua_lower:
        browser = "Edge"
    elif "opr/" in ua_lower or "opera" in ua_lower:
        browser = "Opera"
    elif "chrome/" in ua_lower or "crios/" in ua_lower:
        browser = "Chrome"
    elif "firefox/" in ua_lower or "fxios/" in ua_lower:
        browser = "Firefox"
    elif "safari/" in ua_lower:
        browser = "Safari"

    os_family = "Other"
    if "android" in ua_lower:
        os_family = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower or "ios" in ua_lower:
        os_family = "iOS"
    elif "windows" in ua_lower:
        os_family = "Windows"
    elif "mac os" in ua_lower or "macintosh" in ua_lower:
        os_family = "macOS"
    elif "linux" in ua_lower:
        os_family = "Linux"

    truncated = ua[:512] if len(ua) > 512 else ua
    return browser, os_family, truncated


def client_ip_from_headers(forwarded_for: str | None, direct: str | None) -> str:
    if forwarded_for:
        first = forwarded_for.split(",")[0].strip()
        if first:
            return first
    return (direct or "0.0.0.0").strip()


def normalize_path(path: str | None) -> str:
    if not path or not path.strip():
        return "/"
    p = path.strip()
    if not p.startswith("/"):
        p = f"/{p}"
    return p[:200]


def normalize_referrer(referrer: str | None) -> str | None:
    if not referrer or not referrer.strip():
        return None
    ref = referrer.strip()
    return ref[:300] if len(ref) > 300 else ref
