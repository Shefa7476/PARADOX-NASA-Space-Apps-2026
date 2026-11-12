MISSION_DATA = [
    {
        "id": 1,
        "title": "The Lost Signal",
        "category": "Communication Failure",
        "cases": [
            ("Power Failure", "Communication transmitter is offline.",
             "Low battery voltage", "Transmitter power warning", "Antenna alignment normal",
             "Restore transmitter power", "Replace antenna", "Change trajectory"),
            ("Antenna Misalignment", "The spacecraft cannot establish a stable Earth link.",
             "Power supply normal", "Pointing error detected", "Weak received signal",
             "Correct antenna pointing", "Restart engines", "Disable science payload"),
            ("Software Malfunction", "Communication controller is unresponsive.",
             "Controller error logs", "Normal battery voltage", "Antenna alignment normal",
             "Recover communication controller", "Increase engine thrust", "Change orbit")
        ]
    },
    {
        "id": 2,
        "title": "Oxygen Zero",
        "category": "Life Support Crisis",
        "cases": [
            ("Oxygen Generator Failure", "Oxygen production has stopped.",
             "Generator fault", "Oxygen level falling", "Habitat pressure stable",
             "Activate backup oxygen supply", "Restart communications", "Increase lighting"),
            ("Habitat Air Leakage", "Cabin pressure is dropping.",
             "Pressure loss", "Leak sensor warning", "Oxygen reserve falling",
             "Isolate leaking compartment", "Increase engine power", "Disable antenna"),
            ("Backup Oxygen Failure", "Primary oxygen system is unavailable and backup supply has failed.",
             "Backup regulator alarm", "Reserve flow unavailable", "Primary system offline",
             "Switch to verified emergency reserve", "Reset navigation", "Change communication frequency")
        ]
    },
    {
        "id": 3,
        "title": "Solar Storm",
        "category": "Space Weather",
        "cases": [
            ("Solar Flare", "A solar flare threatens mission operations.",
             "Solar flare alert", "Elevated radiation warning", "Sensitive equipment exposed",
             "Enter protective operating mode", "Increase transmitter power", "Deploy rover"),
            ("Radiation Exposure", "Crew radiation exposure risk is increasing.",
             "Radiation monitor alert", "Crew outside shelter", "Exposure trend increasing",
             "Move crew to shielded shelter", "Open external hatch", "Increase cabin lighting"),
            ("Communication Disruption", "Space weather is affecting radio communication.",
             "Space weather warning", "Radio link unstable", "Hardware checks normal",
             "Switch to contingency communication plan", "Discard oxygen reserve", "Increase engine thrust")
        ]
    },
    {
        "id": 4,
        "title": "The Broken Rover",
        "category": "Mechanical Failure",
        "cases": [
            ("Wheel Damage", "A rover wheel has been damaged.",
             "Wheel motor load abnormal", "Mobility reduced", "Terrain unusually rough",
             "Use reduced mobility recovery mode", "Increase speed", "Disable cameras"),
            ("Motor Failure", "The rover drive motor has stopped.",
             "Motor fault code", "Drive current abnormal", "Navigation sensors normal",
             "Isolate failed motor and use recovery mode", "Accelerate rover", "Reset antenna"),
            ("Navigation Sensor Failure", "Rover positioning is unreliable.",
             "Navigation sensor error", "Wheel motors normal", "Position estimates inconsistent",
             "Switch to validated backup navigation", "Increase rover speed", "Disable power monitoring")
        ]
    },
    {
        "id": 5,
        "title": "Collision Course",
        "category": "Navigation Crisis",
        "cases": [
            ("Trajectory Error", "Spacecraft trajectory differs from the mission plan.",
             "Orbit estimate deviation", "Propulsion available", "Navigation solution updated",
             "Calculate and execute approved correction", "Disable tracking", "Increase payload mass"),
            ("Thruster Failure", "A maneuver thruster is unavailable.",
             "Thruster fault detected", "Planned burn incomplete", "Backup thruster available",
             "Replan maneuver using backup thruster", "Repeat failed burn blindly", "Disable guidance"),
            ("Navigation Data Error", "The navigation solution is inconsistent.",
             "Conflicting position estimates", "Sensors disagree", "Propulsion nominal",
             "Validate navigation data before maneuver", "Fire thrusters immediately", "Disable telemetry")
        ]
    },
    {
        "id": 6,
        "title": "Fire in Zero-G",
        "category": "Fire Safety",
        "cases": [
            ("Electrical Fire", "An electrical module shows signs of fire.",
             "Smoke alarm", "Electrical fault", "Temperature rising",
             "Isolate affected electrical module", "Increase oxygen flow", "Ignore alarm"),
            ("Smoke Detection Failure", "Primary smoke detection is unavailable.",
             "Detector fault", "Secondary sensor available", "Crew reports unusual odor",
             "Use backup detection and safety procedure", "Disable all alarms", "Increase ventilation blindly"),
            ("Ventilation Malfunction", "Air circulation is not operating correctly.",
             "Fan controller error", "Airflow below target", "Smoke distribution uncertain",
             "Apply compartment safety isolation procedure", "Increase fan speed blindly", "Open all compartments")
        ]
    },
    {
        "id": 7,
        "title": "Dark Orbit",
        "category": "Power Failure",
        "cases": [
            ("Solar Panel Failure", "Solar array power output is low.",
             "Array output reduced", "Battery discharging", "Sunlight available",
             "Reconfigure power and reduce nonessential loads", "Increase science payload power", "Disable battery monitoring"),
            ("Battery Malfunction", "The spacecraft battery system reports a fault.",
             "Battery controller alarm", "Voltage unstable", "Solar array nominal",
             "Isolate faulty battery branch", "Increase all electrical loads", "Disable protection circuits"),
            ("Power Distribution Failure", "Several systems have lost electrical power.",
             "Distribution bus fault", "Battery charge available", "Multiple subsystem alarms",
             "Isolate fault and restore essential bus", "Restart all systems simultaneously", "Disable telemetry")
        ]
    },
    {
        "id": 8,
        "title": "Seven Minutes to Mars",
        "category": "Landing Emergency",
        "cases": [
            ("Parachute Failure", "Parachute deployment has not been confirmed.",
             "Deployment status fault", "Descent speed elevated", "Backup mode available",
             "Execute validated descent contingency", "Disable altitude sensor", "Increase payload mass"),
            ("Landing Sensor Error", "Lander altitude estimates are inconsistent.",
             "Radar disagreement", "Navigation uncertainty", "Engine status nominal",
             "Use validated backup landing estimate", "Ignore sensor warnings", "Disable guidance"),
            ("Descent Engine Failure", "A descent engine has malfunctioned.",
             "Engine fault alarm", "Thrust below target", "Contingency mode available",
             "Activate validated descent contingency", "Disable remaining engines", "Ignore thrust warning")
        ]
    }
]


def build_missions():
    missions = []

    for mission in MISSION_DATA:
        scenarios = []

        for index, case in enumerate(mission["cases"], start=1):
            name, problem, clue1, clue2, clue3, correct, wrong1, wrong2 = case

            scenarios.append({
                "id": index,
                "name": name,
                "problem": problem,
                "clues": [clue1, clue2, clue3],
                "actions": [
                    {"id": "A", "label": correct},
                    {"id": "B", "label": wrong1},
                    {"id": "C", "label": wrong2}
                ],
                "correct_action": "A"
            })

        missions.append({
            "id": mission["id"],
            "title": mission["title"],
            "category": mission["category"],
            "scenarios": scenarios
        })

    return missions


MISSIONS = build_missions()