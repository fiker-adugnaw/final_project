import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai
from ai_legal_filter import (
    detect_jurisdiction, 
    filter_non_legal_queries, 
    get_ethiopian_legal_response_prompt,
    detect_foreign_constitution
)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# OpenAI Client Configuration
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "active", "service": "AI Legal Service — Ethiopia"}), 200

@app.route('/process', methods=['POST'])
def process_query():
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({"error": "No query provided"}), 400

    # 1. Check for non-legal queries
    if filter_non_legal_queries(query):
        return jsonify({
            "response": "This platform is exclusively for legal inquiries related to Ethiopian law. Please ask a legal question.",
            "jurisdiction": "N/A",
            "warning": "NON_LEGAL_TOPIC"
        }), 200

    # 2. Detect jurisdiction
    jurisdiction, foreign_countries = detect_jurisdiction(query)
    
    # 3. Handle foreign constitution or laws
    if jurisdiction == 'FOREIGN' or detect_foreign_constitution(query):
        countries = ", ".join(foreign_countries) if foreign_countries else "foreign jurisdictions"
        return jsonify({
            "response": f"This query appears to be about {countries}. I am specialized strictly in Ethiopian law. I cannot provide information on foreign legal systems.",
            "jurisdiction": jurisdiction,
            "warning": "FOREIGN_LAW_DETECTED"
        }), 200

    # 4. Process Ethiopian legal query using OpenAI
    try:
        system_prompt = get_ethiopian_legal_response_prompt(query)
        
        response = openai.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        ai_answer = response.choices[0].message.content
        
        return jsonify({
            "response": ai_answer,
            "jurisdiction": "ETHIOPIAN",
            "disclaimer": "This is general legal information only and does not constitute legal advice."
        }), 200

    except Exception as e:
        print(f"AI Error: {str(e)}")
        # Fallback if API fails
        return jsonify({
            "response": "I'm sorry, I'm having trouble connecting to my legal knowledge base. Please try again in a moment.",
            "error": str(e),
            "jurisdiction": "ETHIOPIAN"
        }), 500

if __name__ == '__main__':
    port = int(os.getenv("PORT", 8000))
    app.run(host='0.0.0.0', port=port, debug=True)
