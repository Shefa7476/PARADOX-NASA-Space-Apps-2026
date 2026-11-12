
SCENARIO = {
    "id": "solar_storm_branching",
    "title": "Solar Storm: Decision Cascade",
    "start_node": "analyze",
    "nodes": {
        "analyze": {
            "stage": "Analyze",
            "briefing": (
                "NASA DONKI reports a solar flare. "
                "Assess the spacecraft before changing operations."
            ),
            "telemetry": {
                "radiation_monitor": "REVIEW REQUIRED",
                "communications": "AVAILABLE",
                "spacecraft_health": "NOMINAL"
            },
            "actions": [
                {
                    "key": "review",
                    "label": "Review radiation monitor and spacecraft telemetry",
                    "effects": {"power": -3, "time": -5},
                    "next_node": "controlled_protection",
                    "feedback": "The operating risks have been assessed.",
                    "principle": "Hazard assessment should precede operational changes."
                },
                {
                    "key": "ignore",
                    "label": "Ignore the warning and continue operations",
                    "effects": {"integrity": -18, "time": -8},
                    "next_node": "emergency",
                    "feedback": "Unassessed risks require a contingency response.",
                    "principle": "Unverified environmental conditions increase operational uncertainty."
                },
                {
                    "key": "overload",
                    "label": "Increase electrical loads without assessing the warning",
                    "effects": {"power": -20, "time": -10},
                    "next_node": "emergency",
                    "feedback": "Available electrical margin has decreased.",
                    "principle": "Power margins should be managed conservatively."
                }
            ]
        },

        "controlled_protection": {
            "stage": "Protect",
            "briefing": (
                "Telemetry has been reviewed. Select a precautionary "
                "operating configuration."
            ),
            "telemetry": {
                "risk_assessment": "COMPLETE",
                "sensitive_operations": "ACTIVE",
                "protective_mode": "AVAILABLE"
            },
            "actions": [
                {
                    "key": "protect",
                    "label": "Pause sensitive operations and use protective mode",
                    "effects": {"power": -6, "time": -8},
                    "next_node": "controlled_recovery",
                    "feedback": "Sensitive operations have been paused.",
                    "principle": "Protective configurations can reduce operational exposure."
                },
                {
                    "key": "continue",
                    "label": "Continue sensitive operations without precautions",
                    "effects": {"integrity": -20, "time": -6},
                    "next_node": "emergency",
                    "feedback": "A contingency response is now required.",
                    "principle": "Operational risk should be reassessed before continuation."
                }
            ]
        },

        "emergency": {
            "stage": "Emergency Stabilization",
            "briefing": (
                "Simulated subsystem anomalies are now present. "
                "Stabilize the spacecraft before recovery."
            ),
            "telemetry": {
                "spacecraft_health": "DEGRADED",
                "subsystem_alert": "ACTIVE",
                "safe_configuration": "AVAILABLE"
            },
            "actions": [
                {
                    "key": "stabilize",
                    "label": "Isolate affected operations and stabilize subsystems",
                    "effects": {
                        "power": -8,
                        "time": -12,
                        "integrity": 5
                    },
                    "next_node": "emergency_recovery",
                    "feedback": "The simulated anomalies have been contained.",
                    "principle": "Fault isolation limits cascading subsystem effects."
                },
                {
                    "key": "force",
                    "label": "Force all affected systems back online immediately",
                    "effects": {
                        "integrity": -35,
                        "power": -15,
                        "time": -8
                    },
                    "next_node": "failure",
                    "feedback": "Unverified restart has compromised mission safety.",
                    "principle": "Restarting faulty systems without diagnosis can increase risk."
                }
            ]
        },

        "controlled_recovery": {
            "stage": "Controlled Recovery",
            "briefing": (
                "The protective operating period has ended in this "
                "simulation. Verify spacecraft health before resuming."
            ),
            "telemetry": {
                "system_health_check": "PENDING",
                "communications_check": "PENDING",
                "recovery_mode": "AVAILABLE"
            },
            "actions": [
                {
                    "key": "verify",
                    "label": "Run diagnostics and restore operations gradually",
                    "effects": {"power": -5, "time": -10},
                    "next_node": "success",
                    "feedback": "Diagnostics support a controlled return to service.",
                    "principle": "Verification reduces uncertainty during recovery."
                },
                {
                    "key": "skip",
                    "label": "Skip diagnostics and restore every system immediately",
                    "effects": {"integrity": -18, "time": -5},
                    "next_node": "emergency",
                    "feedback": "The unverified recovery requires stabilization.",
                    "principle": "Recovery checks should not be skipped."
                }
            ]
        },

        "emergency_recovery": {
            "stage": "Emergency Recovery",
            "briefing": (
                "The spacecraft has been stabilized. "
                "Complete diagnostics before resuming critical operations."
            ),
            "telemetry": {
                "fault_isolation": "COMPLETE",
                "system_health_check": "REQUIRED",
                "operating_margin": "REDUCED"
            },
            "actions": [
                {
                    "key": "diagnose",
                    "label": "Perform diagnostics and restore essential operations",
                    "effects": {"power": -7, "time": -12},
                    "next_node": "success",
                    "feedback": "Essential systems have been restored.",
                    "principle": "Staged recovery is preferable to unverified restart."
                },
                {
                    "key": "bypass",
                    "label": "Bypass safety checks during emergency recovery",
                    "effects": {"integrity": -30, "time": -5},
                    "next_node": "failure",
                    "feedback": "The recovery procedure failed.",
                    "principle": "Safety checks are especially important after faults."
                }
            ]
        }
    }
}

TERMINAL_NODES = {
    "success": "SUCCESS",
    "failure": "FAILURE"
}
