const AIResponse = require('../models/AIResponse');

/**
 * AI Service
 * Handles all AI-powered legal assistance features for the platform.
 *
 * Key responsibilities:
 *  1. Process legal queries via Google Gemini / OpenAI
 *  2. Enforce Ethiopian jurisdiction filtering (CRITICAL compliance requirement)
 *  3. Detect and flag non-Ethiopian legal references
 *  4. Enforce bilingual support (Amharic / English)
 *  5. Persist all Q&A sessions in AIResponse for audit
 */

// ─── AI Client Setup ───────────────────────────────────────────────────────────

let geminiClient = null;
let openaiClient = null;

const getGeminiClient = () => {
    if (geminiClient) return geminiClient;

    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiClient = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
        return geminiClient;
    } catch (err) {
        console.warn('[AIService] @google/generative-ai not installed:', err.message);
        return null;
    }
};

const getOpenAIClient = () => {
    if (openaiClient) return openaiClient;

    if (!process.env.OPENAI_API_KEY) return null;

    try {
        const OpenAI = require('openai');
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        return openaiClient;
    } catch (err) {
        console.warn('[AIService] openai package not installed:', err.message);
        return null;
    }
};

let freeAIClient = null;
const getFreeAIClient = () => {
    if (freeAIClient) return freeAIClient;

    if (!process.env.FREE_AI_API_KEY) return null;

    try {
        const OpenAI = require('openai');
        freeAIClient = new OpenAI({
            apiKey: process.env.FREE_AI_API_KEY,
            baseURL: process.env.FREE_AI_BASE_URL || 'https://aiapiv2.pekpik.com/v1'
        });
        return freeAIClient;
    } catch (err) {
        console.warn('[AIService] Free AI client init failed:', err.message);
        return null;
    }
};

// ─── Language Detection ────────────────────────────────────────────────────────

/**
 * Detect whether the query is in Amharic or English.
 * Uses Unicode range for Ethiopic script (U+1200–U+137F).
 */
const detectLanguage = (text) => {
    const amharicChars = (text.match(/[\u1200-\u137F]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length || 1;
    return amharicChars / totalChars > 0.1 ? 'Amharic' : 'English';
};

// ─── Translation Helpers (LLM-powered) ─────────────────────────────────────────

/**
 * Translate text from Amharic to English.
 */
const translateToEnglish = async (text) => {
    const model = getGeminiClient();
    if (!model) return text;

    const prompt = `Translate the following Amharic text to English. Respond ONLY with the translation.\n\nText: ${text}`;
    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (err) {
        console.error('[AIService] Translation to English failed:', err.message);
        return text;
    }
};

/**
 * Translate text from English to Amharic.
 */
const translateToAmharic = async (text) => {
    const model = getGeminiClient();
    if (!model) return text;

    const prompt = `Translate the following English legal information to Amharic. Maintain legal accuracy and use formal Amharic.\n\nText: ${text}`;
    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (err) {
        console.error('[AIService] Translation to Amharic failed:', err.message);
        return text;
    }
};

// ─── Jurisdiction Analysis ─────────────────────────────────────────────────────

const FOREIGN_JURISDICTION_MARKERS = {
    USA: ['us law', 'american law', 'federal law', 'supreme court usa', 'united states constitution', '14th amendment'],
    UK: ['uk law', 'british law', 'english common law', 'house of lords', 'parliament uk'],
    Kenya: ['kenyan law', 'kenya constitution', 'kenya court'],
    SouthAfrica: ['sa law', 'south african constitution', 'constitutional court sa'],
    EU: ['eu law', 'european union law', 'echr', 'european court of human rights'],
    UN: ['un resolution', 'united nations', 'icc', 'international criminal court'],
    Generic: ['foreign law', 'international law', 'comparative law']
};

const ETHIOPIAN_LAW_MARKERS = [
    'ethiopian law', 'ethiopia', 'ethiopian constitution', 'fdre', 'proclamation',
    'ethiopian civil code', 'ethiopian criminal code', 'ethiopian family law',
    'human rights', 'ሰብአዊ መብቶች', 'addis ababa', 'federal high court',
    'cassation division', 'regional court', 'kebele', 'woreda', 'አዋጅ',
    'ህገ-መንግስት', 'ፍርድ ቤት', 'ህጉ', 'ፌዴራላዊ', 'ethiopia penal code',
    'commercial code', 'labour proclamation'
];

/**
 * Analyze a text for jurisdiction references.
 * Proxies to Python service for advanced detection.
 */
const analyzeJurisdiction = async (text) => {
    const pythonUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5001';

    try {
        const response = await fetch(`${pythonUrl}/api/detect-jurisdiction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text })
        });

        if (response.ok) {
            const result = await response.json();
            return {
                jurisdictionDetected: result.jurisdiction,
                foreignJurisdictions: result.foreign_details || [],
                confidence: result.confidence,
                isLegal: result.is_legal_query
            };
        }
    } catch (err) {
        console.warn('[AIService] Python jurisdiction detection failed, using local fallback:', err.message);
    }

    // Local Fallback logic (optimized)
    const lowerText = text.toLowerCase();
    let ethiopianScore = 0;
    let foreignScore = 0;
    const detectedForeignJurisdictions = [];

    ETHIOPIAN_LAW_MARKERS.forEach(marker => {
        if (lowerText.includes(marker.toLowerCase())) ethiopianScore++;
    });

    for (const [country, markers] of Object.entries(FOREIGN_JURISDICTION_MARKERS)) {
        const matched = markers.filter(m => lowerText.includes(m.toLowerCase()));
        if (matched.length > 0) {
            foreignScore += matched.length;
            detectedForeignJurisdictions.push({
                country,
                relevance: matched.length > 2 ? 'PRIMARY' : 'SECONDARY'
            });
        }
    }

    let jurisdictionDetected = 'UNKNOWN';
    if (ethiopianScore > 0 && foreignScore === 0) jurisdictionDetected = 'ETHIOPIAN';
    else if (foreignScore > 0) jurisdictionDetected = 'FOREIGN';

    return {
        jurisdictionDetected,
        foreignJurisdictions: detectedForeignJurisdictions,
        ethiopianScore,
        foreignScore,
        confidence: 0.5
    };
};

// ─── Legal Query Classifier ────────────────────────────────────────────────────

const NON_LEGAL_KEYWORDS = [
    'recipe', 'cooking', 'football', 'soccer', 'movie', 'music', 'celebrity',
    'weather', 'sports', 'fashion', 'travel', 'joke', 'entertainment',
    'ምርጥ ምግብ', 'ስፖርት', 'ፊልም'
];

const isLegalQuery = async (text) => {
    // 1. Check local non-legal keywords first (fast)
    const lowerText = text.toLowerCase();
    const nonLegalMatch = NON_LEGAL_KEYWORDS.find(kw => lowerText.includes(kw));
    if (nonLegalMatch) {
        return { isLegal: false, reason: `Non-legal topic detected: "${nonLegalMatch}"` };
    }

    // 2. LLM-based classification (accurate)
    const model = getGeminiClient();
    if (model) {
        const prompt = `Classify if the following query is related to Ethiopian law (Contracts, Property, Family, Employment, Criminal, etc.). 
        Respond with "LEGAL" if it is, or "NON-LEGAL" if it is about general topics, greetings, jokes, etc.
        Respond with ONLY one word.
        
        Query: ${text}`;

        try {
            const result = await model.generateContent(prompt);
            const classification = result.response.text().trim().toUpperCase();
            if (classification === 'NON-LEGAL') {
                return { isLegal: false, reason: 'LLM classification: Non-legal' };
            }
            return { isLegal: true, category: 'detected' };
        } catch (err) {
            console.warn('[AIService] LLM classification failed, falling back to rule-based.');
        }
    }

    // 3. Rule-based proxy (backup)
    const pythonUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5001';
    try {
        const response = await fetch(`${pythonUrl}/api/detect-jurisdiction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text })
        });

        if (response.ok) {
            const result = await response.json();
            return {
                isLegal: result.is_legal_query,
                category: result.legal_category
            };
        }
    } catch (err) {
        console.warn('[AIService] Python legal filter unreachable. Falling back to keyword detection.');
    }

    // Keyword-based fallback for classification if Python service is down
    const legalKeywords = [
        'law', 'legal', 'court', 'judge', 'lawyer', 'attorney', 'divorce', 'criminal', 'crime', 'civil',
        'contract', 'inheritance', 'property', 'employment', 'labour', 'proclamation', 'constitution',
        'rights', 'advice', 'advisory', 'case', 'sue', 'lawsuit', 'arbitration', 'mediation',
        'ህግ', 'ጠበቃ', 'ፍርድ', 'ክስ', 'ፍቺ', 'ወንጀል', 'ውል', 'ውርስ', 'ቅጥር'
    ];

    const isLegal = legalKeywords.some(kw => text.toLowerCase().includes(kw));

    return { isLegal };
};

/**
 * Analyze a legal document for compliance and jurisdiction.
 * Proxies to Python service specialized analyzer.
 */
const analyzeDocument = async (documentText, user) => {
    const pythonUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5001';

    try {
        const response = await fetch(`${pythonUrl}/api/analyze-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                document_text: documentText,
                user_id: user._id.toString()
            })
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (err) {
        console.warn('[AIService] Python document analysis failed, falling back to query simulation:', err.message);
    }

    // Fallback: Simulate via processLegalQuery
    const query = `Analyze this legal document text: ${documentText.substring(0, 2000)}`;
    return await processLegalQuery(query, user);
};

// ─── System Prompt Builder ─────────────────────────────────────────────────────

const buildSystemPrompt = (queryLanguage) => `
You are EthioLegal Assistant, an advanced AI legal expert specialized EXCLUSIVELY in Ethiopian Law and legal procedures.

## YOUR MISSION
Your primary goal is to provide accurate, helpful, and concise legal information, guidance, and court-related advisory for Ethiopian cases.

## STRICT GUIDELINES
1. ONLY answer questions related to:
    - Ethiopian Law (Proclamations, Codes, Regulations).
    - Court procedures and litigation in Ethiopia.
    - Legal rights, obligations, and advisory.
    - Contractual, family, criminal, labour, and property matters in Ethiopia.
2. If a user asks a non-legal question (e.g., about science, entertainment, history unrelated to law, or general conversation), you MUST politely refuse.
    - Response format: "I am a dedicated legal assistant for Ethiopian law. I can only assist with legal, court, or legal advisory cases. Please ask a legal question."
3. ALWAYS prioritize the FDRE Constitution (1995) and relevant Ethiopian Proclamations.
4. Reference specific Ethiopian laws, articles, and codes whenever possible to maintain high authority.
5. Support both Amharic and English based on the user's preference.
6. ALWAYS end legal guidance with a clear disclaimer: "⚠️ Disclaimer: This is general legal information and does not constitute official legal advice. Consult a licensed lawyer for your specific case."

Current Query Language: ${queryLanguage}
`.trim();

// ─── Generate Response via Gemini ──────────────────────────────────────────────

const generateViaGemini = async (query, queryLanguage) => {
    const model = getGeminiClient();
    if (!model) throw new Error('Gemini not available');

    const systemPrompt = buildSystemPrompt(queryLanguage);
    const fullPrompt = `${systemPrompt}\n\nUser Query: ${query}`;

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    return {
        responseText,
        modelUsed: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        provider: 'gemini'
    };
};
// ─── Generate Response via OpenAI ──────────────────────────────────────────────

const generateViaOpenAI = async (query, queryLanguage) => {
    const client = getOpenAIClient();
    if (!client) throw new Error('OpenAI not available');

    const systemPrompt = buildSystemPrompt(queryLanguage);

    const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ],
        max_tokens: 2000,
        temperature: 0.3
    });

    return {
        responseText: response.choices[0].message.content,
        modelUsed: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        provider: 'openai'
    };
};

// ─── Generate Response via Free Proxy AI ───────────────────────────────────────

const generateViaFreeAI = async (query, queryLanguage) => {
    const client = getFreeAIClient();
    if (!client) throw new Error('Free AI Proxy not available');

    const systemPrompt = buildSystemPrompt(queryLanguage);

    const response = await client.chat.completions.create({
        model: process.env.FREE_AI_MODEL || 'smart-chat',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ],
        max_tokens: 2000,
        temperature: 0.3
    });

    return {
        responseText: response.choices[0].message.content,
        modelUsed: process.env.FREE_AI_MODEL || 'smart-chat',
        provider: 'free-proxy'
    };
};

// ─── Generate Response via Python AI Service ───────────────────────────────────

/**
 * Fallback to the specialized Python Legal Filter service
 */
const generateViaPythonService = async (query, language) => {
    const pythonUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5001';
    try {
        const response = await fetch(`${pythonUrl}/api/guidance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, language: language.toLowerCase() })
        });

        if (response.ok) {
            const result = await response.json();
            return {
                responseText: result.response,
                modelUsed: 'python-legal-filter-v1',
                provider: 'python-service'
            };
        }
    } catch (err) {
        console.warn('[AIService] Python guidance service failed:', err.message);
    }
    return null;
};

// ─── Mock Fallback (Testing / No API Key) ─────────────────────────────────────

const generateMockResponse = async (query, queryLanguage) => {
    const isAmharic = queryLanguage === 'Amharic';
    const { isLegal } = await isLegalQuery(query);
    const lowerQuery = query.toLowerCase();

    let responseText;
    if (!isLegal) {
        responseText = isAmharic
            ? "እኔ የህግ ረዳት ነኝ እና ከኢትዮጵያ ህግ ጋር በተያያዙ ጥያቄዎች ላይ ብቻ መርዳት እችላለሁ። እባክዎ የህግ ጥያቄ ይጠይቁ።"
            : "I am a legal assistant and can only answer questions related to Ethiopian law and legal procedures. Please ask a legal question, such as: 'How do I file for divorce?' or 'What are my rights as a tenant?'";
    } else {
        // Topic-specific detailed mock responses (to avoid generic placeholders)
        if (lowerQuery.includes('divorce') || lowerQuery.includes('ፍቺ')) {
            responseText = isAmharic
                ? `ስለ ፍቺ (Divorce) በኢትዮጵያ ህግ፡\n\nበኢትዮጵያ በተሻሻለው የቤተሰብ ህግ (አዋጅ ቁጥር 213/1992) መሰረት ፍቺ በሚከተሉት ምክንያቶች ሊፈጸም ይችላል፡\n1. በሁለቱም ተጋቢዎች ስምምነት\n2. አንዱ ተጋቢ በሌላው ላይ በሚያቀርበው የፍቺ ጥያቄ (ለምሳሌ፡ አለመስማማት፣ ጥቆማ፣ ወዘተ)\n\nየፍቺ ሂደት በቤተሰብ ምክር ቤት ወይም በፍርድ ቤት በኩል ያልፋል። ለዝርዝር መረጃ እባክዎን በድረ-ገጻችን ላይ ካሉ ጠበቆች ጋር ይማከሩ።`
                : `Regarding Divorce in Ethiopia:\n\nUnder the Revised Family Code of Ethiopia (Proclamation No. 213/2000), divorce can be granted on the following grounds:\n1. Mutual consent of both spouses.\n2. Petition by one spouse based on fault or irreconcilable differences.\n\nThe process typically involves a cooling-off period and attempts at mediation by a family arbitrator before a court decree is issued. For specific guidance on your case, please consult a verified lawyer on our platform.`;
        } else if (lowerQuery.includes('employment') || lowerQuery.includes('labour') || lowerQuery.includes('የስራ') || lowerQuery.includes('ቅጥር')) {
            responseText = isAmharic
                ? `ስለ ስራ ህግ (Labour Law) በኢትዮጵያ፡\n\nበኢትዮጵያ የስራተኛና ማህበራዊ ጉዳይ አዋጅ ቁጥር 1156/2011 መሰረት የስራ ውል ሊቋረጥ የሚችለው በህጉ በተቀመጡ ምክንያቶች ብቻ ነው። ለምሳሌ፡ የስራ ብቃት ማነስ፣ የዲስፕሊን ግድፈት፣ ወይም በድርጅቱ የስራ መቀነስ ምክንያት ሊሆን ይችላል።`
                : `Regarding Labour Law in Ethiopia:\n\nUnder the Labour Proclamation No. 1156/2019, employment contracts can be terminated based on specific legal grounds such as misconduct, incapacity, or organizational structural changes (redundancy). Employees are often entitled to notice periods and severance pay depending on their length of service.`;
        } else if (lowerQuery.includes('criminal') || lowerQuery.includes('crime') || lowerQuery.includes('ወንጀል') || lowerQuery.includes('ፖሊስ')) {
            responseText = isAmharic
                ? `ስለ ወንጀል ጉዳይ (Criminal Law) በኢትዮጵያ፡\n\nበኢትዮጵያ የወንጀል ህግ (2004) መሰረት የወንጀል ክስ የሚመሰረተው በፖሊስ ምርመራ ተጀምሮ በዐቃቤ ህግ አማካኝነት ነው። አንድ ሰው ወንጀል ተፈጽሞብኛል ብሎ ካመነ በአቅራቢያው ለሚገኝ ፖሊስ ጣቢያ ማመልከት አለበት። ፖሊስ ምርመራውን አጠናቆ ለዐቃቤ ህግ ካቀረበ በኋላ ክስ ይመሰረታል።`
                : `Regarding Criminal Law in Ethiopia:\n\nUnder the Ethiopian Criminal Code (2004), criminal proceedings typically begin with a police report (First Information Report). If you are a victim of a crime, you should report the matter to the nearest police station. The police will investigate and, if sufficient evidence is found, the Public Prosecutor will file a formal charge in court. For cases involving private complaints, the process may differ slightly.`;
        } else if (lowerQuery.includes('property') || lowerQuery.includes('land') || lowerQuery.includes('house') || lowerQuery.includes('ቤት') || lowerQuery.includes('መሬት')) {
            responseText = isAmharic
                ? `ስለ ንብረት ህግ (Property Law) በኢትዮጵያ፡\n\nበኢትዮጵያ ህገ-መንግስት መሰረት የመሬት ባለቤትነት የመንግስትና የህዝብ ብቻ ነው። ዜጎች በመሬት ላይ የመጠቀም መብት (Possessory rights) አላቸው። የቤት ባለቤትነት ግን በግል ሊያዝ ይችላል። ማንኛውም የቤት ሽያጭ ወይም ዝውውር በሰነዶች ማረጋገጫና ምዝገባ ኤጀንሲ (LRA) መመዝገብ አለበት።`
                : `Regarding Property Law in Ethiopia:\n\nAccording to the FDRE Constitution, land ownership is vested in the State and the people; citizens have possessory/usage rights. However, private ownership of buildings and houses is recognized. Any transfer of immovable property (like a house) must be made in writing and registered with the relevant government authority (e.g., Land Management Bureau or LRA) to be legally binding.`;
        } else if (lowerQuery.includes('inheritance') || lowerQuery.includes('will') || lowerQuery.includes('ውርስ') || lowerQuery.includes('ኑዛዜ')) {
            responseText = isAmharic
                ? `ስለ ውርስ ህግ (Inheritance Law) በኢትዮጵያ፡\n\nበኢትዮጵያ የፍትሐ ብሔር ህግ መሰረት ውርስ በኑዛዜ (Will) ወይም ያለኑዛዜ (Intestate) ሊከናወን ይችላል። ኑዛዜ በጽሁፍ ወይም በቃል ሊሆን ይችላል (ምንም እንኳን የጽሁፍ ኑዛዜ ይበልጥ ተመራጭ ቢሆንም)። ያለኑዛዜ የሚከናወን ውርስ በህጉ በተቀመጠው የዝምድና ተዋረድ መሰረት ይፈጸማል።`
                : `Regarding Inheritance Law in Ethiopia:\n\nUnder the Ethiopian Civil Code, succession can be testate (by a will) or intestate (without a will). A will can be public, holograph (handwritten), or oral (under specific conditions). In the absence of a will, the estate is distributed among legal heirs according to the order of relationship specified in the Civil Code, starting with children and the surviving spouse.`;
        } else {
            // Default Fallback
            responseText = isAmharic
                ? `ለጥያቄዎ "${query.substring(0, 50)}..." ምላሽ:\n\nይህ ጉዳይ በኢትዮጵያ ህግ (ለምሳሌ፡ የፍትሐ ብሔር ህግ ወይም የወንጀል ህግ) ስር የሚመራ ነው። ለዝርዝር እና ህጋዊ ምክር ከተረጋገጠ ጠበቃ ጋር ይማከሩ።`
                : `Regarding your query: "${query.substring(0, 50)}..."\n\nThis matter is regulated under Ethiopian legal provisions (such as the Civil Code or Criminal Code). Since I am currently operating in a limited capacity, I recommend consulting a verified lawyer on our platform for a detailed analysis of your specific case.`;
        }

        // Add standard disclaimer
        const disclaimer = isAmharic
            ? "\n\n⚠️ ማሳሰቢያ: ይህ አጠቃላይ የህግ መረጃ ብቻ ነው እንጂ የህግ ምክር አይደለም።"
            : "\n\n⚠️ Disclaimer: This is general legal information only and does not constitute legal advice. Please consult a licensed lawyer for your specific case.";
        responseText += disclaimer;
    }

    return {
        responseText,
        modelUsed: 'mock-ethio-legal-v1-enriched',
        provider: 'mock'
    };
};

// ─── Main: Process Legal Query ─────────────────────────────────────────────────

/**
 * Process a legal query from a user.
 * Shifts intelligence to Python service while maintaining Node.js persistence.
 */
const processLegalQuery = async (query, user, req = null) => {
    const startTime = Date.now();
    const originalLanguage = detectLanguage(query);
    let workingQuery = query;

    // Phase 1: Language Normalization (Translate to English if Amharic)
    if (originalLanguage === 'Amharic') {
        console.log('[AIService] Amharic detected. Translating to English...');
        workingQuery = await translateToEnglish(query);
    }

    // Phase 2: Classification Layer
    const classification = await isLegalQuery(workingQuery);
    if (!classification.isLegal) {
        console.log('[AIService] Non-legal query blocked:', workingQuery);
        return await AIResponse.create({
            userId: user._id,
            query: query,
            queryLanguage: originalLanguage,
            response: originalLanguage === 'Amharic'
                ? "ይቅርታ፣ እኔ የምሰጠው አጠቃላይ የህግ መረጃ ብቻ ነው። እባክዎን የህግ ጥያቄ ይጠይቁ።"
                : "Sorry, I only provide general legal information. Please ask a legal question.",
            responseLanguage: originalLanguage,
            isLegalQuery: false,
            modelUsed: 'classifier-v1'
        });
    }

    let responseText;
    let modelUsed = 'ethio-legal-ai-v1';

    // Phase 3: AI Legal Engine (Multi-stage fallback pipeline)
    try {
        // Stage 1: Try Google Gemini (Primary)
        console.log('[AIService] Attempting generation via Gemini...');
        const aiResult = await generateViaGemini(workingQuery, 'English');
        responseText = aiResult.responseText;
        modelUsed = aiResult.modelUsed;
    } catch (err) {
        console.warn('[AIService] Gemini failed, attempting OpenAI fallback...');
        try {
            // Stage 2: Try OpenAI (Secondary)
            const aiResult = await generateViaOpenAI(workingQuery, 'English');
            responseText = aiResult.responseText;
            modelUsed = aiResult.modelUsed;
        } catch (err2) {
            console.warn('[AIService] OpenAI failed, attempting Free Proxy fallback...');
            try {
                // Stage 3: Try Free Proxy AI (Tertiary - from GitHub community)
                const aiResult = await generateViaFreeAI(workingQuery, 'English');
                responseText = aiResult.responseText;
                modelUsed = aiResult.modelUsed;
            } catch (err3) {
                console.warn('[AIService] Free Proxy failed, attempting Python service fallback...');
                try {
                    // Stage 4: Try Python AI Service (Specialized rules/constitution)
                    const pythonResult = await generateViaPythonService(workingQuery, 'English');
                    if (pythonResult) {
                        responseText = pythonResult.responseText;
                        modelUsed = pythonResult.modelUsed;
                    } else {
                        throw new Error('Python service returned no result');
                    }
                } catch (err4) {
                    console.warn('[AIService] All AI engines failed, using enriched mock fallback.');
                    // Stage 5: Enriched Mock Fallback
                    const mock = await generateMockResponse(workingQuery, 'English');
                    responseText = mock.responseText;
                    modelUsed = mock.modelUsed;
                }
            }
        }
    }

    // Phase 4: Output Normalization (Translate back to Amharic if needed)
    if (originalLanguage === 'Amharic') {
        console.log('[AIService] Translating response back to Amharic...');
        responseText = await translateToAmharic(responseText);
    }

    const processingTime = Date.now() - startTime;

    // Phase 5: Legal & Compliance Analysis
    // Call the jurisdiction analysis (which handles Python bridge + Local Fallback)
    const jurisdictionAnalysis = await analyzeJurisdiction(workingQuery);
    const jurisdictionDetected = jurisdictionAnalysis.jurisdictionDetected || 'UNKNOWN';
    const foreignJurisdictions = jurisdictionAnalysis.foreignJurisdictions || [];

    // Decide if we need a warning (e.g. if foreign law was detected)
    const requiresWarning = jurisdictionDetected === 'FOREIGN' || (foreignJurisdictions.length > 0);
    const warningType = requiresWarning ? 'FOREIGN_JURISDICTION' : undefined;
    const warningMessage = requiresWarning
        ? (originalLanguage === 'Amharic'
            ? "ማሳሰቢያ: ጥያቄዎ የውጭ አገር ህጎችን ሊያካትት ይችላል። ይህ አገልግሎት በኢትዮጵያ ህግ ላይ ያተኩራል።"
            : "Warning: Your query may involve foreign jurisdictions. This service focuses on Ethiopian law.")
        : undefined;

    // Phase 6: Persist interaction for audit
    const validLanguage = (originalLanguage === 'Amharic' || originalLanguage === 'English') ? originalLanguage : 'English';

    const aiResponseDoc = await AIResponse.create({
        userId: user._id,
        query: query || 'Empty Query',
        queryLanguage: validLanguage,
        response: responseText || 'System: No response generated.',
        responseLanguage: validLanguage,
        jurisdictionDetected: jurisdictionDetected,
        foreignJurisdictions: foreignJurisdictions,
        confidence: jurisdictionDetected === 'ETHIOPIAN' ? 0.9 : 0.4,
        modelUsed: modelUsed || 'fallback-logic',
        processingTime: processingTime,
        requiresWarning,
        warningType,
        warningMessage,
        ipAddress: req?.ip || '127.0.0.1',
        userAgent: req?.get('User-Agent') || 'Unknown'
    });

    return aiResponseDoc;
};

// ─── Conversation History ──────────────────────────────────────────────────────

/**
 * Get the AI conversation history for a user (paginated)
 */
const getConversationHistory = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [responses, total] = await Promise.all([
        AIResponse.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('responseId query response queryLanguage jurisdictionDetected requiresWarning warningMessage processingTime createdAt'),
        AIResponse.countDocuments({ userId })
    ]);

    return {
        responses,
        total,
        page,
        pages: Math.ceil(total / limit)
    };
};

// ─── User Feedback ─────────────────────────────────────────────────────────────

/**
 * Submit user rating/feedback on an AI response
 */
const submitFeedback = async (responseId, userId, rating, feedback) => {
    const aiResponse = await AIResponse.findOne({ responseId });
    if (!aiResponse) throw new Error('AI response not found');
    if (aiResponse.userId.toString() !== userId.toString()) throw new Error('Unauthorized');

    aiResponse.userRating = rating;
    aiResponse.userFeedback = feedback;
    await aiResponse.save();

    return aiResponse;
};

// ─── Analytics ─────────────────────────────────────────────────────────────────

/**
 * Get AI usage statistics for admin dashboard
 */
const getAIStats = async (days = 30) => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalQueries, jurisdictionStats, languageStats, avgRating] = await Promise.all([
        AIResponse.countDocuments({ createdAt: { $gte: since } }),
        AIResponse.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$jurisdictionDetected', count: { $sum: 1 } } }
        ]),
        AIResponse.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$queryLanguage', count: { $sum: 1 } } }
        ]),
        AIResponse.aggregate([
            { $match: { userRating: { $exists: true }, createdAt: { $gte: since } } },
            { $group: { _id: null, avg: { $avg: '$userRating' } } }
        ])
    ]);

    return {
        totalQueries,
        jurisdictionStats,
        languageStats,
        averageRating: avgRating[0]?.avg || null,
        since
    };
};

/**
 * Get daily query counts for trend charts
 */
const getDailyQueryTrend = async (days = 30) => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return AIResponse.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
};

module.exports = {
    // Core
    processLegalQuery,

    // User-facing
    getConversationHistory,
    submitFeedback,

    // Analytics (admin)
    getAIStats,
    getDailyQueryTrend,

    // Utilities
    detectLanguage,
    analyzeJurisdiction,
    isLegalQuery,
    analyzeDocument
};
