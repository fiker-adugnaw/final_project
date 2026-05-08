"""
Flask API Server for AI Legal Filter Service
Provides endpoints for the main backend to query
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
from datetime import datetime

from ai_legal_filter import (
    filter_legal_query,
    analyze_legal_document,
    detect_query_jurisdiction,
    is_ethiopian_legal_query,
    DISCLAIMERS
)
from ethiopian_constitution import (
    get_constitution_article,
    search_constitution,
    get_legal_code_reference,
    ETHIOPIAN_CONSTITUTION,
    ETHIOPIAN_LEGAL_CODES
)
from country_detector import (
    detect_country,
    is_international_law,
    FOREIGN_JURISDICTIONS,
    INTERNATIONAL_LEGAL_BODIES
)

# ============================================
# APP CONFIGURATION
# ============================================

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# REQUEST LOGGING
# ============================================

@app.before_request
def log_request_info():
    """Log all incoming requests"""
    logger.info(f"Request: {request.method} {request.path}")
    logger.info(f"Headers: {dict(request.headers)}")
    if request.is_json:
        logger.info(f"JSON Body: {request.json}")

# ============================================
# HEALTH CHECK ENDPOINT
# ============================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "AI Legal Filter",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "ethiopian_law_database": {
            "constitution_articles": sum(len(chapter["articles"]) for chapter in ETHIOPIAN_CONSTITUTION["chapters"].values()),
            "legal_codes": len(ETHIOPIAN_LEGAL_CODES),
            "foreign_jurisdictions": len(FOREIGN_JURISDICTIONS)
        }
    })

# ============================================
# LEGAL GUIDANCE ENDPOINT
# ============================================

@app.route('/api/guidance', methods=['POST'])
def get_legal_guidance():
    """
    Get legal guidance for a query
    Expected JSON: {
        "query": "string",
        "language": "english" or "amharic" (optional)
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                "error": "Missing query parameter",
                "status": "error"
            }), 400
        
        query = data['query']
        language = data.get('language')
        
        # Process the query
        result = filter_legal_query(query, language)
        
        # Add metadata
        result["timestamp"] = datetime.now().isoformat()
        result["query_received"] = query
        
        logger.info(f"Processed query: {query[:50]}...")
        logger.info(f"Jurisdiction: {result.get('jurisdiction_detected')}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing guidance request: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "status": "error"
        }), 500

# ============================================
# DOCUMENT ANALYSIS ENDPOINT
# ============================================

@app.route('/api/analyze-document', methods=['POST'])
def analyze_document():
    """
    Analyze a legal document
    Expected JSON: {
        "document_text": "string",
        "language": "english" or "amharic" (optional)
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'document_text' not in data:
            return jsonify({
                "error": "Missing document_text parameter",
                "status": "error"
            }), 400
        
        document_text = data['document_text']
        language = data.get('language')
        
        # Analyze document
        result = analyze_legal_document(document_text, language)
        
        # Add metadata
        result["timestamp"] = datetime.now().isoformat()
        result["document_length"] = len(document_text)
        
        logger.info(f"Analyzed document of length: {len(document_text)}")
        logger.info(f"Jurisdiction detected: {result.get('jurisdiction')}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing document analysis: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "status": "error"
        }), 500

# ============================================
# JURISDICTION DETECTION ENDPOINT
# ============================================

@app.route('/api/detect-jurisdiction', methods=['POST'])
def detect_jurisdiction():
    """
    Detect jurisdiction of a query
    Expected JSON: {
        "query": "string"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                "error": "Missing query parameter",
                "status": "error"
            }), 400
        
        query = data['query']
        
        # Detect jurisdiction
        jurisdiction, foreign_details, confidence, matches = detect_query_jurisdiction(query)
        
        # Also check if it's a legal query
        from ai_legal_filter import legal_filter
        is_legal, category = legal_filter.is_legal_query(query)
        
        result = {
            "jurisdiction": jurisdiction,
            "confidence": confidence,
            "matches": matches,
            "is_legal_query": is_legal,
            "legal_category": category if is_legal else None,
            "timestamp": datetime.now().isoformat()
        }
        
        if foreign_details:
            result["foreign_details"] = foreign_details
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error detecting jurisdiction: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "status": "error"
        }), 500

# ============================================
# CONSTITUTION SEARCH ENDPOINT
# ============================================

@app.route('/api/constitution/search', methods=['POST'])
def search_constitution_endpoint():
    """
    Search the Ethiopian Constitution
    Expected JSON: {
        "query": "string"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                "error": "Missing query parameter",
                "status": "error"
            }), 400
        
        query = data['query']
        
        # Search constitution
        results = search_constitution(query)
        
        return jsonify({
            "query": query,
            "results_count": len(results),
            "results": results,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error searching constitution: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "status": "error"
        }), 500

# ============================================
# GET CONSTITUTION ARTICLE ENDPOINT
# ============================================

@app.route('/api/constitution/article/<int:article_num>', methods=['GET'])
def get_article(article_num):
    """
    Get a specific constitution article
    """
    try:
        article = get_constitution_article(article_num)
        
        if article:
            return jsonify({
                "found": True,
                "article": article,
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "found": False,
                "message": f"Article {article_num} not found",
                "timestamp": datetime.now().isoformat()
            }), 404
            
    except Exception as e:
        logger.error(f"Error getting article: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "status": "error"
        }), 500

# ============================================
# GET LEGAL CODE REFERENCE ENDPOINT
# ============================================

@app.route('/api/legal-code/<code_name>', methods=['GET'])
def get_legal_code(code_name):
    """
    Get information about a specific legal code
    """
    try:
        code = get_legal_code_reference(code_name)
        
        if code:
            return jsonify({
                "found": True,
                "code": code,
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "found": False,
                "message": f"Legal code '{code_name}' not found",
                "available_codes": list(ETHIOPIAN_LEGAL_CODES.keys()),
                "timestamp": datetime.now().isoformat()
            }), 404
            
    except Exception as e:
        logger.error(f"Error getting legal code: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "status": "error"
        }), 500

# ============================================
# FOREIGN JURISDICTIONS LIST ENDPOINT
# ============================================

@app.route('/api/foreign-jurisdictions', methods=['GET'])
def list_foreign_jurisdictions():
    """
    List all foreign jurisdictions that can be detected
    """
    jurisdictions = []
    for code, data in FOREIGN_JURISDICTIONS.items():
        jurisdictions.append({
            "code": code,
            "name": data["name"],
            "legal_systems": data["legal_systems"],
            "constitution": data["constitution"]
        })
    
    return jsonify({
        "count": len(jurisdictions),
        "jurisdictions": jurisdictions,
        "timestamp": datetime.now().isoformat()
    })

# ============================================
# INTERNATIONAL LAW BODIES ENDPOINT
# ============================================

@app.route('/api/international-bodies', methods=['GET'])
def list_international_bodies():
    """
    List all international legal bodies that can be detected
    """
    bodies = []
    for code, data in INTERNATIONAL_LEGAL_BODIES.items():
        bodies.append({
            "code": f"intl_{code}",
            "name": data["name"],
            "keywords": data["keywords"][:3]  # Show first 3 keywords
        })
    
    return jsonify({
        "count": len(bodies),
        "bodies": bodies,
        "timestamp": datetime.now().isoformat()
    })

# ============================================
# DISCLAIMER ENDPOINT
# ============================================

@app.route('/api/disclaimer', methods=['GET'])
def get_disclaimer():
    """
    Get the disclaimer in both languages
    """
    return jsonify({
        "disclaimers": DISCLAIMERS,
        "timestamp": datetime.now().isoformat()
    })

# ============================================
# BATCH PROCESSING ENDPOINT
# ============================================

@app.route('/api/batch', methods=['POST'])
def batch_process():
    """
    Process multiple queries in one request
    Expected JSON: {
        "queries": ["query1", "query2", ...],
        "language": "english" or "amharic" (optional)
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'queries' not in data:
            return jsonify({
                "error": "Missing queries parameter",
                "status": "error"
            }), 400
        
        queries = data['queries']
        language = data.get('language')
        
        if not isinstance(queries, list) or len(queries) > 20:
            return jsonify({
                "error": "Queries must be a list with maximum 20 items",
                "status": "error"
            }), 400
        
        results = []
        for query in queries:
            result = filter_legal_query(query, language)
            results.append({
                "query": query,
                "result": result
            })
        
        return jsonify({
            "processed": len(results),
            "results": results,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in batch processing: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "status": "error"
        }), 500

# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        "error": "Endpoint not found",
        "status": "error",
        "timestamp": datetime.now().isoformat()
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({
        "error": "Method not allowed",
        "status": "error",
        "timestamp": datetime.now().isoformat()
    }), 405

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        "error": "Internal server error",
        "status": "error",
        "timestamp": datetime.now().isoformat()
    }), 500

# ============================================
# MAIN ENTRY POINT
# ============================================

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='AI Legal Filter Service')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5001, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    logger.info(f"Starting AI Legal Filter Service on {args.host}:{args.port}")
    logger.info(f"Debug mode: {args.debug}")
    logger.info(f"Ethiopian Constitution loaded: {len(ETHIOPIAN_CONSTITUTION['chapters'])} chapters")
    logger.info(f"Foreign jurisdictions: {len(FOREIGN_JURISDICTIONS)}")
    
    app.run(host=args.host, port=args.port, debug=args.debug)