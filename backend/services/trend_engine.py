def calculate_trends(history: list) -> dict:
    if len(history) < 2:
        return {}
    
    latest = history[-1]
    previous = history[-2]
    
    trends = {}
    for key, curr_data in latest.get("biomarkers", {}).items():
        if key in previous.get("biomarkers", {}):
            prev_val = previous["biomarkers"][key]["value"]
            curr_val = curr_data["value"]
            
            diff = curr_val - prev_val
            pct = (diff / prev_val) * 100 if prev_val else 0
            
            if abs(pct) < 5:
                direction = "Stable →"
            elif pct > 0:
                direction = "Rising rapidly ↑↑" if pct >= 20 else "Rising ↑"
            else:
                direction = "Declining rapidly ↓↓" if pct <= -20 else "Declining ↓"
                
            trends[key] = {
                "previous": prev_val,
                "current": curr_val,
                "direction": direction,
                "percent_change": round(pct, 1)
            }
    return trends

def generate_alerts(latest: dict, trends: dict) -> list:
    alerts = []
    bios = latest.get("biomarkers", {})
    if "Potassium" in bios and bios["Potassium"]["value"] > 5.5:
        alerts.append("Critical potassium elevation detected.")
    if "Creatinine" in trends and "rapidly" in trends["Creatinine"]["direction"].lower() and trends["Creatinine"]["current"] > trends["Creatinine"]["previous"]:
        alerts.append("Rapid worsening kidney function detected.")
    if "Creatinine" in bios and bios["Creatinine"]["value"] >= 3.0:
        alerts.append("Severe kidney dysfunction indicators detected.")
    return alerts
