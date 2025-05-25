/**
 * Generate Embeddings Script
 * 
 * This script generates embeddings for your CV and saves them to embeddings.json
 * Run this whenever you update your user_cv.txt file
 * 
 * Usage: node generate-embeddings.js
 * Requirements: Node.js 18+ (for built-in fetch)
 */

const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

// Configuration - make sure these match your main.js settings
const HF_API_KEY = "hf_xxxxxxxxxxxxxxxxxxxxxxxxxx"; // Replace with your HF token
const CHUNK = 1500;
const OVERLAP = 300;
const CV_PATH = path.join(__dirname, "user_cv.txt")
const EMBEDDINGS_PATH = path.join(__dirname, "embeddings.json")
const EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5";

/**********************************************************************
 * Hugging Face Inference API call for embeddings                     *
 *********************************************************************/
async function getEmbedding(text, isQuery = false) {
  // Add BGE-specific prefixes for better performance
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
    const errorText = await response.text();
    throw new Error(`HF API error! status: ${response.status}, message: ${errorText}`);
  }

  const embedding = await response.json();
  return embedding;
}

/**********************************************************************
 * Helper function to compute SHA256 hash                             *
 *********************************************************************/
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**********************************************************************
 * Main function to generate embeddings                               *
 *********************************************************************/
async function generateEmbeddings() {
  try {
    console.log("🚀 Starting embeddings generation...");
    
    // Check if CV file exists
    try {
      await fs.access(CV_PATH);
    } catch (error) {
      console.error(`❌ CV file not found: ${CV_PATH}`);
      console.log("Please make sure your CV file exists and the path is correct.");
      process.exit(1);
    }
    
    // Load CV content
    console.log(`📖 Reading CV from ${CV_PATH}...`);
    const raw = await fs.readFile(CV_PATH, 'utf-8');
    
    if (!raw.trim()) {
      console.error("❌ CV file is empty!");
      process.exit(1);
    }
    
    // Generate content hash for cache validation
    const contentHash = sha256(raw + CHUNK + OVERLAP + EMBEDDING_MODEL + "hf-api");
    console.log(`🔍 Content hash: ${contentHash.substring(0, 16)}...`);
    
    // Check if embeddings already exist and are up to date
    try {
      const existingData = JSON.parse(await fs.readFile(EMBEDDINGS_PATH, 'utf-8'));
      if (existingData.hash === contentHash) {
        console.log("✅ Embeddings are already up to date!");
        console.log(`📊 Found ${existingData.chunks.length} chunks with ${existingData.vectors.length} vectors`);
        return;
      } else {
        console.log("🔄 Existing embeddings are outdated, regenerating...");
      }
    } catch (error) {
      console.log("📁 No existing embeddings found, creating new ones...");
    }
    
    // Split text into chunks
    console.log(`✂️ Splitting text into chunks (size: ${CHUNK}, overlap: ${OVERLAP})...`);
    const chunks = [];
    for (let i = 0; i < raw.length; i += CHUNK - OVERLAP) {
      chunks.push(raw.slice(i, i + CHUNK));
    }
    console.log(`📝 Created ${chunks.length} chunks`);
    
    // Create embeddings with progress indication
    console.log(`🤖 Generating embeddings using ${EMBEDDING_MODEL}...`);
    const vectors = [];
    
    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`\r📊 Progress: ${i + 1}/${chunks.length} (${Math.round((i + 1) / chunks.length * 100)}%)`);
      
      try {
        const embedding = await getEmbedding(chunks[i], false);
        vectors.push(embedding);
        
        // Small delay to be respectful to the API
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`\n❌ Error embedding chunk ${i + 1}:`, error.message);
        throw error;
      }
    }
    
    console.log("\n✅ All embeddings generated successfully!");
    
    // Prepare data to save
    const embeddingsData = {
      hash: contentHash,
      model: EMBEDDING_MODEL,
      chunk_size: CHUNK,
      overlap: OVERLAP,
      created_at: new Date().toISOString(),
      chunks: chunks,
      vectors: vectors,
      metadata: {
        total_chunks: chunks.length,
        cv_length: raw.length,
        average_chunk_length: Math.round(chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length)
      }
    };
    
    // Save embeddings to file
    console.log(`💾 Saving embeddings to ${EMBEDDINGS_PATH}...`);
    await fs.writeFile(EMBEDDINGS_PATH, JSON.stringify(embeddingsData, null, 2));
    
    // Display summary
    console.log("\n🎉 Embeddings generation completed!");
    console.log("📊 Summary:");
    console.log(`   • CV length: ${raw.length} characters`);
    console.log(`   • Total chunks: ${chunks.length}`);
    console.log(`   • Average chunk length: ${embeddingsData.metadata.average_chunk_length} characters`);
    console.log(`   • Model used: ${EMBEDDING_MODEL}`);
    console.log(`   • File saved: ${EMBEDDINGS_PATH}`);
    console.log(`   • File size: ${Math.round((await fs.stat(EMBEDDINGS_PATH)).size / 1024)} KB`);
    
  } catch (error) {
    console.error("\n❌ Error generating embeddings:", error.message);
    process.exit(1);
  }
}

/**********************************************************************
 * CLI interface                                                      *
 *********************************************************************/
async function main() {
  console.log("🔧 CV Embeddings Generator");
  console.log("==========================");
  
  // Check Node.js version for built-in fetch support
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.error("❌ Node.js 18+ is required for built-in fetch support.");
    console.log(`Current version: ${nodeVersion}`);
    console.log("Please upgrade Node.js or use a polyfill.");
    process.exit(1);
  }
  
  // Check API key
  if (!HF_API_KEY || HF_API_KEY.includes("your_token_here")) {
    console.error("❌ Please set your Hugging Face API key in the script!");
    console.log("Get your free API key from: https://huggingface.co/settings/tokens");
    process.exit(1);
  }
  
  await generateEmbeddings();
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateEmbeddings }