const axios = require('axios');

/**
 * Service to interact with OpenRouter API
 */
class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
  }

  /**
   * Generates creative content using OpenRouter
   * @param {Object} params 
   * @param {string} params.prompt 
   * @param {string} [params.model="google/gemini-2.0-flash-001"] 
   */
  /**
   * Generates creative content using OpenRouter
   * @param {Object} params 
   * @param {string} params.prompt 
   * @param {string} [params.model="google/gemini-2.0-flash-001"] 
   */
  async generateCreative({ prompt, model = 'google/gemini-2.0-flash-001' }) {
    // 1. Model Restriction - Task 2
    const APPROVED_MODELS = ['google/gemini-2.0-flash-001'];
    if (!APPROVED_MODELS.includes(model)) {
      throw new Error(`Model ${model} is not authorized for this action`);
    }

    if (!this.apiKey || this.apiKey === 'YOUR_OPENROUTER_API_KEY') {
      throw new Error('AI service configuration missing');
    }

    const maxRetries = 1;
    let attempt = 0;

    const executeRequest = async () => {
      try {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert marketing creative assistant. Generate compelling ad copy based on the user prompt.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            // 2. Cost Control - Task 2
            max_tokens: 300,
            temperature: 0.7
          },
          {
            timeout: 15000,
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'HTTP-Referer': 'https://growthhub.ai',
              'X-Title': 'GrowthHub OS',
              'Content-Type': 'application/json'
            }
          }
        );

        const content = response.data.choices?.[0]?.message?.content;

        // 5. Response Validation - Task 5
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          throw new Error('AI returned an empty response');
        }

        return content;
      } catch (error) {
        // 3. Retry Strategy - Task 3
        if (attempt < maxRetries && error.code !== 'ECONNABORTED' && (!error.response || error.response.status >= 500)) {
          attempt++;
          console.warn(`[OpenRouter] Retry attempt ${attempt} for org...`);
          return executeRequest();
        }

        if (error.code === 'ECONNABORTED') {
          console.error('[OpenRouter] Generation timed out after 15s');
          throw new Error('AI generation timed out');
        }
        
        const status = error.response?.status;
        console.error(`[OpenRouter] API Error (${status || 'Unknown'}):`, JSON.stringify(error.response?.data || error.message));
        
        throw new Error(error.message || 'AI service is temporarily unavailable');
      }
    };

    return executeRequest();
  }
}

module.exports = new OpenRouterService();
