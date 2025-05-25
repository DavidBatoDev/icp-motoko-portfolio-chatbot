import { portfolio_template_backend } from "../../declarations/portfolio_template_backend";

document.addEventListener("DOMContentLoaded", async () => {
    // Call the Motoko backend to increment and get the visitor count
    try {
        const visitCount = await portfolio_template_backend.recordVisit();

        // Update the visitor count in the DOM
        const visitorCountElement = document.querySelector(".visitor-count p");
        if (visitorCountElement) {
            visitorCountElement.textContent = `Visitor count: ${visitCount}`;
        }
    } catch (error) {
        console.error("Error fetching visitor count:", error);
    }

    // Handle chat button based on embeddings availability
    handleChatAvailability();
});


// Chatbot functionality with Hugging Face Inference API:
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HF_API_KEY = process.env.HF_API_KEY; 
const EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5";

// import embeddings and keys, disable chatbot if not available
let EMBEDDINGS = require("./embeddings.json");
try {
  if (!HF_API_KEY || !GEMINI_API_KEY) {
      throw new Error("API keys missing – chat disabled");
  }
} catch (error) {
    console.warn("embeddings.json not found. Chat functionality will be disabled.");
    EMBEDDINGS = null;
}

/**********************************************************************
 *(EDIT HERE) EDIT Basic Information                               *
 *********************************************************************/
const OWNER = {
  name:      "David E. Bato-bato",
  pronoun:   "he",
  possessive:"his",
  title:     "Software Developer & Full-Stack Engineer"
};

/**********************************************************************
 * Handle chat availability based on embeddings                      *
 *********************************************************************/
function handleChatAvailability() {
    const chatBtn = document.getElementById("openChat");
    
    if (!chatBtn) return;
    
    if (!EMBEDDINGS) {
        // Disable and gray out the chat button
        chatBtn.disabled = true;
        chatBtn.style.opacity = "0.5";
        chatBtn.style.cursor = "not-allowed";
        chatBtn.style.filter = "grayscale(100%)";
        
        // Add click handler to show alert
        chatBtn.onclick = function(e) {
            e.preventDefault();
            alert("Chat is currently unavailable. Please:\n\n1. Add your CV information to user_cv.txt\n2. Run generateEmbeddings.js to create the embeddings file\n\nThis will enable the AI chat functionality.");
            return false;
        };
        
        // Add tooltip or title
        chatBtn.title = "Chat unavailable - embeddings.json missing";
        
        console.warn("Chat functionality disabled: embeddings.json not found");
    } else {
        // Chat is available, set up normal functionality
        setupChatFunctionality();
    }
}

/**********************************************************************
 * Setup chat functionality when embeddings are available             *
 *********************************************************************/
function setupChatFunctionality() {
    const chatBtn = document.getElementById("openChat");
    const chatBox = document.getElementById("chatContainer");
    const closeChat = document.getElementById("toggleChat");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendMessage");

    /* open / close */
    if (chatBtn) chatBtn.onclick = () => { chatBox.style.display = "flex"; chatBtn.style.display = "none"; };
    if (closeChat) closeChat.onclick = () => { chatBox.style.display = "none"; chatBtn.style.display = "flex"; };

    /* send */
    if (input) {
        input.addEventListener("keypress", e => { if (e.key === "Enter") send(); });
    }
    if (sendBtn) sendBtn.onclick = send;
}

/**********************************************************************
 * Prompt template - you can add personality to your chat bot  (EDIT HERE)                                            *
 *********************************************************************/
function buildPrompt({context, question}){
  return `
You are an AI assistant for ${OWNER.name}'s personal résumé / portfolio site.
• When the answer is in the provided context, respond politely and make it more informational.  
• Always refer to ${OWNER.name.split(" ")[0]} with the third-person pronouns "${OWNER.pronoun}/${OWNER.possessive}". 
• Format your responses using markdown for better readability (use **bold**, *italic*, \`code\`, lists, etc.).

=== CONTEXT START ===
${context}
=== CONTEXT END ===

Question: ${question}
Answer:`.trim();
}

/**********************************************************************
 * Hugging Face Inference API call for embeddings                     *
 *********************************************************************/
async function getEmbedding(text, isQuery = false) {
  const prefixedText = isQuery 
    ? `Represent this query for searching relevant passages: ${text}`
    : `Represent this document for retrieval: ${text}`;

  const response = await fetch(`https://api-inference.huggingface.co/models/${EMBEDDING_MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: prefixedText,
      options: {
        wait_for_model: true
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HF API error! status: ${response.status}`);
  }

  const embedding = await response.json();
  return embedding;
}

/**********************************************************************
 * Direct Gemini API call function                                    *
 *********************************************************************/
async function callGeminiAPI(prompt) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**********************************************************************
 * 1. Starfield animation                                             *
 *********************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const stars = document.getElementById("stars");
  if (stars) {
    for (let i = 0; i < 50; i++) {
      const s = document.createElement("span");
      Object.assign(s.style, {
        width:  `${Math.random()*4+1}px`,
        height: `${Math.random()*4+1}px`,
        left:   `${Math.random()*100}%`,
        top:    `${Math.random()*100}%`,
        animationDuration: `${Math.random()*20+10}s`,
        animationDelay:    `${Math.random()*10}s`
      });
      stars.appendChild(s);
    }
  }
});

/**********************************************************************
 * 2. Load embeddings from file (only if available)                  *
 *********************************************************************/
const chunks = EMBEDDINGS ? EMBEDDINGS.chunks : [];
const vecs   = EMBEDDINGS ? EMBEDDINGS.vectors : [];

/**********************************************************************
 * 3. Enhanced Chat UI with improved typing and markdown              *
 *********************************************************************/
const messages = document.getElementById("chatMessages");

/**********************************************************************
 * Enhanced message handling with markdown support                    *
 *********************************************************************/
function addMessage(sender, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  
  if (sender === 'bot') {
    contentDiv.innerHTML = parseMarkdown(text);
    wrapConsecutiveListItems(contentDiv);
  } else {
    contentDiv.textContent = text;
  }
  
  messageDiv.appendChild(contentDiv);
  messages.appendChild(messageDiv);
  scrollToBottom();
  
  return messageDiv;
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

/**********************************************************************
 * Enhanced typing indicator with smooth animation                    *
 *********************************************************************/
function showTypingIndicator() {
  // Remove existing typing indicator if present
  hideTypingIndicator();
  
  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot typing-message";
  typingDiv.id = "typingIndicator";
  
  const typingContent = document.createElement("div");
  typingContent.className = "typing-indicator";
  
  // Create animated dots
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.style.animationDelay = `${i * 0.2}s`;
    typingContent.appendChild(dot);
  }
  
  typingDiv.appendChild(typingContent);
  messages.appendChild(typingDiv);
  scrollToBottom();
}

function hideTypingIndicator() {
  const typingIndicator = document.getElementById("typingIndicator");
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

/**********************************************************************
 * Enhanced markdown parser with better formatting                    *
 *********************************************************************/
function parseMarkdown(text) {
  return text
    // Escape HTML first to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Headers (process from largest to smallest to avoid conflicts)
    .replace(/^### (.*$)/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="md-h1">$1</h1>')
    
    // Code blocks (must come before inline code)
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre class="md-code-block"><code>$2</code></pre>')
    .replace(/```([\s\S]*?)```/g, '<pre class="md-code-block"><code>$1</code></pre>')
    
    // Inline code
    .replace(/`([^`\n]+)`/g, '<code class="md-inline-code">$1</code>')
    
    // Bold and Italic (process in correct order)
    .replace(/\*\*\*((?:[^*]|\*(?!\*\*))+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*((?:[^*]|\*(?!\*))+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*((?:[^*]|\*\*)+?)\*/g, '<em>$1</em>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Lists (unordered)
    .replace(/^\* (.+$)/gm, '<li class="md-list-item">$1</li>')
    .replace(/^- (.+$)/gm, '<li class="md-list-item">$1</li>')
    
    // Lists (ordered)
    .replace(/^\d+\. (.+$)/gm, '<li class="md-list-item md-ordered">$1</li>')
    
    // Line breaks and paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    
    // Wrap in paragraphs if not already wrapped
    .replace(/^(?!<[hul]|<pre|<li)/gm, '<p>')
    .replace(/(?<!>)$/gm, '</p>')
    
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hul])/g, '$1')
    .replace(/(<\/[hul][^>]*>)<\/p>/g, '$1');
}

/**********************************************************************
 * Enhanced list wrapping function                                   *
 *********************************************************************/
function wrapConsecutiveListItems(container) {
  const listItems = container.querySelectorAll('.md-list-item');
  if (listItems.length === 0) return;
  
  let currentList = null;
  let currentListType = null;
  
  listItems.forEach((item) => {
    const isOrdered = item.classList.contains('md-ordered');
    const listType = isOrdered ? 'ol' : 'ul';
    
    // Check if we need to start a new list
    if (!currentList || currentListType !== listType) {
      currentList = document.createElement(listType);
      currentList.className = 'md-list';
      item.parentNode.insertBefore(currentList, item);
      currentListType = listType;
    }
    
    // Move the item into the current list
    currentList.appendChild(item);
  });
}

/**********************************************************************
 * Similarity functions for RAG                                      *
 *********************************************************************/
function dotProduct(a, b) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function magnitude(vec) {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

function cosine(a, b) {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  return dot / (magA * magB);
}

/**********************************************************************
 * RAG answer pipeline                                               *
 *********************************************************************/
async function generateAnswer(question) {
  if (!EMBEDDINGS) {
    throw new Error("Embeddings not available");
  }

  // Embed the query using HF API with query prefix
  const queryEmbedding = await getEmbedding(question, true);

  // Similarity search
  const topChunks = vecs.map((vector, index) => ({ 
      index, 
      score: cosine(vector, queryEmbedding) 
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(result => chunks[result.index])
    .join("\n---\n");

  // Generate response using Gemini
  const context = topChunks;
  const prompt = buildPrompt({ context, question });
  const response = await callGeminiAPI(prompt);
  return response;
}

/**********************************************************************
 * Simplified send function without typing animation                  *
 *********************************************************************/
async function send() {
  if (!EMBEDDINGS) {
    alert("Chat is currently unavailable. Please add your CV information to user_cv.txt and run generateEmbeddings.js first.");
    return;
  }

  const input = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendMessage");
  const question = input.value.trim();
  if (!question) return;
  
  // Disable input while processing
  input.disabled = true;
  sendBtn.disabled = true;
  
  // Add user message
  addMessage("user", question);
  input.value = "";
  
  // Show typing indicator dots
  showTypingIndicator();

  try {
    // Generate response
    const answer = await generateAnswer(question);
    
    // Hide typing indicator
    hideTypingIndicator();
    
    // Add bot message instantly without typing effect
    addMessage("bot", answer.trim());
    
  } catch (error) {
    console.error("Chat error:", error);
    hideTypingIndicator();
    addMessage("bot", "Sorry, I encountered an error. Please try again.");
  } finally {
    // Re-enable input
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}