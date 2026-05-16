import re

def classify_biomarker(name: str, value: float) -> str:
    name_lower = name.lower()
    if "creatinine" in name_lower:
        if value < 1.2: return "normal"
        elif value <= 2.0: return "abnormal (mild)"
        elif value <= 3.0: return "abnormal (moderate)"
        else: return "critical"
    elif "egfr" in name_lower:
        if value >= 90: return "normal"
        elif value >= 60: return "abnormal (mild)"
        elif value >= 15: return "abnormal (moderate)"
        else: return "critical"
    elif "potassium" in name_lower:
        if value < 3.5: return "abnormal (low)"
        elif value <= 5.2: return "normal"
        elif value <= 5.5: return "abnormal (high)"
        else: return "critical"
    elif "bun" in name_lower or "urea" in name_lower:
        if value <= 20: return "normal"
        elif value <= 45: return "abnormal (mild)"
        else: return "critical"
    elif "hemoglobin" in name_lower:
        if value < 8.0: return "critical"
        elif value < 12.0: return "abnormal (low)"
        else: return "normal"
    elif "sodium" in name_lower:
        if value < 135: return "abnormal (low)"
        elif value > 145: return "abnormal (high)"
        else: return "normal"
    elif "albumin" in name_lower:
        if value < 3.4: return "abnormal (low)"
        elif value > 5.4: return "abnormal (high)"
        else: return "normal"
    return "normal"

def clean_range(s: str) -> str:
    # Removes reference ranges like "12.0 - 15.0" or "40 - 50" so they aren't parsed as results
    return re.sub(r"\d+\.?\d*\s*-\s*\d+\.?\d*", "", s)

def calculate_egfr(scr: float, age: int, gender: str) -> float:
    # 2021 CKD-EPI Creatinine Equation
    if gender.lower() == 'female':
        k = 0.7
        alpha = -0.241 if scr <= k else -1.200
        gender_multiplier = 1.012
    else:
        k = 0.9
        alpha = -0.302 if scr <= k else -1.200
        gender_multiplier = 1.0

    egfr = 142 * ((scr / k) ** alpha) * (0.9938 ** age) * gender_multiplier
    return round(egfr, 1)

def extract_biomarkers(text: str, age: int = 50, gender: str = "Male") -> dict:
    biomarkers = {}
    lines = text.split('\n')
    
    # Aliases mapping for strict word boundary searches
    targets = {
        "Creatinine": ["creatinine"],
        "eGFR": ["egfr", "estimated glomerular filtration rate"],
        "BUN": ["blood urea nitrogen", "bun"],
        "Blood Urea": ["blood urea", "urea serum"],
        "Potassium": ["potassium"],
        "Sodium": ["sodium"],
        "Chloride": ["chloride"],
        "Hemoglobin": ["hemoglobin"],
        "HbA1c": ["hba1c", "glycosylated hemoglobin"],
        "WBC": ["tlc", "white blood cell", "wbc", "leucocyte"],
        "RBC": ["rbc", "red blood cell"],
        "Platelet Count": ["platelet", "platelets"],
        "Calcium": ["calcium"],
        "Uric Acid": ["uric acid"],
        "Albumin": ["albumin"],
        "Glucose": ["glucose", "fasting sugar"]
    }
    
    for i, line in enumerate(lines):
        line_lower = line.lower()
        for marker, aliases in targets.items():
            if marker in biomarkers: continue
            
            # Strict word boundary match to prevent "HbA1c" from matching "Hb"
            if any(re.search(r'\b' + re.escape(alias) + r'\b', line_lower) for alias in aliases):
                # Analyze the current line and the next 5 lines for the result value
                context = " ".join(lines[i:i+6])
                context_no_ranges = clean_range(context)
                
                # Remove the keyword itself to avoid capturing its numbers (e.g. HbA1c -> 1)
                for a in aliases:
                    context_no_ranges = re.sub(re.escape(a), "", context_no_ranges, flags=re.IGNORECASE)
                    
                # Find all isolated numbers
                nums = re.findall(r"\b\d+\.\d+\b|\b\d+\b", context_no_ranges)
                
                # Filter out likely false positives (0 or 1 are often from "Page 1 of 2" or OCR artifacts)
                valid_nums = [float(n) for n in nums if float(n) > 0 and float(n) != 1]
                
                if valid_nums:
                    val = valid_nums[0]
                    
                    # Dynamically hunt for the unit
                    unit_m = re.search(r'(?i)(mg/dl|mmol/l|g/dl|meq/l|mg%|x10\^6/ul|x10\^3/ul|/cumm|%)', context)
                    unit = unit_m.group(1).lower() if unit_m else ""
                    if marker == "Hemoglobin":
                        unit = "g/dL"
                    elif marker == "eGFR":
                        unit = "mL/min/1.73m2"
                        
                    biomarkers[marker] = {
                        "value": val,
                        "unit": unit,
                        "status": classify_biomarker(marker, val)
                    }
                    
    # Automatically calculate eGFR if Creatinine exists but eGFR was not explicitly found in the text
    if "Creatinine" in biomarkers and "eGFR" not in biomarkers:
        scr = biomarkers["Creatinine"]["value"]
        egfr = calculate_egfr(scr, age, gender)
        biomarkers["eGFR"] = {
            "value": egfr,
            "unit": "mL/min/1.73m2",
            "status": classify_biomarker("egfr", egfr)
        }
        
    return biomarkers
