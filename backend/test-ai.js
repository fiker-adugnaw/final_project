require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

async function testGemini() {
    console.log('--- Testing Gemini ---');
    console.log('API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'MISSING');
    if (!process.env.GEMINI_API_KEY) return;

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        console.log('Fetching list of models authorized for this key...');
        // We need to use the genAI.listModels() method
        // Note: Some SDK versions use genAI.getGenerativeModel().listModels()
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        
        if (data.models) {
            console.log('\nAvailable Models:');
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(` - ${m.name.replace('models/', '')}`);
                }
            });
        } else {
            console.log('No models found. Error:', JSON.stringify(data));
        }

        const modelName = process.env.GEMINI_MODEL || 'gemini-pro';
        console.log(`\nTrying to use: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        console.log('Response Success!');
    } catch (err) {
        console.error('Gemini Error:', err.message);
    }
}

async function testOpenAI() {
    console.log('\n--- Testing OpenAI ---');
    console.log('API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'MISSING');
    if (!process.env.OPENAI_API_KEY) return;

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [{ role: 'user', content: "Hello, respond with 'OpenAI is working'" }],
        });
        console.log('Response:', response.choices[0].message.content);
    } catch (err) {
        console.error('OpenAI Error:', err.message);
    }
}

async function runTests() {
    await testGemini();
    await testOpenAI();
}

runTests();
