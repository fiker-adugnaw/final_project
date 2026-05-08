import re

# Ethiopian legal markers for jurisdiction detection
ETHIOPIAN_MARKERS = [
    'ethiopia', 'et', 'addis ababa', 'fdre', 'federal negerit gazeta',
    'proclamation', 'civil code', 'criminal code', 'family code',
    'commercial code', 'labour proclamation', 'cassation', 'woreda',
    'kebele', 'human rights commission', 'ethiopian law'
]

# Foreign jurisdiction markers to flag
FOREIGN_MARKERS = {
    'USA': ['usa', 'united states', 'us constitution', 'supreme court us', 'bill of rights', 'congress'],
    'UK': ['uk', 'united kingdom', 'parliament uk', 'house of lords', 'english law'],
    'CANADA': ['canada', 'canadian law', 'charter of rights'],
    'KENYA': ['kenya', 'kenyan law', 'kenya constitution']
}

# Off-topic keywords to filter out
NON_LEGAL_KEYWORDS = [
    'recipe', 'cooking', 'football', 'soccer', 'movie', 'music', 'celebrity', 
    'joke', 'funny', 'weather', 'game', 'play'
]

def detect_jurisdiction(question):
    """Detects if the query is related to Ethiopian law or foreign law."""
    question_lower = question.lower()
    detected_foreign = []
    
    for country, markers in FOREIGN_MARKERS.items():
        for marker in markers:
            if marker in question_lower:
                detected_foreign.append(country)
                break
                
    ethiopian_score = sum(1 for marker in ETHIOPIAN_MARKERS if marker in question_lower)
    
    if detected_foreign:
        return 'FOREIGN', detected_foreign
    if ethiopian_score > 0:
        return 'ETHIOPIAN', None
    return 'UNKNOWN', None

def filter_non_legal_queries(question):
    """Returns True if the query is non-legal/off-topic."""
    question_lower = question.lower()
    for kw in NON_LEGAL_KEYWORDS:
        if kw in question_lower:
            return True
    return False

def detect_foreign_constitution(question):
    """Specifically checks for foreign constitution queries."""
    question_lower = question.lower()
    constitutions = ['constitution of usa', 'us constitution', 'uk constitution', 'british constitution', 'kenyan constitution']
    for c in constitutions:
        if c in question_lower:
            return True
    return False

def get_ethiopian_legal_response_prompt(question, language='English'):
    """Constructs a system prompt for the LLM based on user question."""
    
    prompt = f"""
    You are an AI Legal Assistant specialized ONLY in Ethiopian law. 
    User Question: {question}
    
    RULES:
    1. Answer ONLY based on Ethiopian law (Proclamations, Civil Code, Criminal Code, Commercial Code, Family Code, etc.).
    2. Cite specific articles and proclamations (e.g., 'Proclamation No. 1156/2019', 'Civil Code Art. 123').
    3. If the question is in Amharic, respond in Amharic. If in English, respond in English.
    4. Provide a clear, structured response.
    5. Always include a disclaimer at the end: 'This is general legal information only and does not constitute legal advice.'
    """
    return prompt
