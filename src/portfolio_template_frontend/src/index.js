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

    // Handle chat button based on CV file availability
    await handleChatAvailability();
});

// Chatbot functionality with Gemini API only
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check for CV file and API key
let CV_CONTENT = null;

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
 * Enhanced CV content loading with better validation                 *
 *********************************************************************/
async function loadCVContent() {
    try {
        let content = null;
        
        // Try to read the CV file using the file system API
        if (typeof window !== 'undefined' && window.fs && window.fs.readFile) {
            try {
                content = await window.fs.readFile('user_cv.txt', { encoding: 'utf8' });
            } catch (fsError) {
                console.warn("Failed to read CV file with fs API:", fsError);
                // Don't fall through to fetch - if fs fails, the file doesn't exist
                throw new Error('CV file not found or inaccessible via file system');
            }
        } else {
            // Fallback: try to fetch the file if fs API isn't available
            try {
                const response = await fetch('./user_cv.txt');
                if (response.ok) {
                    content = await response.text();
                } else {
                    throw new Error(`CV file fetch failed with status: ${response.status}`);
                }
            } catch (fetchError) {
                console.warn("Failed to fetch CV file:", fetchError);
                throw new Error('CV file not found or inaccessible');
            }
        }
        
        // Enhanced validation for CV content
        if (!content) {
            throw new Error('CV file returned null or undefined content');
        }
        
        // Trim whitespace and check if content is meaningful
        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
            throw new Error('CV file is empty or contains only whitespace');
        }
        
        // Additional validation: check for minimal content
        if (trimmedContent.length < 10) {
            throw new Error('CV file content is too short (less than 10 characters)');
        }
        
        // NEW: Check if content is HTML instead of CV text
        const htmlPatterns = [
            /<!DOCTYPE\s+html/i,
            /<html[^>]*>/i,
            /<head[^>]*>/i,
            /<body[^>]*>/i,
            /<meta[^>]*>/i,
            /<link[^>]*>/i,
            /<script[^>]*>/i,
            /<style[^>]*>/i
        ];
        
        if (htmlPatterns.some(pattern => pattern.test(trimmedContent))) {
            throw new Error('CV file appears to contain HTML content instead of CV text');
        }
        
        // Check for excessive HTML tags (more than 3 HTML tags suggests it's HTML content)
        const htmlTagCount = (trimmedContent.match(/<[^>]+>/g) || []).length;
        if (htmlTagCount > 3) {
            throw new Error('CV file contains too many HTML tags - expected plain text CV content');
        }
        
        // Check if content looks like placeholder text
        const placeholderPatterns = [
            /^(placeholder|example|sample|template|todo|tbd|fill.*in|add.*here|your.*name|your.*info)/i,
            /^(\s*\n\s*)*$/,
            /^[.\-_=\s]*$/
        ];
        
        if (placeholderPatterns.some(pattern => pattern.test(trimmedContent))) {
            throw new Error('CV file appears to contain placeholder content');
        }
        
        // NEW: Additional check for common non-CV content indicators
        const nonCvPatterns = [
            /CV Content:/i,  // Matches your current issue
            /font-family:/i,
            /background-image:/i,
            /margin:/i,
            /padding:/i,
            /\.container/i,
            /\.profile-pic/i
        ];
        
        if (nonCvPatterns.some(pattern => pattern.test(trimmedContent))) {
            throw new Error('CV file appears to contain non-CV content (possibly HTML/CSS)');
        }
        
        CV_CONTENT = content;
        console.log("CV content loaded successfully");
        console.log("First 200 characters of CV:", CV_CONTENT.substring(0, 200) + "...");
        return true;
        
    } catch (error) {
        console.warn("CV content loading failed:", error.message);
        CV_CONTENT = null;
        return false;
    }
}

/**********************************************************************
 * Enhanced chat availability handler with better error messaging    *
 *********************************************************************/
async function handleChatAvailability() {
    const chatBtn = document.getElementById("openChat");
    
    if (!chatBtn) {
        console.warn("Chat button not found in DOM");
        return;
    }
    
    let disableReason = null;
    
    // Check if API key is available
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
        disableReason = "API key missing or empty";
    } else {
        // Try to load CV content
        const cvLoaded = await loadCVContent();
        
        if (!cvLoaded) {
            disableReason = "CV file missing, empty, or invalid";
        }
    }
    
    if (disableReason) {
        disableChatButton(disableReason);
    } else {
        // Chat is available, set up normal functionality
        enableChatButton();
        setupChatFunctionality();
    }
}

/**********************************************************************
 * Enhanced chat button disabling with better UX                     *
 *********************************************************************/
function disableChatButton(reason) {
    const chatBtn = document.getElementById("openChat");
    
    if (!chatBtn) return;
    
    // Disable and gray out the chat button
    chatBtn.disabled = true;
    chatBtn.style.opacity = "0.5";
    chatBtn.style.cursor = "not-allowed";
    chatBtn.style.filter = "grayscale(100%)";
    
    // Add visual indicator class
    chatBtn.classList.add('chat-disabled');
    
    // NO STATUS MESSAGE - just use tooltip
    
    // Enhanced click handler with detailed instructions
    chatBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        let message = "💬 Chat is currently unavailable\n\n";
        message += "To enable chat functionality, please:\n\n";
        
        if (reason.includes("API key")) {
            message += "🔑 Set your GEMINI_API_KEY environment variable\n";
            message += "   • Get your API key from Google AI Studio\n";
            message += "   • Add it to your environment variables\n\n";
        }
        
        if (reason.includes("CV file")) {
            message += "📄 Fix your CV file (user_cv.txt):\n";
            message += "   • Make sure the file exists in your project root\n";
            message += "   • Add your actual CV/resume content\n";
            message += "   • Ensure it's not empty or placeholder text\n";
            message += "   • File should contain at least 10 characters\n\n";
        }
        
        message += "Once fixed, refresh the page to enable chat! 🚀";
        
        alert(message);
        return false;
    };
    
    // Enhanced tooltip (this will show on hover instead of the red bar)
    const tooltipText = `Chat unavailable: ${reason}. Click for details.`;
    chatBtn.title = tooltipText;
    chatBtn.setAttribute('aria-label', tooltipText);
    
    console.warn(`Chat functionality disabled: ${reason}`);
}

/**********************************************************************
 * Enable chat button when requirements are met                      *
 *********************************************************************/
function enableChatButton() {
    const chatBtn = document.getElementById("openChat");
    
    if (!chatBtn) return;
    
    // Re-enable the chat button
    chatBtn.disabled = false;
    chatBtn.style.opacity = "1";
    chatBtn.style.cursor = "pointer";
    chatBtn.style.filter = "none";
    
    // Remove disabled class
    chatBtn.classList.remove('chat-disabled');
    
    // Reset tooltip
    chatBtn.title = 'Chat with AI about my background';
    chatBtn.setAttribute('aria-label', 'Open chat to ask questions about my background');
    
    console.log("Chat functionality enabled");
}
/**********************************************************************
 * Setup chat functionality when CV is available                     *
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
 * (EDIT HERE) Prompt template - you can add personality to your chat bot                                             *
 *********************************************************************/
function buildPrompt({cvContent, question}){
  return `
You are an AI assistant for ${OWNER.name}'s personal résumé / portfolio site.

INSTRUCTIONS:
• Answer questions about ${OWNER.name.split(" ")[0]} based on the CV information provided below
• Always refer to ${OWNER.name.split(" ")[0]} with the third-person pronouns "${OWNER.pronoun}/${OWNER.possessive}"
• Be helpful, professional, and informative
• If asked about something not in the CV, politely indicate that information isn't available
• Format your responses using markdown for better readability (use **bold**, *italic*, \`code\`, lists, etc.)
• Keep responses concise but informative

=== CV INFORMATION START ===
${cvContent}
=== CV INFORMATION END ===

Question: ${question}
Answer:`.trim();
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
 * Enhanced generate answer with additional validation               *
 *********************************************************************/
async function generateAnswer(question) {
    // Validate CV content before making API call
    if (!CV_CONTENT) {
        const cvLoaded = await loadCVContent();
        if (!cvLoaded) {
            throw new Error("CV content not available - file missing or invalid");
        }
    }
    
    // Additional runtime validation
    if (CV_CONTENT.trim().length < 10) {
        throw new Error("CV content is too short or invalid");
    }
    
    // Validate API key
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
        throw new Error("API key not available or empty");
    }

    // Generate response using Gemini with CV content as context
    const prompt = buildPrompt({ cvContent: CV_CONTENT, question });
    const response = await callGeminiAPI(prompt);
    
    if (!response || response.trim().length === 0) {
        throw new Error("Empty response from API");
    }
    
    return response;
}

/**********************************************************************
 * Enhanced send function with additional CV validation              *
 *********************************************************************/
async function send() {
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendMessage");
    const question = input.value.trim();
    
    if (!question) return;
    
    // Double-check CV content before processing
    if (!CV_CONTENT) {
        const cvLoaded = await loadCVContent();
        if (!cvLoaded) {
            alert("❌ Chat is currently unavailable.\n\nPlease add your CV information to user_cv.txt file and refresh the page.");
            return;
        }
    }
    
    // Additional runtime validation
    if (CV_CONTENT.trim().length < 10) {
        alert("❌ CV content appears to be too short or invalid.\n\nPlease check your user_cv.txt file and refresh the page.");
        return;
    }
    
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
        
        // Add bot message
        addMessage("bot", answer.trim());
        
    } catch (error) {
        console.error("Chat error:", error);
        hideTypingIndicator();
        
        let errorMessage = "❌ Sorry, I encountered an error. Please try again.";
        
        if (error.message.includes("CV content") || error.message.includes("not available")) {
            errorMessage = "❌ Sorry, I couldn't access the CV information.\n\nPlease make sure user_cv.txt exists, contains valid content, and refresh the page.";
        } else if (error.message.includes("API") || error.message.includes("key")) {
            errorMessage = "❌ Sorry, there was an API error.\n\nPlease check your GEMINI_API_KEY and try again.";
        }
        
        addMessage("bot", errorMessage);
    } finally {
        // Re-enable input
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}