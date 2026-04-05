function findNode(root, id) {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

function findParent(root, id) {
  if (!root.children) return null;
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function execDeleteNode(root, id) {
  if (root.id === id) return false;
  const parent = findParent(root, id);
  if (parent && parent.children) {
    parent.children = parent.children.filter(child => child.id !== id);
    return true;
  }
  return false;
}

function execUpdateNode(root, id, updates) {
  const node = findNode(root, id);
  if (!node) return false;

  if (updates.content !== undefined) node.content = updates.content;
  if (updates.notes !== undefined) node.notes = updates.notes;
  if (updates.branchColor !== undefined) node.branchColor = updates.branchColor;
  if (updates.collapsed !== undefined) node.collapsed = updates.collapsed;
  
  if (updates.citations !== undefined) {
      if (Array.isArray(updates.citations)) {
           node.citations = updates.citations;
      } else {
          node.citations = updates.citations;
      }
  }

  if (updates.checked !== undefined) node.checked = updates.checked;

  return true;
}

function processChildrenWithIds(children) {
  return children.map(child => {
    const processedChild = {
      ...child,
      id: generateId()
    };
    if (child.children && Array.isArray(child.children)) {
      processedChild.children = processChildrenWithIds(child.children);
    } else {
      processedChild.children = [];
    }
    return processedChild;
  });
}

function execAddNode(root, parentId, nodeData) {
  const parent = findNode(root, parentId);
  if (!parent) return null;

  if (!parent.children) parent.children = [];

  const newNode = {
    id: generateId(),
    content: nodeData.content || "New Node",
    ...nodeData
  };

  if (nodeData.children && Array.isArray(nodeData.children)) {
    newNode.children = processChildrenWithIds(nodeData.children);
  } else {
    newNode.children = [];
  }

  parent.children.push(newNode);
  return newNode.id;
}

function applyCommands(mmJson, commands) {
  const root = mmJson['mm-node'];
  const logs = [];
  let successCount = 0;

  if (!root) {
    return { success: false, logs: ["Invalid Mind Map: Missing mm-node"], modifiedMmJson: mmJson };
  }

  for (const cmd of commands) {
    try {
      const { action, id, data } = cmd;
      
      switch (action) {
        case 'delete':
          if (execDeleteNode(root, id)) {
            logs.push(`Deleted node ${id}`);
            successCount++;
          } else {
            logs.push(`Failed to delete node ${id} (not found or root)`);
          }
          break;

        case 'update':
          if (id === 'mm-settings') {
            if (!mmJson['mm-settings']) mmJson['mm-settings'] = {};
            Object.assign(mmJson['mm-settings'], data);
            logs.push(`Updated global settings (mm-settings)`);
            successCount++;
          } else {
            const node = findNode(root, id);
            if (node && execUpdateNode(root, id, data)) {
              logs.push(`Updated node "${node.content}" (id: ${id})`);
              successCount++;
            } else {
              logs.push(`Failed to update node ${id} (not found)`);
            }
          }
          break;

        case 'update-settings':
          if (!mmJson['mm-settings']) mmJson['mm-settings'] = {};
          Object.assign(mmJson['mm-settings'], data);
          logs.push(`Updated global settings via update-settings`);
          successCount++;
          break;

        case 'add':
          const newId = execAddNode(root, id, data);
          if (newId) {
            logs.push(`Added new node ${newId} to parent ${id}`);
            successCount++;
          } else {
            logs.push(`Failed to add node to parent ${id} (parent not found)`);
          }
          break;
        
        case 'contact-team':
          logs.push(`Notified MMW team about feedback/issue`);
          successCount++;
          break;
        
        default:
          logs.push(`Unknown action: ${action}`);
      }
    } catch (e) {
      logs.push(`Error executing command ${JSON.stringify(cmd)}: ${e.message}`);
    }
  }

  return {
    success: successCount > 0,
    logs,
    modifiedMmJson: mmJson
  };
}

async function performAiSearch(query, apiKey) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Mind Map Wizard'
      },
      body: JSON.stringify({
        model: window.getSelectedModel ? window.getSelectedModel() : "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a search assistant. Provide a concise summary of the search results found for the query." },
          { role: "user", content: query }
        ],
        plugins: [{ id: 'web', max_results: 3 }]
      })
    });

    if (!response.ok) return { results: "Search failed.", cost: 0, tokens: 0 };

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No results found.";
    
    let cost = 0;
    if (data.usage) {
      const rawCost = data.usage.is_byok 
        ? (data.usage.cost_details?.upstream_inference_cost || 0) 
        : (data.usage.cost || 0);
      cost = Number(rawCost) || 0;
    }

    return { results: content, cost, tokens: data.usage?.total_tokens || 0 };
  } catch (e) {
    console.error("Search error:", e);
    return { results: "Search errored.", cost: 0, tokens: 0 };
  }
}

async function withAiRetry(fn, retries = 2) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      console.warn(`AI Attempt ${i + 1} failed:`, e);
      lastError = e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

function getStoredApiKey() {
  const encryptedApiKey = localStorage.getItem('openrouter-api-key-encrypted');
  if (!encryptedApiKey) return '';
  // Yes I know, this is not secure, but it's better than nothing ;-)
  const API_KEY_ENCRYPTION_KEY = 'mmw_encryption_key_2024';
  try {
    const decoded = atob(encryptedApiKey);
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const keyChar = API_KEY_ENCRYPTION_KEY.charCodeAt(i % API_KEY_ENCRYPTION_KEY.length);
      const encryptedChar = decoded.charCodeAt(i);
      decrypted += String.fromCharCode(encryptedChar ^ keyChar);
    }
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return '';
  }
}

const SYSTEM_PROMPT = `You are the AI Mind Map Editor for Mind Map Wizard.
Your core objective is to modify the user's mind map structure based on their natural language request OR trigger specific frontend actions like exports.

INPUT DATA
You will process three inputs:
1. "Current Mind Map": The complete JSON structure of the current map.
2. "Chat History": Previous context and interactions.
3. "User Request": The immediate instruction to execute.

CRITICAL PROTOCOL: NODE IDENTIFICATION
You must strictly adhere to the existing ID structure.
- Every node in the "Current Mind Map" JSON has a unique "id" (e.g., "lx8k9a2b3c").
- MATCHING: When updating or deleting, you MUST use the exact "id" string found in the input JSON. Do not invent or guess IDs for existing nodes.
- TRAVERSAL: When editing multiple nodes, scan the entire JSON tree (including nested "children" arrays) to find all matching nodes and their IDs.

OUTPUT FORMAT
You must output a SINGLE valid JSON object. No markdown formatting outside the JSON, no conversational filler.

JSON Structure:
{
  "message": "A short, helpful response to the user describing what you did in their language.",
  "commands": [
    { "action": "delete", "id": "node_id" },
    { "action": "update", "id": "node_id", "data": { "content": "...", "notes": "..." } },
    { "action": "update-settings", "data": { "style": 1, "spacing": 40 } },
    { "action": "add", "id": "parent_id", "data": { "content": "...", "children": [...] } },
    { "action": "contact-team", "data": { "message": "A detailed message for the MMW team" } }
  ],
  "frontendCommand": null,
  "webSearchQuery": "Optional search term string"
}

COMMAND EXECUTION LOGIC

1. Modification Actions
- delete: Removes a node and its children. Required: "id" (the node to remove).
- update: Modifies a specific node's data. Required: "id" (the node to change). Supported data fields: content, notes, branchColor, collapsed (boolean), citations (array of title, url), checked (boolean — marks the node's checkbox as checked/unchecked).
- add: Adds a new child node to a parent. Required: "id" (the PARENT node ID). Supported data fields: content, notes, branchColor, citations, checked (boolean), children (nested array for multi-level additions). Efficiency: Use nested "children" arrays to add whole branches in a single command rather than multiple separate add commands.
- update-settings: Modifies global map aesthetics. Use this for global changes (fonts, spacing, styles). Do not use node IDs for this action.
- You can not see or insert images into the mind map but the user can upload them via by clicking on any node and selecting "add image" in the menu appearing. If the user asks for images, you must tell them to upload them manually.
- If a user requests that: they can manually upload pdf files and generate mind map summaries from them by clicking the plus button in the top left corner and selecting "upload pdf".

2 Checkbox Feature
- To add a checkbox node, include "checked": false (unchecked) or "checked": true (checked) in the "data" of an "add" or "update" command.
- To toggle or update a checkbox state, use an "update" command with "data": { "checked": true } or "data": { "checked": false }.
- Example — add a to-do item: { "action": "add", "id": "parent_id", "data": { "content": "Buy groceries", "checked": false } }
- Only set "checked" when the user explicitly deals with checkboxes or to-do items. Do not add "checked" to regular nodes.

3. Content vs. Notes Guidelines
- Node Content: This is the primary label. Put the actual information and facts here, you can also use it for short phrases.
- Node Notes: Use "notes" ONLY for text with more than 300 characters. Do not create notes for shorter texts than that. The rest must be written into mind map nodes.
- Rule: Do not put single sentences or short phrases in "notes". If the text is short, it belongs in "content".
- Formatting: Notes support Markdown (bold, italic, strike, links but not images or code!). T


4. Visual & Styling Logic
- Branch Colors: defined as RGB strings. You should not change the color of single branches unless the user asks for it.
- Inheritance: Children inherit the parent's color unless defined otherwise.
- Global Color Change: To change the color of the entire map, update the "branchColor" of the Root Node only. The renderer handles the rest.
- Global Settings Reference (for update-settings):
  - style: 1 (Boxed/Default), 2 (Text only/No background), 4 (Line style).
  - branchAlignmentMode: "balanced" | "right".
  - spacing: Integer [20-80]. 20=compact, 80=sparse. (Recommended: 20-40).
  - border-radius: Integer [0-30]. 0=square, 20=pill. (Avoid >20).
  - linkWidth: Number [1-10]. (Recommended: 4).
  - fontFamily: "standard" (system-ui), "Open Runde", "PT Serif", "Montserrat", "Indie Flower" (Handwritten), "Roboto Mono", "Bebas Neue" (Avoid).
  - contextUrls: List of source URLs displayed as badges in the root title node.

ADVANCED CAPABILITIES

A. Web Search Protocol
- Trigger: Only if the user asks for current news, specific complex facts, or information you do not possess.
- Cost Warning: Search is expensive. Do NOT trigger search for general knowledge or if you are reasonably sure.
- Workflow: If you populate "webSearchQuery", the system will pause, fetch results, and return them to you in the next step to refine the answer.
- Citations: If you write notes based on search, include the source as a markdown link in the note text like this: [Source Name](URL)

B. Frontend Commands
Set "frontendCommand" for UI actions (exporting/sharing). You may return empty "commands" [] if only a frontend action is required.

Supported Actions:
- Export:
  { "action": "export", "format": "svg" }
  { "action": "export", "format": "png" }
  { "action": "export", "format": "jpg" }
  { "action": "export", "format": "pdf" }
  { "action": "export", "format": "md" } (Markdown file)
- Share:
  { "action": "share" } (Generates link)

Examples:
- "Download as SVG" -> frontendCommand: { "action": "export", "format": "svg" }
- "Create a share link" -> frontendCommand: { "action": "share" }

C. Team Contact Protocol
- Trigger: ONLY if you believe the MMW team should be notified about a specific issue, technical anomaly, or if the user explicitly provides significant feedback (bug reports, feature requests, or specific praise) about their experience.
- Action: Use "contact-team" command. Required data: { "message": "..." }.
- Rule: Do not use this for every interaction. Only for when you have something that the developers should know about or theres a feature the user would like to see but is not available.

GENERAL RULES
1. Efficiency: Don't recreate the whole map. Use "update" for small changes.
2. Ambiguity: If the user says "delete this", infer context or do nothing and explain why in the "message".
3. Language: Respond in the same language as the User Request.
4. No-Op: If the user asks a question without data modification (and no search needed), return commands: [] and frontendCommand: null.
`;

export async function handleChatEdit(input, mmjson, chatHistory) {
  const apiKey = getStoredApiKey();
  
  if (!apiKey) {
    return {
      error: 'API_KEY_REQUIRED',
      message: 'Please configure your OpenRouter API key in settings.'
    };
  }

  try {
    if (!input || !mmjson) {
      return {
        error: 'Invalid input',
        message: 'Input and Mind Map JSON are required'
      };
    }

    const contextMessage = `
Current Mind Map JSON:
${JSON.stringify(mmjson).substring(0, 30000)} 
(Truncated if too large, but usually fits)

Chat History:
${JSON.stringify(chatHistory || [])}

User Request: "${input}"
`;

    const model = window.getSelectedModel ? window.getSelectedModel() : "google/gemini-3-flash-lite";

    const retryResult = await withAiRetry(async () => {
      const fetchAi = async (messages) => {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Mind Map Wizard'
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            response_format: { type: "json_object" },
            max_tokens: 3000,
            temperature: 0.4
          })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter error: ${response.status}`);
        }
        return await response.json();
      };

      const getCostFromData = (data) => {
        if (!data.usage) return 0;
        const rawCost = (data.usage.is_byok && data.usage.cost_details?.upstream_inference_cost) 
            ? data.usage.cost_details.upstream_inference_cost 
            : (data.usage.cost || 0);
        return Number(rawCost) || 0;
      };

      let data = await fetchAi([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contextMessage }
      ]);

      let aiContent = data.choices?.[0]?.message?.content;
      if (!aiContent) throw new Error("No content from AI");

      let parsedResponse;
      try {
          parsedResponse = JSON.parse(aiContent);
      } catch (e) {
           const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
           if (jsonMatch) parsedResponse = JSON.parse(jsonMatch[0]);
           else throw new Error("Invalid JSON from AI");
      }

      let totalCost = getCostFromData(data);
      let totalTokens = data.usage?.total_tokens || 0;
      let searchUsed = false;
      let searchQuery = null;

      if (parsedResponse.webSearchQuery) {
          searchUsed = true;
          searchQuery = parsedResponse.webSearchQuery;
          const searchResult = await performAiSearch(searchQuery, apiKey);
          totalCost += searchResult.cost;
          totalTokens += searchResult.tokens;

          const repromptMessage = `
Web Search Results for "${searchQuery}":
${searchResult.results}

Please now fulfill the original user request using this information.
Original User Request: "${input}"
          `;

          data = await fetchAi([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: contextMessage },
            { role: "assistant", content: aiContent },
            { role: "user", content: repromptMessage }
          ]);

          aiContent = data.choices?.[0]?.message?.content;
          if (!aiContent) throw new Error("No content from AI after search reprompt");

          totalCost += getCostFromData(data);
          totalTokens += data.usage?.total_tokens || 0;

          try {
              parsedResponse = JSON.parse(aiContent);
          } catch (e) {
               const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
               if (jsonMatch) parsedResponse = JSON.parse(jsonMatch[0]);
               else throw new Error("Invalid JSON from AI after search");
          }
      }

      const result = applyCommands(JSON.parse(JSON.stringify(mmjson)), parsedResponse.commands || []);
      
      if (parsedResponse.commands && parsedResponse.commands.length > 0 && !result.success) {
          throw new Error("AI generated commands that could not be applied (likely invalid IDs).");
      }

      return { aiContent, parsedResponse, result, searchUsed, totalCost, totalTokens, searchQuery };
    });

    const { parsedResponse, result, searchUsed, totalTokens } = retryResult;

    return {
      success: true,
      message: parsedResponse.message,
      modifiedMmJson: result.modifiedMmJson,
      logs: result.logs,
      commandsExecuted: parsedResponse.commands ? parsedResponse.commands.length : 0,
      frontendCommand: parsedResponse.frontendCommand || null,
      webSearchPerformed: searchUsed
    };

  } catch (err) {
    console.error("Chat Edit Error:", err);
    return {
      error: 'AI Error',
      message: err.message
    };
  }
}

window.handleChatEdit = handleChatEdit;