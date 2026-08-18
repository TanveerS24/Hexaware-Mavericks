let groq = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-key-here') {
  try { groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); } catch (e) { console.warn('Groq SDK init skipped:', e.message); }
}

let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-key-here') {
  try { openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); } catch (e) { console.warn('OpenAI SDK init skipped:', e.message); }
}

const DEPARTMENTS = [
  { name: 'Water & Sewerage', keywords: ['water', 'sewage', 'drain', 'pipe', 'leak', 'flood', 'plumbing', 'drainage', 'tap', 'borewell', 'sewer', 'wastewater', 'नल', 'पानी', 'தண்ணீர்'] },
  { name: 'Electricity', keywords: ['electricity', 'power', 'light', 'voltage', 'transformer', 'wire', 'streetlight', 'outage', 'shock', 'blackout', 'meter', 'बिजली', 'மின்சாரம்'] },
  { name: 'Roads & Transport', keywords: ['road', 'pothole', 'traffic', 'bus', 'transport', 'signal', 'bridge', 'footpath', 'highway', 'vehicle', 'accident', 'सड़क', 'வாகனம்'] },
  { name: 'Sanitation & Waste', keywords: ['garbage', 'waste', 'trash', 'sanitation', 'dustbin', 'dump', 'hygiene', 'cleaning', 'sweeper', 'toilet', 'कचरा', 'குப்பை'] },
  { name: 'Health & Medical', keywords: ['hospital', 'doctor', 'medicine', 'ambulance', 'health', 'clinic', 'disease', 'fever', 'vaccination', 'nurse', 'अस्पताल', 'மருத்துவமனை'] },
  { name: 'Police & Safety', keywords: ['police', 'crime', 'theft', 'harassment', 'violence', 'danger', 'emergency', 'security', 'robbery', 'पुलिस', 'காவல்'] },
  { name: 'Housing & Construction', keywords: ['building', 'construction', 'house', 'encroachment', 'demolition', 'illegal', 'property', 'rent', 'मकान', 'கட்டிடம்'] },
  { name: 'Environment', keywords: ['pollution', 'noise', 'air', 'tree', 'park', 'green', 'smoke', 'toxic', 'chemical', 'प्रदूषण', 'மாசுபாடு'] },
  { name: 'Education', keywords: ['school', 'college', 'teacher', 'student', 'education', 'fee', 'scholarship', 'book', 'स्कूल', 'பள்ளி'] },
  { name: 'Revenue & Land', keywords: ['land', 'property', 'document', 'certificate', 'mutation', 'survey', 'tax', 'revenue', 'जमीन', 'நில'] },
  { name: 'Disaster Management', keywords: ['disaster', 'earthquake', 'cyclone', 'storm', 'emergency', 'rescue', 'relief', 'आपदा', 'பேரழிவு'] },
];

const PRIORITY_KEYWORDS = {
  emergency: ['fire', 'death', 'dying', 'murder', 'accident', 'collapse', 'explosion', 'flood', 'earthquake', 'emergency', 'critical', 'dangerous', 'urgent', 'immediate', 'आग', 'मृत्यु', 'தீ', 'இறப்பு'],
  high: ['no water', 'no power', 'no electricity', 'broken', 'injured', 'sick', 'child', 'hospital', 'blocked', 'severe'],
  normal: [],
  low: ['suggestion', 'feedback', 'minor', 'small', 'request'],
};

/**
 * Transcribe audio using OpenAI Whisper (multilingual)
 */
async function transcribeAudio(audioFilePath) {
  try {
    const audioFile = fs.createReadStream(audioFilePath);
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });
    return {
      text: transcription.text,
      language: transcription.language || 'unknown',
      duration: transcription.duration || 0,
    };
  } catch (error) {
    console.error('Whisper transcription error:', error.message);
    // Fallback to Groq Whisper
    try {
      const audioFile = fs.createReadStream(audioFilePath);
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        response_format: 'verbose_json',
      });
      return {
        text: transcription.text,
        language: transcription.language || 'unknown',
        duration: transcription.duration || 0,
      };
    } catch (fallbackError) {
      throw new Error('Audio transcription failed: ' + fallbackError.message);
    }
  }
}

/**
 * Classify complaint and extract structured data using Groq LLM
 */
async function classifyComplaint(text, title = '') {
  const fullText = `Title: ${title}\nDescription: ${text}`;
  
  const prompt = `You are an AI system for the Indian government's citizen grievance platform. Analyze this complaint and provide classification.

Complaint:
${fullText}

Available departments: ${DEPARTMENTS.map(d => d.name).join(', ')}

Respond ONLY with valid JSON in this exact format:
{
  "department": "<department name from the list>",
  "category": "<specific issue category in 2-3 words>",
  "priority": "<emergency|high|normal|low>",
  "sentiment": "<angry|frustrated|neutral|satisfied|distressed>",
  "sentiment_score": <0.0 to 1.0, where 1.0 is most negative>,
  "summary": "<AI-generated summary in 2-3 sentences>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "is_emergency": <true|false>,
  "english_translation": "<English translation if original is in another language, else same as input>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = completion.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Validate department exists
      const dept = DEPARTMENTS.find(d => d.name === parsed.department);
      if (!dept) parsed.department = detectDepartmentByKeywords(text + ' ' + title);
      return parsed;
    }
  } catch (parseError) {
    console.warn('Groq classification fallback:', parseError.message);
  }

  // Fallback: keyword-based classification
  return fallbackClassify(text + ' ' + title);
}

function detectDepartmentByKeywords(text) {
  const lowerText = text.toLowerCase();
  let maxScore = 0;
  let bestDept = 'Revenue & Land';
  
  for (const dept of DEPARTMENTS) {
    const score = dept.keywords.filter(kw => lowerText.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      bestDept = dept.name;
    }
  }
  return bestDept;
}

function fallbackClassify(text) {
  const lowerText = text.toLowerCase();
  const dept = detectDepartmentByKeywords(lowerText);
  
  let priority = 'normal';
  for (const [level, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      priority = level;
      break;
    }
  }
  
  return {
    department: dept,
    category: 'General Complaint',
    priority,
    sentiment: 'neutral',
    sentiment_score: 0.5,
    summary: text.substring(0, 200) + '...',
    keywords: [],
    is_emergency: priority === 'emergency',
    english_translation: text,
  };
}

/**
 * Detect if complaint is a duplicate using keyword overlap
 */
async function detectDuplicate(newComplaint, existingComplaints) {
  if (!existingComplaints || existingComplaints.length === 0) {
    return { isDuplicate: false, duplicateOf: null, similarity: 0 };
  }
  
  const newWords = new Set(
    ((newComplaint || '').toLowerCase().match(/\b\w{4,}\b/g) || [])
  );
  
  let highestSimilarity = 0;
  let duplicateOf = null;
  
  for (const complaint of existingComplaints) {
    const desc = complaint.description || '';
    const title = complaint.title || '';
    const existingWords = new Set(
      ((desc + ' ' + title).toLowerCase().match(/\b\w{4,}\b/g) || [])
    );
    
    if (existingWords.size === 0 && newWords.size === 0) continue;
    
    const intersection = new Set([...newWords].filter(w => existingWords.has(w)));
    const union = new Set([...newWords, ...existingWords]);
    const similarity = union.size > 0 ? (intersection.size / union.size) : 0;
    
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      duplicateOf = complaint.id;
    }
  }
  
  // If >60% similarity, mark as duplicate
  if (highestSimilarity > 0.6) {
    return { isDuplicate: true, duplicateOf, similarity: highestSimilarity };
  }
  
  return { isDuplicate: false, duplicateOf: null, similarity: highestSimilarity };
}


/**
 * AI Chatbot response for citizen queries
 */
async function chatbotResponse(userMessage, context = {}) {
  const userName = context.userName || 'Citizen';
  const complaintCount = context.complaintCount || 0;
  const userRegion = context.region || 'Municipal Ward';
  const complaints = context.complaints || [];

  const systemPrompt = `You are CitizenAI, a helpful assistant for the Indian government's citizen grievance platform. 
You help citizens:
- Track complaint status
- Understand SLA timelines
- Know which department handles their issue
- Get general government service information

Current user context:
- Name: ${userName}
- Active complaints: ${complaintCount}
- Region: ${userRegion}
- Recent complaints: ${JSON.stringify(complaints.slice(0, 3))}

Be helpful, empathetic, and concise. Respond directly to the user's specific query.`;

  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });
      return completion.choices[0].message.content;
    } catch (error) {
      console.warn('Chatbot Groq fallback:', error.message);
    }
  }

  // Intelligent Context-Aware Conversational Engine
  const msg = (userMessage || '').toLowerCase().trim();

  // 1. Officer assignment / "who taken my complaint" / "who is handling"
  if (msg.includes('who taken') || msg.includes('who took') || msg.includes('who is working') || msg.includes('who accepted') || msg.includes('who is handling') || msg.includes('which officer') || msg.includes('officer assigned') || msg.includes('assigned to') || msg.includes('officer name') || (msg.includes('who') && msg.includes('complaint'))) {
    if (complaints.length === 0) {
      return `Hello ${userName}, you do not have any registered grievances in the system yet. Once you submit an issue, a certified field officer in your jurisdiction (${userRegion}) will claim it from the incoming dispatch queue. Their verified name, designation, and direct resolution timeline will be visible right here!`;
    }
    const latest = complaints[0];
    if (latest.assigned_to) {
      const offName = latest.officer_name || 'Field Grievance Officer';
      return `Your grievance "${latest.title || latest.category}" is currently assigned to ${offName} (${latest.department}). Status: [${(latest.status || 'IN_PROGRESS').toUpperCase()}]. You can view their real-time field updates in 'My Complaints'.`;
    }
    return `Your grievance "${latest.title || latest.category}" is currently in the [${(latest.status || 'PENDING').toUpperCase()}] queue and is awaiting field claim by an authorized ${latest.department} officer.`;
  }

  // 2. Track Active Complaint / Status
  if (msg.includes('track') || msg.includes('active complaint') || msg.includes('status') || msg.includes('progress') || msg.includes('timeline') || msg.includes('deadline')) {
    if (complaints.length === 0) {
      return `Hello ${userName}, you currently have 0 active grievances on file in ${userRegion}. To file a new issue, click '+ New Complaint' on your dashboard to submit via voice 🎙️ or photo with 24/7 AI routing!`;
    }
    const listText = complaints.slice(0, 3).map((c, i) => {
      const shortId = (c.id || '').substring(0, 8).toUpperCase();
      const statusBadge = (c.status || 'pending').toUpperCase();
      const deadline = c.sla_deadline ? new Date(c.sla_deadline).toLocaleDateString() : 'Active';
      return `${i + 1}. [Case #${shortId}] "${c.title || c.category}" • Dept: ${c.department} • Status: ${statusBadge} (SLA: ${deadline})`;
    }).join('\n');

    return `Here is the real-time status of your grievances, ${userName}:\n\n${listText}\n\nClick on any complaint in 'My Complaints' to view live field officer actions!`;
  }

  // 3. Greetings
  if (/^(hi|hello|hey|namaste|vanakkam|good\s*(morning|afternoon|evening)|help)$/i.test(msg) || msg === 'hi' || msg === 'hello') {
    if (complaintCount > 0) {
      const latest = complaints[0];
      return `Namaste ${userName}! 🙏 I am CitizenAI, your civic grievance assistant. You currently have ${complaintCount} active grievance(s) on file in ${userRegion}. Your most recent case "${latest.title || latest.category}" is currently [${(latest.status || 'PENDING').toUpperCase()}]. How can I assist you today?`;
    }
    return `Namaste ${userName}! 🙏 I am CitizenAI, your municipal grievance assistant for ${userRegion}. I can help you report issues (Water, Power, Roads, Sanitation), track SLA timelines, or check officer assignments. How can I help you today?`;
  }

  // 4. Querying user's complaints ("whats my complaint", "my complaints", "show my case")
  if (msg.includes('my complaint') || msg.includes('my grievance') || msg.includes('my case') || msg.includes('what is my') || msg.includes('whats my') || msg.includes('list') || msg.includes('show')) {
    if (complaints.length === 0) {
      return `Hello ${userName}, you have no active grievances filed yet. To report an issue with Water, Power, Roads, or Waste, click the '+ New Complaint' button or use the voice/photo filing tools on your dashboard!`;
    }
    const listText = complaints.slice(0, 3).map((c, i) => {
      const shortId = (c.id || '').substring(0, 8).toUpperCase();
      const statusBadge = (c.status || 'pending').toUpperCase();
      return `${i + 1}. [Case #${shortId}] "${c.title || c.category}" • Dept: ${c.department} • Status: ${statusBadge}`;
    }).join('\n');

    return `Here are your registered grievances, ${userName}:\n\n${listText}`;
  }

  // 5. Water & Sewerage
  if (msg.includes('water') || msg.includes('pipe') || msg.includes('leak') || msg.includes('sewage') || msg.includes('drain') || msg.includes('tap') || msg.includes('flood')) {
    return `💧 Water & Sewerage grievances are dispatched directly to the Municipal Hydraulic Department. Standard repair SLA is 24-48 hours. Emergency leaks receive immediate escalation.`;
  }

  // 6. Electricity & Power
  if (msg.includes('power') || msg.includes('electric') || msg.includes('voltage') || msg.includes('light') || msg.includes('blackout') || msg.includes('transformer') || msg.includes('wire')) {
    return `⚡ Electricity issues (outages, voltage spikes, dangerous wires) are routed to the State Power Distribution division with 2-4 hour rapid inspection for hazards.`;
  }

  // 7. Roads & Transport
  if (msg.includes('road') || msg.includes('pothole') || msg.includes('traffic') || msg.includes('signal') || msg.includes('footpath') || msg.includes('bridge')) {
    return `🛣️ Roads & Transport grievances (dangerous potholes, road caving, broken traffic signals) are routed to Public Works & MMRDA. Critical road hazards have 24-hour patch repair SLAs.`;
  }

  // 8. Sanitation, Waste & Garbage
  if (msg.includes('garbage') || msg.includes('trash') || msg.includes('waste') || msg.includes('clean') || msg.includes('dustbin') || msg.includes('sanitation') || msg.includes('dump')) {
    return `🧹 Solid Waste & Sanitation issues are routed to the Ward Health and Conservancy wing with a mandated 24-hour clearance turnaround.`;
  }

  // 9. Police & Safety
  if (msg.includes('police') || msg.includes('safety') || msg.includes('crime') || msg.includes('theft') || msg.includes('emergency') || msg.includes('danger') || msg.includes('accident')) {
    return `🚨 Public Safety & Emergency alerts trigger immediate notifications to local police control rooms. For life-threatening emergencies, please also dial 112 / 100 directly.`;
  }

  // 10. SLA Timelines
  if (msg.includes('sla') || msg.includes('how long') || msg.includes('time') || msg.includes('hours') || msg.includes('delay')) {
    return `⏱️ Municipal SLA Resolution Windows:\n• 🚨 Emergency Hazards: 2 Hours\n• 🔴 High Priority Issues: 24 Hours\n• 🟡 Normal / Standard Grievances: 48 to 72 Hours\n• 🟢 Low / Routine Maintenance: Up to 7 Days`;
  }

  // 11. General intelligent fallback
  return `Thank you for reaching out, ${userName}! As your CitizenAI assistant for ${userRegion}, I can help track your ${complaintCount} active ticket(s), explain SLA response timelines, or direct your grievance to the correct municipal department. What specific assistance do you need?`;
}



/**
 * Generate analytics insights and predictions
 */
async function generateInsights(analyticsData) {
  const prompt = `You are a data analyst for the Indian government. Based on this complaint data, provide actionable insights:

Data: ${JSON.stringify(analyticsData, null, 2)}

Provide 3-5 key insights and predictions in JSON:
{
  "insights": ["<insight1>", "<insight2>", ...],
  "predictions": ["<prediction1>", "<prediction2>", ...],
  "hotspot_departments": ["<dept1>", "<dept2>"],
  "recommended_actions": ["<action1>", "<action2>"]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });
    
    const content = completion.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Insights generation error:', error);
  }
  
  return {
    insights: ['Insufficient data for analysis'],
    predictions: [],
    hotspot_departments: [],
    recommended_actions: [],
  };
}

module.exports = {
  transcribeAudio,
  classifyComplaint,
  detectDuplicate,
  chatbotResponse,
  generateInsights,
  DEPARTMENTS,
};
