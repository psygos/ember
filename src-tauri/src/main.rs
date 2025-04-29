// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::collections::HashMap;
use std::env;
use std::path::PathBuf;

// Load environment variables from .env (ignored by git)
fn init_env() {
    // Load .env from current directory (src-tauri)
    dotenv::dotenv().ok();
    // Also attempt loading .env from project root (parent of cwd)
    if let Ok(cwd) = std::env::current_dir() {
        let mut root = cwd.clone();
        if let Some(parent) = cwd.parent() {
            root = parent.to_path_buf();
        }
        let env_path = root.join(".env");
        dotenv::from_filename(env_path).ok();
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct WhatsAppMessage {
    date: String,
    time: String,
    author: String,
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct WhatsAppDayChunk {
    date: String,
    messages: Vec<WhatsAppMessage>,
}

/// Batch request for processing up to 10 day-chunks of a WhatsApp chat
#[derive(Debug, Serialize, Deserialize)]
struct ChatBatch {
    /// Name of the chat (from zip filename)
    name: String,
    /// Start index within the full chat.chunks for this batch
    start: usize,
    /// List of day-chunks to process (max 10)
    chunks: Vec<WhatsAppDayChunk>,
}

/// A WhatsApp chat import with full list of day-chunks
#[derive(Debug, Serialize, Deserialize)]
struct ChatImport {
    name: String,
    chunks: Vec<WhatsAppDayChunk>,
}

/// Load persisted chat imports from disk
#[tauri::command]
async fn load_imports() -> Result<Value, String> {
    init_env();
    // Determine project root (parent of CWD) to locate ember-swift-current above src-tauri
    let cwd = env::current_dir().map_err(|e| format!("cwd error: {}", e))?;
    let project_root = cwd.parent().ok_or("Failed to determine project root")?;
    let base_dir = project_root.join("data");
    let imports_dir = base_dir.join("imports");
    let path = imports_dir.join("chat_imports.json");
    if !path.exists() {
        return Ok(Value::Array(vec![]));
    }
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read imports file: {}", e))?;
    let imports: Vec<ChatImport> = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse imports JSON: {}", e))?;
    Ok(serde_json::to_value(imports).map_err(|e| format!("Serialization error: {}", e))?)
}

/// Save chat imports to disk
#[tauri::command]
async fn save_imports(imports: Vec<ChatImport>) -> Result<(), String> {
    init_env();
    // Determine project root to write persistent imports
    let cwd = env::current_dir().map_err(|e| format!("cwd error: {}", e))?;
    let project_root = cwd.parent().ok_or("Failed to determine project root")?;
    let base_dir = project_root.join("data");
    let imports_dir = base_dir.join("imports");
    fs::create_dir_all(&imports_dir).map_err(|e| format!("Failed to create imports dir: {}", e))?;
    let path = imports_dir.join("chat_imports.json");
    let text = serde_json::to_string_pretty(&imports)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, text).map_err(|e| format!("Failed to write imports file: {}", e))?;
    Ok(())
}

/// Process a chat import by sending its chunks to OpenRouter and returning JSON response
#[tauri::command]
async fn process_chat(batch: ChatBatch) -> Result<Value, String> {
    init_env();
    // Embed system prompt at compile time
    const SYSTEM_PROMPT: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/system_prompt.txt"));
    let system_prompt = SYSTEM_PROMPT;
    // Require OpenRouter API key (try VITE_ or standard env var)
    let api_key = std::env::var("OPENROUTER_API_KEY")
        .or_else(|_| std::env::var("VITE_OPENROUTER_API_KEY"))
        .map_err(|e| format!("OpenRouter API key missing: {}", e))?;
    // Determine base URL
    let base_url = std::env::var("OPENROUTER_BASE_URL")
        .or_else(|_| std::env::var("VITE_OPENROUTER_BASE_URL"))
        .unwrap_or_else(|_| String::from("https://openrouter.ai/api/v1"));
    // Select model from env
    let model = std::env::var("OPENROUTER_MODEL")
        .or_else(|_| std::env::var("VITE_OPENROUTER_MODEL"))
        .unwrap_or_else(|_| String::from("gpt-4.1-2025-04-14"));
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
    // Caching setup: per-chat directory, each chunk saved as {index}.json
    let cwd = env::current_dir().map_err(|e| format!("cwd error: {}", e))?;
    let project_root = cwd.parent().ok_or("Failed to determine project root")?;
    let base_dir = project_root.join("data");
    let cache_dir = base_dir.join("cache");
    // Chat-specific cache directory
    let base = batch.name.replace("/", "_");
    let chat_dir = cache_dir.join(&base);
    fs::create_dir_all(&chat_dir).map_err(|e| format!("Failed to create cache dir: {}", e))?;
    let mut results: Vec<Value> = Vec::with_capacity(batch.chunks.len());
    // Process each chunk in this batch, using chat name and global index for caching
    for (i, chunk) in batch.chunks.iter().enumerate() {
        let global_index = batch.start + i;
        let file_path = chat_dir.join(format!("{}.json", global_index));
        // If cached file exists, load it
        if file_path.exists() {
            let content = fs::read_to_string(&file_path)
                .map_err(|e| format!("Cache file read error {}: {}", file_path.display(), e))?;
            let json_val: Value = serde_json::from_str(&content)
                .map_err(|e| format!("Cache JSON parse error: {}", e))?;
            results.push(json_val);
            continue;
        }
        // Serialize chunk and call API
        let chunk_json = serde_json::to_string(chunk)
            .map_err(|e| format!("Serialization error: {}", e))?;
        // Prepare OpenRouter request
        let body = serde_json::json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": chunk_json }
            ],
            "temperature": 0.0
        });
        let endpoint = format!("{}/chat/completions", base_url);
        let mut request = client.post(&endpoint)
            .bearer_auth(&api_key)
            .json(&body);
        // Optional headers for OpenRouter ranking
        if let Ok(site_url) = std::env::var("VITE_SITE_URL") {
            request = request.header("HTTP-Referer", site_url);
        }
        if let Ok(site_name) = std::env::var("VITE_SITE_NAME") {
            request = request.header("X-Title", site_name);
        }
        let resp = request.send()
            .await
            .map_err(|e| format!("Request error: {}", e))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("OpenRouter API error {}: {}", status, text));
        }
        let full: Value = resp.json()
            .await
            .map_err(|e| format!("Response parse error: {}", e))?;
        // Extract content and parse inner JSON
        let content = full.get("choices")
            .and_then(Value::as_array)
            .and_then(|arr| arr.get(0))
            .and_then(|c| c.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(Value::as_str)
            .ok_or("Missing content in response")?;
        // Strip code fences and parse content into JSON Value when possible
        let mut content_str = content.to_string();
        // Strip leading fences (```json or ```) 
        if content_str.starts_with("```json") {
            content_str = content_str.trim_start_matches("```json").to_string();
        }
        if content_str.starts_with("```") {
            content_str = content_str.trim_start_matches("```").to_string();
        }
        // Strip trailing fences
        if content_str.ends_with("```") {
            content_str = content_str.trim_end_matches("```").to_string();
        }
        // Trim leading whitespace and remove stray 'json' prefix if present
        content_str = content_str.trim_start().to_string();
        if content_str.to_lowercase().starts_with("json") {
            content_str = content_str
                .trim_start_matches("json")
                .trim_start()
                .to_string();
        }
        let content_trimmed = content_str.trim();
        let parsed = match serde_json::from_str::<Value>(content_trimmed) {
            Ok(v) => v,
            Err(_) => Value::String(content_trimmed.to_string()),
        };
        // Save parsed result to cache file
        let text = serde_json::to_string_pretty(&parsed)
            .map_err(|e| format!("Serialization error: {}", e))?;
        fs::write(&file_path, text)
            .map_err(|e| format!("Failed to write cache file {}: {}", file_path.display(), e))?;
        results.push(parsed.clone());
    }
    // Return choices array
    Ok(serde_json::json!({ "choices": results }))
}

#[tauri::command]
async fn load_cache(chat_name: String) -> Result<Value, String> {
    init_env();
    // Determine cache directory for this chat
    let cwd = env::current_dir().map_err(|e| format!("cwd error: {}", e))?;
    let project_root = cwd.parent().ok_or("Failed to determine project root")?;
    let base_dir = project_root.join("data");
    let cache_dir = base_dir.join("cache");
    let base = chat_name.replace("/", "_");
    let chat_dir = cache_dir.join(&base);
    // If no cache directory, return empty array
    if !chat_dir.exists() || !chat_dir.is_dir() {
        return Ok(serde_json::json!([]));
    }
    // Collect JSON files named as numeric indices
    let mut entries: Vec<(usize, PathBuf)> = Vec::new();
    for entry in fs::read_dir(&chat_dir).map_err(|e| format!("Cache dir read error: {}", e))? {
        let file = entry.map_err(|e| format!("Cache dir entry error: {}", e))?;
        let path = file.path();
        if let Some(fname) = path.file_name().and_then(|s| s.to_str()) {
            if let Some(stem) = fname.strip_suffix(".json") {
                if let Ok(idx) = stem.parse::<usize>() {
                    entries.push((idx, path.clone()));
                }
            }
        }
    }
    // Sort by index
    entries.sort_by_key(|(idx, _)| *idx);
    // Read and collect values
    let mut results: Vec<Value> = Vec::new();
    for (_idx, path) in entries {
        let text = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read cache file {}: {}", path.display(), e))?;
        let json_val: Value = serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse cache JSON: {}", e))?;
        results.push(json_val);
    }
    Ok(Value::Array(results))
}

/// Delete all cached data for a given chat (import list is managed client-side)
#[tauri::command]
async fn delete_chat(chat_name: String) -> Result<(), String> {
    init_env();
    // Determine project root for data directory
    let cwd = env::current_dir().map_err(|e| format!("cwd error: {}", e))?;
    let project_root = cwd.parent().ok_or("Failed to determine project root")?;
    let base_dir = project_root.join("data");
    let cache_dir = base_dir.join("cache");
    // Sanitize chat filename base
    let base = chat_name.replace("/", "_");
    // Remove all cached chunk files for this chat
    let chat_dir = cache_dir.join(&base);
    if chat_dir.exists() {
        fs::remove_dir_all(&chat_dir)
            .map_err(|e| format!("Failed to remove cache directory {}: {}", chat_dir.display(), e))?;
    }
    Ok(())
}

/// Load saved recall analysis data (mapping date to saved sentences)
#[tauri::command]
async fn load_analysis() -> Result<Value, String> {
    init_env();
    // Determine project root and data directory
    let cwd = env::current_dir().map_err(|e| format!("cwd error: {}", e))?;
    let project_root = cwd.parent().ok_or("Failed to determine project root")?;
    let base_dir = project_root.join("data");
    let file_path = base_dir.join("analysis.json");
    if !file_path.exists() {
        // Return empty structure if no analysis file
        return Ok(serde_json::json!({ "saved_memories": {} }));
    }
    let data = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read analysis file: {}", e))?;
    let json: Value = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse analysis JSON: {}", e))?;
    Ok(json)
}

/// Save recall analysis data
#[tauri::command]
async fn save_analysis(analysis: Value) -> Result<(), String> {
    init_env();
    // Determine project root and data directory
    let cwd = env::current_dir().map_err(|e| format!("cwd error: {}", e))?;
    let project_root = cwd.parent().ok_or("Failed to determine project root")?;
    let base_dir = project_root.join("data");
    // Ensure data directory exists
    fs::create_dir_all(&base_dir).map_err(|e| format!("Failed to create data dir: {}", e))?;
    let file_path = base_dir.join("analysis.json");
    let text = serde_json::to_string_pretty(&analysis)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&file_path, text)
        .map_err(|e| format!("Failed to write analysis file: {}", e))?;
    Ok(())
}

fn main() {
    init_env();
    tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        process_chat,
        load_imports,
        save_imports,
        load_cache,
        delete_chat,
        load_analysis,
        save_analysis
    ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
