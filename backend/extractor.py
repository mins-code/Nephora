"""
CKD Blood Report Extractor
Extracts 8 kidney biomarkers + their reference ranges from PDF reports.
Handles both inline-column and multi-line PDF layouts.
"""

import re
import fitz  # PyMuPDF
from typing import Dict, Optional, Tuple

# The 8 canonical biomarkers and all their aliases
BIOMARKER_ALIASES = {
    "Creatinine": [
        "creatinine", "creatinine (serum)", "serum creatinine",
        "s. creatinine", "s creatinine", "creatinine serum"
    ],
    "BUN": [
        "bun", "blood urea nitrogen", "bun: blood urea nitrogen",
        "urea nitrogen", "b.u.n", "bun (serum)", "blood urea nitrogen (serum)"
    ],
    "Potassium": [
        "potassium", "potassium (serum)", "serum potassium",
        "s. potassium", "k+", "potassium serum"
    ],
    "Sodium": [
        "sodium", "sodium (serum)", "serum sodium",
        "s. sodium", "na+", "sodium serum"
    ],
    "Hemoglobin": [
        "hemoglobin", "haemoglobin", "hb", "hgb", "h.b.",
        "hemoglobin (hb)", "haemoglobin (hb)"
    ],
    "Bicarbonate": [
        "bicarbonate", "hco3", "co2", "total co2",
        "carbon dioxide", "bicarbonate (serum)", "serum bicarbonate"
    ],
    "Calcium": [
        "calcium", "calcium (serum)", "serum calcium",
        "s. calcium", "ca++", "ca", "calcium total"
    ],
    "Glucose": [
        "glucose", "blood glucose", "fasting glucose", "fbs",
        "rbs", "random blood sugar", "blood sugar",
        "fasting blood sugar", "glucose (fasting)", "plasma glucose"
    ]
}

# Regex patterns
NUMERIC_RE = re.compile(r'^\d+(\.\d+)?$')
RANGE_RE = re.compile(r'(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)')
# Inline row: TEST NAME    VALUE    UNIT    RANGE
INLINE_RE = re.compile(
    r'(.+?)\s{2,}'                          # test name (2+ spaces separator)
    r'(\d+\.?\d*)\s+'                        # numeric value
    r'([\w/%µ\s\.]+?)\s{2,}'               # unit
    r'(\d+\.?\d*\s*[-–]\s*\d+\.?\d*)'      # reference range
)
# Date patterns: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD-MMM-YYYY, DD MMM YYYY
DATE_RE = re.compile(
    r'(?:^|\s|[:\-])(?:'
    r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})'          # DD/MM/YYYY or DD-MM-YYYY
    r'|(\d{4})[\-/](\d{2})[\-/](\d{2})'              # YYYY-MM-DD
    r'|(\d{1,2})[\-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\-\s](\d{4})'  # DD-MMM-YYYY
    r')(?:\s|$|[:\-])',
    re.IGNORECASE
)

# Regex to find specific contextual dates like "Registered On : 01-Oct-2025"
CONTEXT_DATE_RE = re.compile(
    r'(?:Registered\s*On|Collected\s*On|Reported\s*On|Date)\s*[:\-]?\s*'
    r'(?:(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})|(\d{4})[\-/](\d{2})[\-/](\d{2})|(\d{1,2})[\-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\-\s](\d{4}))',
    re.IGNORECASE
)

MONTH_MAP = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
}

class CKDExtractor:
    def __init__(self):
        # Build reverse lookup: alias → canonical name
        self.alias_map = {}
        for canonical, aliases in BIOMARKER_ALIASES.items():
            for alias in aliases:
                self.alias_map[alias.lower().strip()] = canonical

    def extract_from_pdf(self, pdf_path: str) -> Dict:
        """
        Main entry point. Returns dict with 8 biomarkers or fewer if not found.
        """
        try:
            doc = fitz.open(pdf_path)
            all_text = ""
            for page in doc:
                all_text += page.get_text() + "\n"
            doc.close()

            print(f"\n--- EXTRACTED TEXT FROM {pdf_path} ---")
            print(all_text)
            print("---------------------------------------\n")

            found = {}
            
            # Try inline parsing first (more reliable when it works)
            found.update(self._parse_inline(all_text))
            
            # For any still missing, try multiline parsing
            missing = [b for b in BIOMARKER_ALIASES if b not in found]
            if missing:
                found.update(self._parse_multiline(all_text, missing))
            
            missing_final = [b for b in BIOMARKER_ALIASES if b not in found]
            
            # Extract date from the entire text to avoid issues with split pages
            # and PyMuPDF text block ordering anomalies
            extracted_date = self._extract_date(all_text)

            return {
                "success": True,
                "found": found,
                "missing": missing_final,
                "extracted_date": extracted_date
            }
        except Exception as e:
            return {"success": False, "error": str(e), "found": {}, "missing": list(BIOMARKER_ALIASES.keys()), "extracted_date": None}

    def _extract_date(self, text: str) -> Optional[str]:
        """
        Scans text for common date formats, preferring 'Registered On' or 'Collected On',
        and returns the first match as an ISO string YYYY-MM-DD, or None.
        """
        # Try context specific match first
        match = CONTEXT_DATE_RE.search(text)
        if not match:
            # Fallback to any date
            match = DATE_RE.search(text)
            
        if not match:
            return None
            
        try:
            g = match.groups()
            # If matched by CONTEXT_DATE_RE, groups are shifted depending on the regex OR
            # Actually CONTEXT_DATE_RE has 9 groups exactly like DATE_RE
            if g[0] and g[1] and g[2]:
                val1, val2, year = int(g[0]), int(g[1]), g[2]
                if val1 > 12: month, day = val2, val1
                elif val2 > 12: month, day = val1, val2
                else: day, month = val1, val2 # Default DD/MM/YYYY
                return f"{year}-{str(month).zfill(2)}-{str(day).zfill(2)}"
            elif g[3] and g[4] and g[5]:
                return f"{g[3]}-{g[4]}-{g[5]}"
            elif g[6] and g[7] and g[8]:
                day = g[6].zfill(2)
                month = MONTH_MAP.get(g[7].lower()[:3], '01')
                return f"{g[8]}-{month}-{day}"
        except Exception:
            pass
        return None

    def _match_biomarker(self, text: str) -> Optional[str]:
        """Check if text matches any known biomarker alias. Returns canonical name or None."""
        normalized = re.sub(r'[:\(\)]', '', text.lower().strip())
        normalized = ' '.join(normalized.split())
        
        # Exact match
        if normalized in self.alias_map:
            return self.alias_map[normalized]
        
        # Partial match — biomarker keyword contained in the line
        for alias, canonical in self.alias_map.items():
            if alias in normalized:
                return canonical
        return None

    def _parse_range(self, range_str: str) -> Tuple[Optional[float], Optional[float]]:
        """Parse '0.7 - 1.2' or '0.7- 1.2' into (0.7, 1.2)."""
        m = RANGE_RE.search(range_str)
        if m:
            return float(m.group(1)), float(m.group(2))
        return None, None

    def _parse_inline(self, text: str) -> Dict:
        """
        Parse Layout A: rows where test name, value, unit, range are on one line.
        Example: 'CREATININE (SERUM)       3.38       mg/dl       0.7 - 1.2'
        """
        found = {}
        for line in text.split('\n'):
            m = INLINE_RE.match(line.strip())
            if not m:
                continue
            test_text, value_str, unit_str, range_str = m.group(1), m.group(2), m.group(3), m.group(4)
            canonical = self._match_biomarker(test_text)
            if canonical and canonical not in found:
                ref_low, ref_high = self._parse_range(range_str)
                found[canonical] = {
                    "value": float(value_str),
                    "unit": unit_str.strip(),
                    "ref_low": ref_low,
                    "ref_high": ref_high,
                    "ref_raw": range_str.strip()
                }
        return found

    def _parse_multiline(self, text: str, targets: list) -> Dict:
        """
        Parse Layout B: each column on its own line.
        Strategy: find the test name line, then scan the next 8 lines for
        value (pure number), unit (letters/symbols), and range (N-N pattern).
        """
        found = {}
        lines = [l.strip() for l in text.split('\n')]
        
        for i, line in enumerate(lines):
            if not line:
                continue
            canonical = self._match_biomarker(line)
            if not canonical or canonical in found or canonical not in targets:
                continue
            
            # Scan ahead up to 8 lines for value, unit, range
            value = unit = ref_raw = None
            ref_low = ref_high = None
            
            for j in range(i + 1, min(i + 9, len(lines))):
                chunk = lines[j].strip()
                if not chunk:
                    continue
                # Skip method lines
                if chunk.lower().startswith('method') or chunk.lower().startswith('automated'):
                    continue
                
                # Pure number → value
                if value is None and NUMERIC_RE.match(chunk):
                    value = float(chunk)
                    continue
                
                # Range pattern → reference range
                if ref_raw is None and RANGE_RE.search(chunk):
                    ref_raw = chunk
                    ref_low, ref_high = self._parse_range(chunk)
                    continue
                
                # Unit: short string with letters, no digits standalone
                if unit is None and value is not None and re.match(r'^[a-zA-Z%/µ\.]+\s*/?[a-zA-Z]*$', chunk):
                    unit = chunk
            
            if value is not None:
                found[canonical] = {
                    "value": value,
                    "unit": unit or "",
                    "ref_low": ref_low,
                    "ref_high": ref_high,
                    "ref_raw": ref_raw or ""
                }
        
        return found

def classify_status(value, ref_low, ref_high):
    """
    Classify each biomarker using the extracted ref_low and ref_high.
    """
    if ref_low is None or ref_high is None:
        return "unknown"
    
    range_size = ref_high - ref_low
    borderline_margin = range_size * 0.15  # 15% beyond range = borderline
    
    if value < ref_low - borderline_margin or value > ref_high + borderline_margin:
        return "abnormal"   # red
    elif value < ref_low or value > ref_high:
        return "borderline" # yellow
    else:
        return "normal"     # green
