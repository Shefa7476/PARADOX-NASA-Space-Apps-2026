
SCIENTIFIC_KNOWLEDGE = {
    "solar_flare": {
        "title": "Solar Flare Classification",
        "facts": [
            "Solar flares are classified by their peak soft X-ray flux.",
            "The major classes include A, B, C, M and X.",
            "A flare class alone does not determine spacecraft damage.",
            "Spacecraft risk depends on mission location, design, shielding and operating conditions."
        ],
        "source": "NOAA Space Weather Prediction Center",
        "url": "https://www.swpc.noaa.gov/"
    },
    "spacecraft_safety": {
        "title": "Spacecraft Operations and Safety",
        "facts": [
            "Spacecraft operators use telemetry to assess system health.",
            "Protective configurations may reduce exposure of sensitive operations.",
            "Fault isolation can help prevent cascading failures.",
            "Recovery procedures should include appropriate diagnostics and verification."
        ],
        "source": "NASA Engineering and Mission Operations Principles",
        "url": "https://www.nasa.gov/"
    },
    "nasa_donki": {
        "title": "NASA DONKI Event Data",
        "facts": [
            "DONKI provides records of space-weather events.",
            "Solar flare records can include event identifiers, timing and flare classification.",
            "A historical event record is not live spacecraft telemetry.",
            "The PARADOX spacecraft resource values are educational simulations."
        ],
        "source": "NASA CCMC DONKI",
        "url": "https://ccmc.gsfc.nasa.gov/DONKI/"
    }
}

NODE_HINTS = {
    "analyze": {
        "hint": (
            "Before changing spacecraft operations, consider "
            "which available measurements could establish "
            "whether the spacecraft is experiencing a hazard."
        ),
        "concept": "Hazard assessment and telemetry interpretation",
        "knowledge": ["solar_flare", "nasa_donki"]
    },
    "controlled_protection": {
        "hint": (
            "Think about which activities are sensitive to "
            "environmental disturbances and how a precautionary "
            "configuration could reduce unnecessary exposure."
        ),
        "concept": "Risk reduction during spacecraft operations",
        "knowledge": ["spacecraft_safety"]
    },
    "emergency": {
        "hint": (
            "A subsystem anomaly has been reported in this "
            "simulation. Consider containment and verification "
            "before attempting a full return to service."
        ),
        "concept": "Fault isolation and stabilization",
        "knowledge": ["spacecraft_safety"]
    },
    "controlled_recovery": {
        "hint": (
            "The simulated protective period has ended. "
            "What evidence would help establish that systems "
            "are ready to resume normal operations?"
        ),
        "concept": "System verification before recovery",
        "knowledge": ["spacecraft_safety"]
    },
    "emergency_recovery": {
        "hint": (
            "Following a simulated fault, consider which "
            "checks would reduce uncertainty before "
            "restoring essential spacecraft operations."
        ),
        "concept": "Controlled recovery after fault isolation",
        "knowledge": ["spacecraft_safety"]
    }
}
