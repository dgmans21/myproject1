from pydantic_settings import BaseSettings, SettingsConfigDict

# 폰·PC DHCP가 자주 바뀌는 사설 LAN 마지막 옥텟 (dev CORS)
LAN_CORS_OCTET_FROM = 100
LAN_CORS_OCTET_TO = 250
LAN_CORS_PORT = 3000


def expand_lan_cors_origins(
    prefix: str,
    *,
    octet_from: int = LAN_CORS_OCTET_FROM,
    octet_to: int = LAN_CORS_OCTET_TO,
    port: int = LAN_CORS_PORT,
) -> list[str]:
    """예: prefix=192.168.0 → http://192.168.0.100:3000 … .250:3000"""
    base = prefix.strip().rstrip(".")
    if not base:
        return []
    return [f"http://{base}.{n}:{port}" for n in range(octet_from, octet_to + 1)]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8-sig",
        extra="ignore",
    )

    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""
    kakao_rest_api_key: str = ""
    analytics_ip_salt: str = "dev-analytics-salt"
    cors_origins: str = "http://localhost:3000"
    # /24 앞 3옥텟. set-lan-ip.ps1 가 채움. 예: 192.168.0 → .100~.250 CORS 자동
    cors_lan_prefix: str = ""
    naver_client_id: str = ""
    naver_client_secret: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for o in self.cors_origins.split(","):
            origin = o.strip().rstrip("/")
            if origin and origin not in seen:
                seen.add(origin)
                out.append(origin)
        for origin in expand_lan_cors_origins(self.cors_lan_prefix):
            if origin not in seen:
                seen.add(origin)
                out.append(origin)
        return out


settings = Settings()
