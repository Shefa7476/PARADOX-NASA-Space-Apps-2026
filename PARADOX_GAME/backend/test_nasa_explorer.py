import asyncio

import nasa_explorer


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeClient:
    def __init__(self, *args, **kwargs):
        self.args = args

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url, params=None):
        if "planetary/apod" in url:
            return FakeResponse({"title": "Test Nebula", "date": "2026-11-05", "explanation": "A colourful nebula.", "url": "https://example.test/apod.jpg", "media_type": "image"})
        if "latest_photos" in url:
            return FakeResponse({"latest_photos": [{"img_src": "https://example.test/mars.jpg", "earth_date": "2026-11-04", "camera": {"full_name": "Mast Camera"}, "rover": {"name": "Curiosity"}}]})
        if "neo/rest" in url:
            return FakeResponse({"near_earth_objects": {"2026-11-05": [{"name": "Test Asteroid", "is_potentially_hazardous_asteroid": False, "estimated_diameter": {"meters": {"estimated_diameter_max": 45.6}}, "close_approach_data": [{"miss_distance": {"kilometers": "123456"}}]}]}})
        if "wheretheiss" in url:
            return FakeResponse({"latitude": 10.1, "longitude": 20.2, "altitude": 420.5, "velocity": 27600.3, "timestamp": 1793830000})
        raise AssertionError(f"Unexpected URL: {url}")


def test_space_dashboard_normalizes_nasa_and_iss_data(monkeypatch):
    monkeypatch.setattr(nasa_explorer.httpx, "AsyncClient", FakeClient)
    data = asyncio.run(nasa_explorer.get_space_dashboard())
    assert data["apod"]["title"] == "Test Nebula"
    assert data["mars_photos"][0]["rover"] == "Curiosity"
    assert data["near_earth_objects"]["count"] == 1
    assert data["near_earth_objects"]["items"][0]["kilometers"] == 123456
    assert data["iss"]["altitude_km"] == 420.5
    assert all(data["availability"].values())


def test_space_dashboard_degrades_when_external_sources_fail(monkeypatch):
    class OfflineClient(FakeClient):
        async def get(self, url, params=None):
            raise OSError("offline")
    monkeypatch.setattr(nasa_explorer.httpx, "AsyncClient", OfflineClient)
    data = asyncio.run(nasa_explorer.get_space_dashboard())
    assert data["apod"] is None
    assert data["mars_photos"] == []
    assert data["iss"] is None
    assert data["near_earth_objects"]["count"] == 0


def test_iss_position_helper(monkeypatch):
    monkeypatch.setattr(nasa_explorer.httpx, "AsyncClient", FakeClient)
    position = asyncio.run(nasa_explorer.get_iss_position())
    assert position["latitude"] == 10.1
    assert position["longitude"] == 20.2
    assert position["altitude_km"] == 420.5
