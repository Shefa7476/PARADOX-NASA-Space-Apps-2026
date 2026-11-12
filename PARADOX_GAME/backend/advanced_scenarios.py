ADVANCED_SCENARIOS = {
    (2, 2): {
        "title": "Habitat Air Leakage",
        "stages": [
            {
                "name": "Diagnose",
                "briefing": (
                    "Cabin pressure is falling. "
                    "Find the likely source before taking action."
                ),
                "telemetry": {
                    "cabin_pressure_trend": "DECREASING",
                    "leak_detector": "ALERT",
                    "oxygen_reserve": "DECREASING"
                },
                "actions": [
                    {
                        "key": "inspect",
                        "label": "Analyze pressure and leak sensor data",
                        "effects": {
                            "time": -6,
                            "power": -2
                        },
                        "score": 2,
                        "feedback": "Sensor data identifies the affected area."
                    },
                    {
                        "key": "ignore",
                        "label": "Ignore the pressure warning",
                        "effects": {
                            "oxygen": -18,
                            "integrity": -12,
                            "time": -8
                        },
                        "score": 0,
                        "feedback": "The leak continues without diagnosis."
                    },
                    {
                        "key": "vent",
                        "label": "Open additional ventilation pathways",
                        "effects": {
                            "oxygen": -12,
                            "time": -8
                        },
                        "score": 0,
                        "feedback": "This does not identify or isolate the leak."
                    }
                ]
            },
            {
                "name": "Stabilize",
                "briefing": (
                    "The leaking compartment has been identified. "
                    "Limit further atmosphere loss."
                ),
                "telemetry": {
                    "leak_location": "MODULE B",
                    "pressure_trend": "DECREASING",
                    "isolation_system": "AVAILABLE"
                },
                "actions": [
                    {
                        "key": "isolate",
                        "label": "Isolate the affected compartment",
                        "effects": {
                            "power": -5,
                            "time": -7,
                            "oxygen": -3
                        },
                        "score": 2,
                        "feedback": "The affected compartment is isolated."
                    },
                    {
                        "key": "wait",
                        "label": "Wait for pressure to recover automatically",
                        "effects": {
                            "oxygen": -20,
                            "integrity": -10,
                            "time": -10
                        },
                        "score": 0,
                        "feedback": "Atmosphere loss continues."
                    },
                    {
                        "key": "boost",
                        "label": "Increase oxygen supply without isolating the leak",
                        "effects": {
                            "oxygen": -14,
                            "power": -8,
                            "time": -8
                        },
                        "score": 0,
                        "feedback": "The leak remains unresolved."
                    }
                ]
            },
            {
                "name": "Recover",
                "briefing": (
                    "The leak is contained. "
                    "Restore a stable cabin environment."
                ),
                "telemetry": {
                    "isolation": "COMPLETE",
                    "backup_life_support": "AVAILABLE",
                    "cabin_pressure": "BELOW TARGET"
                },
                "actions": [
                    {
                        "key": "restore",
                        "label": "Verify and activate backup life support",
                        "effects": {
                            "power": -8,
                            "oxygen": 10,
                            "time": -8
                        },
                        "score": 2,
                        "feedback": "Backup life support stabilizes the cabin."
                    },
                    {
                        "key": "disable",
                        "label": "Disable atmospheric monitoring",
                        "effects": {
                            "integrity": -15,
                            "time": -8
                        },
                        "score": 0,
                        "feedback": "Critical environmental monitoring is lost."
                    },
                    {
                        "key": "restart",
                        "label": "Restart unrelated communication equipment",
                        "effects": {
                            "power": -12,
                            "time": -10
                        },
                        "score": 0,
                        "feedback": "This does not restore life support."
                    }
                ]
            }
        ]
    }
}