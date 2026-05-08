"""
AI Legal Filter - Ethiopian Legal Query Processor (FIXED VERSION)
"""

import re
from ethiopian_constitution import (
    ETHIOPIAN_LEGAL_KEYWORDS,
    ETHIOPIAN_REGIONS,
    ETHIOPIAN_CITIES,
    ETHIOPIAN_LEGAL_INSTITUTIONS,
    search_constitution
)
from country_detector import (
    detect_country,
    is_international_law,
    FOREIGN_JURISDICTIONS
)

# ============================================
# DISCLAIMERS
# ============================================

DISCLAIMERS = {
    "english": "This is general legal information only and does not constitute legal advice. Please consult a licensed lawyer.",
    "amharic": "ይህ አጠቃላይ የህግ መረጃ ብቻ ነው።"
}

# ============================================
# NON-LEGAL FILTER
# ============================================

NON_LEGAL_PATTERNS = [
    r"buy drugs", r"illegal weapon", r"commit crime", r"identity theft"
]

# ============================================
# LEGAL CATEGORIES
# ============================================

LEGAL_CATEGORIES = {
    "family_law": {
        "keywords": ["divorce", "marriage", "child custody", "alimony", "ፍቺ", "ጋብቻ"],
        "response_template": "Under Ethiopian Family Law (Revised Family Code Proclamation No. 213/2000), {}"
    },
    "criminal_law": {
        "keywords": ["crime", "theft", "fraud", "assault", "ወንጀል"],
        "response_template": "Under the Ethiopian Criminal Code, {}"
    },
    "civil_law": {
        "keywords": ["contract", "property", "land", "inheritance", "ውል"],
        "response_template": "Under the Ethiopian Civil Code, {}"
    }
}

# ============================================
# RESPONSE TEMPLATES
# ============================================

RESPONSE_TEMPLATES = {
    "non_legal": {
        "english": "Please ask a legal question.",
        "amharic": "እባክዎ የህግ ጥያቄ ይጠይቁ።"
    },
    "foreign": {
        "english": "This question appears to relate to {country} law. This platform focuses on Ethiopian law only.",
        "amharic": "ይህ ጥያቄ የ{country} ህግ ይመስላል።"
    }
}

# ============================================
# MAIN CLASS
# ============================================

class AILegalFilter:

    def __init__(self):
        self.ethiopian_keywords = ETHIOPIAN_LEGAL_KEYWORDS

    # ---------------------------
    # Language detection
    # ---------------------------
    def detect_language(self, text):
        for char in text:
            if 0x1200 <= ord(char) <= 0x137F:
                return "amharic"
        return "english"

    # ---------------------------
    # Legal detection
    # ---------------------------
    def is_legal_query(self, query):
        q = query.lower()

        for pattern in NON_LEGAL_PATTERNS:
            if re.search(pattern, q):
                return False, None

        for cat, data in LEGAL_CATEGORIES.items():
            for kw in data["keywords"]:
                if kw.lower() in q:
                    return True, cat

        # fallback → treat as legal if sentence is meaningful
        if len(query.split()) > 3:
            return True, "general"

        return False, None

    # ---------------------------
    # Jurisdiction detection
    # ---------------------------
    def detect_jurisdiction(self, query):
        q = query.lower()

        is_ethiopian = False

        # Ethiopian keywords
        for kw in self.ethiopian_keywords.get("english", []):
            if kw in q:
                is_ethiopian = True

        for kw in self.ethiopian_keywords.get("amharic", []):
            if kw in query:
                is_ethiopian = True

        # Regions / cities
        for place in ETHIOPIAN_REGIONS + ETHIOPIAN_CITIES:
            if place.lower() in q:
                is_ethiopian = True

        # Foreign detection
        country_code, country_name, confidence, matches, _ = detect_country(query)

        # International law
        is_international, _ = is_international_law(query)

        # Decision
        if is_ethiopian and not country_code:
            return "ETHIOPIAN", None, 100

        if country_code:
            return "FOREIGN", {"country": country_name}, confidence

        if is_international:
            return "INTERNATIONAL", None, 80

        # 🔥 FIX: default to Ethiopian
        return "ETHIOPIAN", None, 50

    # ---------------------------
    # Category
    # ---------------------------
    def get_category(self, query):
        q = query.lower()
        for cat, data in LEGAL_CATEGORIES.items():
            for kw in data["keywords"]:
                if kw.lower() in q:
                    return cat, data["response_template"]
        return "general", "According to Ethiopian law, {}"

    # ---------------------------
    # MAIN RESPONSE GENERATOR
    # ---------------------------
    def generate_response(self, query, language=None):

        if not language:
            language = self.detect_language(query)

        is_legal, _ = self.is_legal_query(query)

        if not is_legal:
            return {
                "response": RESPONSE_TEMPLATES["non_legal"][language],
                "language": language,
                "disclaimer": DISCLAIMERS[language]
            }

        jurisdiction, foreign_details, _ = self.detect_jurisdiction(query)
        category, template = self.get_category(query)

        # 🔥 SAFE SEARCH
        try:
            results = search_constitution(query)
        except Exception as e:
            print("Search error:", e)
            results = []

        # ---------------------------
        # RESPONSE LOGIC
        # ---------------------------

        if jurisdiction == "FOREIGN":
            return {
                "response": RESPONSE_TEMPLATES["foreign"][language].format(
                    country=foreign_details["country"]
                ),
                "language": language,
                "disclaimer": DISCLAIMERS[language]
            }

        # Ethiopian (default path)
        if results and isinstance(results, list) and len(results) > 0:
            content = results[0].get("content", "")
            if content:
                response_text = f"Based on Ethiopian law:\n\n{content}"
            else:
                response_text = template.format("this issue is addressed under Ethiopian law")
        else:
            response_text = template.format(
                "this matter is regulated under Ethiopian legal provisions"
            )

        return {
            "response": response_text,
            "language": language,
            "jurisdiction": jurisdiction,
            "category": category,
            "disclaimer": DISCLAIMERS[language]
        }


# ============================================
# INSTANCE
# ============================================

legal_filter = AILegalFilter()


# ============================================
# PUBLIC FUNCTIONS
# ============================================

def filter_legal_query(query, language=None):
    return legal_filter.generate_response(query, language)


def detect_query_jurisdiction(query):
    return legal_filter.detect_jurisdiction(query)


def is_ethiopian_legal_query(query):
    jurisdiction, _, _ = legal_filter.detect_jurisdiction(query)
    return jurisdiction == "ETHIOPIAN"