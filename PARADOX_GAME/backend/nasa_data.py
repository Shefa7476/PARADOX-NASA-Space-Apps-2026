
from datetime import date, timedelta

import httpx

DONKI_URL = "https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR"


async def get_solar_flare_events(days=30):
    today = date.today()
    start = today - timedelta(days=days)

    params = {
        "startDate": start.isoformat(),
        "endDate": today.isoformat()
    }

    async with httpx.AsyncClient(
        timeout=20.0,
        follow_redirects=True
    ) as client:

        response = await client.get(
            DONKI_URL,
            params=params
        )

        response.raise_for_status()

        content_type = response.headers.get(
            "content-type", ""
        )

        if "json" not in content_type.lower():
            raise ValueError(
                f"Expected JSON, received {content_type}"
            )

        events = response.json()

    if events is None:
        raise ValueError(
            "NASA API returned null instead of an event list"
        )

    if not isinstance(events, list):
        raise ValueError(
            "NASA API response is not a list"
        )

    return [
        {
            "event_id": event.get("flrID"),
            "begin_time": event.get("beginTime"),
            "peak_time": event.get("peakTime"),
            "end_time": event.get("endTime"),
            "class_type": event.get("classType"),
            "source": "NASA DONKI"
        }
        for event in events
    ]
