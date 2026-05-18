/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function analyzeClothingImage(base64Image: string) {
  try {
    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze image');
    }
    
    return await response.json();
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
}

export async function getWardrobeInsights(wardrobe: any[], language: string, isModest: boolean, gender: string) {
  try {
    const response = await fetch('/api/gemini/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wardrobe, language, isModest, gender })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get insights');
    }
    
    return await response.json();
  } catch (error) {
    console.error("AI Insights Error:", error);
    throw error;
  }
}

export async function getStylingAdvice(context: { messages: any[], wardrobe: any[], isModest: boolean, gender: string }) {
  try {
    const response = await fetch('/api/gemini/styling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get styling advice');
    }
    
    return await response.json();
} catch (error) {
    console.error("AI Styling Error:", error);
    throw error;
  }
}
