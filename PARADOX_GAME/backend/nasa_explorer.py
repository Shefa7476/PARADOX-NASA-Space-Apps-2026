"""Small, child-friendly NASA and ISS data proxy used by the Space Academy."""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any

import httpx

NASA_BASE = "https://api.nasa.gov"
ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544"


async def _get_json(client: httpx.AsyncClient, url: str, params: dict[str, Any] | None = None):
    try:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError, OSError):
        return None


async def get_iss_position() -> dict[str, Any] | None:
    """Return the latest public ISS position without requesting NASA API quota."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(7.0), follow_redirects=True) as client:
        payload = await _get_json(client, ISS_URL)
    if not payload:
        return None
    try:
        return {
            "latitude": round(float(payload.get("latitude", 0)), 3),
            "longitude": round(float(payload.get("longitude", 0)), 3),
            "altitude_km": round(float(payload.get("altitude", 0)), 1),
            "velocity_kmh": round(float(payload.get("velocity", 0)), 1),
            "timestamp": payload.get("timestamp"),
            "source": "Where the ISS at? public tracker",
        }
    except (TypeError, ValueError):
        return None


async def get_space_dashboard() -> dict[str, Any]:
    """Fetch APOD, a recent Mars image, near-Earth objects and ISS position.

    NASA_API_KEY may be supplied in backend/.env. DEMO_KEY is a low-rate-limit
    fallback for local demos. Each card fails independently if a service is down.
    """
    api_key = os.getenv("NASA_API_KEY", "DEMO_KEY")
    today = datetime.now(timezone.utc).date().isoformat()
    async with httpx.AsyncClient(timeout=httpx.Timeout(9.0), follow_redirects=True) as client:
        apod_task = _get_json(client, f"{NASA_BASE}/planetary/apod", {"api_key": api_key})
        mars_task = _get_json(client, f"{NASA_BASE}/mars-photos/api/v1/rovers/curiosity/latest_photos", {"api_key": api_key})
        neo_task = _get_json(client, f"{NASA_BASE}/neo/rest/v1/feed", {"start_date": today, "end_date": today, "api_key": api_key})
        iss_task = _get_json(client, ISS_URL)
        apod, mars, neo, iss = await asyncio.gather(apod_task, mars_task, neo_task, iss_task)

    apod_card = None
    if apod:
        apod_card = {
            "title": apod.get("title", "NASA Picture of the Day"),
            "date": apod.get("date"),
            "explanation": apod.get("explanation", ""),
            "image_url": apod.get("url") if apod.get("media_type") == "image" else apod.get("thumbnail_url"),
            "media_type": apod.get("media_type", "image"),
            "credit": "NASA Astronomy Picture of the Day",
        }

    mars_photos = []
    for photo in (mars or {}).get("latest_photos", [])[:4]:
        mars_photos.append({
            "image_url": photo.get("img_src"),
            "earth_date": photo.get("earth_date"),
            "camera": (photo.get("camera") or {}).get("full_name", "Mars rover camera"),
            "rover": (photo.get("rover") or {}).get("name", "Curiosity"),
        })

    neo_objects = []
    near_count = 0
    if neo and neo.get("near_earth_objects"):
        for group in neo["near_earth_objects"].values():
            for obj in group:
                approach = (obj.get("close_approach_data") or [{}])[0]
                distance = approach.get("miss_distance", {}).get("kilometers")
                try:
                    distance_value = float(distance)
                except (TypeError, ValueError):
                    distance_value = None
                neo_objects.append({
                    "name": obj.get("name", "Unknown asteroid"),
                    "kilometers": round(distance_value) if distance_value is not None else None,
                    "hazardous": bool(obj.get("is_potentially_hazardous_asteroid")),
                    "diameter_m": round((obj.get("estimated_diameter", {}).get("meters", {}).get("estimated_diameter_max") or 0), 1),
                })
        near_count = len(neo_objects)
        neo_objects.sort(key=lambda item: item["kilometers"] if item["kilometers"] is not None else 10**30)

    iss_card = None
    if iss:
        iss_card = {
            "latitude": round(float(iss.get("latitude", 0)), 3),
            "longitude": round(float(iss.get("longitude", 0)), 3),
            "altitude_km": round(float(iss.get("altitude", 0)), 1),
            "velocity_kmh": round(float(iss.get("velocity", 0)), 1),
            "timestamp": iss.get("timestamp"),
            "source": "Where the ISS at? public tracker",
        }

    return {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "apod": apod_card,
        "mars_photos": mars_photos,
        "near_earth_objects": {"count": near_count, "items": neo_objects[:5]},
        "iss": iss_card,
        "availability": {
            "apod": bool(apod_card),
            "mars": bool(mars_photos),
            "asteroids": bool(neo),
            "iss": bool(iss_card),
        },
        "note": "Live data requires an internet connection. NASA DEMO_KEY has low request limits; add NASA_API_KEY to backend/.env for more capacity.",
    }
