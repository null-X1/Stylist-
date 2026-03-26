const GEMINI_API_KEY = "AIzaSyB3N4PW5mpQgK6nYeZdA4NavqzrviZpXEI";

async function fetchWithRetry(url, options, retries = 3) {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

function extractJSON(text) {
  if (!text) return null;
  try {
    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIdx = cleanText.search(/[\{\[]/);
    const endIdx = cleanText.search(/[\}\]][^}\]]*$/);
    if (startIdx !== -1 && endIdx !== -1) cleanText = cleanText.substring(startIdx, endIdx + 1);
    return JSON.parse(cleanText);
  } catch (e) { return null; }
}

export async function analyzeImageWithAI(base64Image) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const base64Data = base64Image.split(',')[1];
  const prompt = `You are a STRICT fashion analyzer. Does it contain CLEAR clothing items? If not, return []. Extract: [{"type":"...","color":"#HEXCODE","season":"all|summer|winter","targetGender":"male|female|unisex"}]`;
  const payload = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: base64Image.startsWith('data:image/png') ? "image/png" : "image/jpeg", data: base64Data } }] }],
    generationConfig: { responseMimeType: "application/json" }
  };
  try {
    const data = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    let result = extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
    if (!result) return [];
    return Array.isArray(result) ? result.filter(i=>i.type) : [result];
  } catch (error) { return null; }
}

export async function suggestOutfitWithAI(clothes, chatHistory, profile) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const cleanWardrobe = clothes.filter(c => !c.inLaundry && (c.targetGender === 'unisex' || c.targetGender === profile.gender || !c.targetGender));
  const wardrobeData = cleanWardrobe.map(c => ({ id: c.id, type: c.type, color: c.color, season: c.season }));
  const systemPrompt = `You are a professional fashion stylist. Available Wardrobe: ${JSON.stringify(wardrobeData)} Gender: ${profile.gender === 'female' ? "Female" : "Male"} Return JSON: { "outfit": { "topId": "id or null", "bottomId": "id or null", "shoesId": "id or null", "accessoryId": "id or null" }, "aiMessage": "Short reason", "quickReplies": ["تغيير الحذاء", "لون مختلف"] }`;
  const contents = chatHistory.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.role === 'user' ? msg.text : JSON.stringify(msg.outfit || msg.text) }] }));
  const payload = { systemInstruction: { parts: [{ text: systemPrompt }] }, contents, generationConfig: { responseMimeType: "application/json" } };
  try {
    const data = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) { return null; }
}

export async function analyzeWardrobeGapsWithAI(clothes, profile) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const cleanWardrobe = clothes.filter(c => !c.inLaundry).map(c => ({ type: c.type, color: c.color, season: c.season }));
  const prompt = `Analyze wardrobe gaps. Gender: ${profile.gender === 'female' ? 'Female' : 'Male'}. Suggest 3 missing versatile items. Respond JSON: { "summary": "Arabic summary", "suggestions": [{ "item": "Arabic name", "colorHex": "#hex", "reason": "Arabic reason" }] }`;
  const payload = { contents: [{ parts: [{ text: prompt + " Wardrobe: " + JSON.stringify(cleanWardrobe) }] }], generationConfig: { responseMimeType: "application/json" } };
  try {
    const data = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) { return null; }
}

export async function generateCaptionWithAI(outfitDesc) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `Write trendy Instagram caption in Arabic for: ${outfitDesc}. Include emojis, hashtags. Return JSON: { "caption": "caption text" }`;
  const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
  try {
    const data = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) { return null; }
}
