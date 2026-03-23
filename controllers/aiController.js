import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Controller for AI Chat completion using NVIDIA API
 */
export const chatWithAI = async (req, res) => {
    try {
        const { messages, userPreferences } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ success: false, message: "Messages array is required" });
        }

        const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
        const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "qwen/qwen3.5-122b-a10b";

        if (!NVIDIA_API_KEY || NVIDIA_API_KEY === 'nvapi-XXXXXX') {
            return res.status(500).json({ 
                success: false, 
                message: "NVIDIA API Key not configured. Please add it to .env" 
            });
        }

        // Create a preference-aware string for the AI context
        let preferencesContext = "";
        if (userPreferences) {
            preferencesContext = `\n\nUSER PROFILE CONTEXT (Use this for personalized advice):
            - Preferred Genres: ${userPreferences.genres?.join(', ') || 'Not specified'}
            - Preferred Languages: ${userPreferences.languages?.join(', ') || 'Not specified'}
            - Preferred Experience: ${userPreferences.experience?.join(', ') || 'Not specified'}
            - Preferred Show Timings: ${userPreferences.showTimings?.join(', ') || 'Not specified'}
            - Usually watches with: ${userPreferences.watchWith || 'Not specified'}
            - Priority Factors: ${userPreferences.priorityFactors?.join(', ') || 'Not specified'}
            - Genres to Avoid: ${userPreferences.avoidGenres?.join(', ') || 'None specified'}`;
        }

        // System prompt to keep the AI focused on movie booking context
        const systemPrompt = {
            role: "system",
            content: `You are CineVerse Assistant, a premium and helpful movie expert for our movie booking platform. 
            Your goals:
            1. Recommend movies based on mood, genre, or occasion (date night, family, etc.).
            2. Explain various movie genres and cinematic experiences.
            3. Help users with platform-related guidance (booking flow, finding showtimes).
            4. Keep responses concise, friendly, and professional.
            5. Avoid talking about non-movie related topics unless it's polite small talk.
            6. If you don't know something specific about a local cinema, provide general helpful guidance.
            ${preferencesContext}`
        };


        // Combine system prompt with user messages
        const data = {
            model: NVIDIA_MODEL,
            messages: [systemPrompt, ...messages],
            max_tokens: 1000,
            temperature: 0.6,
            top_p: 0.95,
            stream: false
        };

        const response = await axios.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            data,
            {
                headers: {
                    "Authorization": `Bearer ${NVIDIA_API_KEY}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            }
        );

        const aiMessage = response.data.choices[0].message;

        return res.status(200).json({
            success: true,
            data: aiMessage
        });

    } catch (err) {
        console.error("AI Chat Error:", err.response?.data || err.message);
        return res.status(err.response?.status || 500).json({
            success: false,
            message: "Failed to get AI response. Please try again later.",
            error: err.response?.data || err.message
        });
    }
};
