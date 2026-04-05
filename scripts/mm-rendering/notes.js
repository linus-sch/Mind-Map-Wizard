const activeNotesGenerations = new Set();

const CITATION_BLOCK_START = '<!--MM_CITATIONS_DATA:';
const CITATION_BLOCK_END = '-->';

function parseNodeNotes(rawNotes) {
    if (!rawNotes) return { text: '', citations: [] };

    const startIdx = rawNotes.lastIndexOf(CITATION_BLOCK_START);
    if (startIdx !== -1) {
        const endIdx = rawNotes.indexOf(CITATION_BLOCK_END, startIdx);
        if (endIdx !== -1) {
            try {
                const jsonStr = rawNotes.substring(startIdx + CITATION_BLOCK_START.length, endIdx);
                const citations = JSON.parse(jsonStr);
                const text = rawNotes.substring(0, startIdx).trim();
                if (window.dataLayer) {
                    window.dataLayer.push({
                        event: 'mm_notes_opened'
                    });
                }
                if (window.rybbit) {
                    window.rybbit.event("mm_notes_opened", {});
                }
                return { text, citations };
            } catch (e) {
                console.warn('Failed to parse citation metadata', e);
            }
        }
    }
    return { text: rawNotes, citations: [] };
}

function serializeNodeNotes(text, citations) {
    if (!citations || citations.length === 0) return text;

    const cleanCitations = citations.map(c => ({
        title: c.title || '',
        url: c.url || ''
    }));

    return `${text.trim()}\n\n${CITATION_BLOCK_START}${JSON.stringify(cleanCitations)}${CITATION_BLOCK_END}`;
}

function isImageNode(node) {
    if (!node || !node.text) return false;
    return /^(local|remote):img-/.test(node.text.trim());
}

function showAIResearchButton(editorDiv, nodeId, drawer) {
    let btn = drawer.querySelector('.notes-ai-research-btn');
    if (btn) btn.remove();

    if (isImageNode(findNodeByIdGlobal(currentHierarchy, nodeId))) return;
    if (window.MMW_READONLY) return;

    btn = document.createElement('button');
    btn.className = 'notes-ai-research-btn';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-linecap="round" stroke-linejoin="round" ><path d="M18.5 3.05 Q19.08 5.93 21.95 6.5 Q19.08 7.08 18.5 9.95 Q17.92 7.08 15.05 6.5 Q17.92 5.93 18.5 3.05 Z" stroke-width="1.5" /><path d="M8.5 7.7 Q9.56 13.44 15.3 14.5 Q9.56 15.56 8.5 21.3 Q7.44 15.56 1.7 14.5 Q7.44 13.44 8.5 7.7 Z" stroke-width="1.7" /></svg> AI Research`;
    btn.title = 'Generate AI summary';
    btn.onclick = () => {
        const node = findNodeByIdGlobal(currentHierarchy, nodeId);
        const { text, citations } = parseNodeNotes(node ? node.notes : '');
        const hasContent = (text && text.trim() !== '') || (citations && citations.length > 0);

        if (hasContent) {
            showAIReplaceConfirmPopup(nodeId, editorDiv);
        } else {
            startAIGeneration(nodeId, editorDiv);
        }
    };

    const header = drawer.querySelector('.notes-drawer-header');
    const closeBtn = drawer.querySelector('#notes-drawer-close');
    if (header && closeBtn) {
        header.insertBefore(btn, closeBtn);
    }
}

function showAIReplaceConfirmPopup(nodeId, editorDiv) {
    let existing = document.querySelector('.notes-ai-confirm-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'notes-ai-confirm-popup';
    popup.innerHTML = `
<div class="notes-ai-confirm-content">
            <p>Generating an AI summary will replace your current notes.</p>
            <div class="notes-ai-confirm-actions">
                <button class="notes-ai-confirm-cancel">Cancel</button>
                <button class="notes-ai-confirm-generate">Generate</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    popup.querySelector('.notes-ai-confirm-cancel').onclick = () => popup.remove();
    popup.querySelector('.notes-ai-confirm-generate').onclick = () => {
        popup.remove();
        const node = findNodeByIdGlobal(currentHierarchy, nodeId);
        if (node) {
            delete node.notes;
            delete node.citations;
        }
        startAIGeneration(nodeId, editorDiv);
    };
}

const SKELETON_HTML = '<div class="notes-loading-skeleton">' +
    '<div class="skeleton-line" style="width: 100%;"></div>' +
    '<div class="skeleton-line" style="width: 94%;"></div>' +
    '<div class="skeleton-line" style="width: 98%;"></div>' +
    '<div class="skeleton-line" style="width: 65%;"></div>' +
    '<div class="skeleton-line" style="width: 100%; margin-top: 12px;"></div>' +
    '<div class="skeleton-line" style="width: 88%;"></div>' +
    '<div class="skeleton-line" style="width: 96%;"></div>' +
    '<div class="skeleton-line" style="width: 91%;"></div>' +
    '<div class="skeleton-line" style="width: 45%;"></div>' +
    '</div>';

function showLoadingSkeleton(editorDiv) {
    editorDiv.innerHTML = SKELETON_HTML;
}

function startAIGeneration(nodeId, editorDiv) {
    if (activeNotesGenerations.has(nodeId)) return;
    showLoadingSkeleton(editorDiv);
    generateNotesWithAI(nodeId, editorDiv);
}

window.openNotesDrawer = function (nodeId, source) {
    closeContextMenus();
    const node = findNodeByIdGlobal(currentHierarchy, nodeId);
    if (!node) return;
    if (source === 'longpress' && window.playHaptic) window.playHaptic('1');

    const drawer = document.getElementById('notes-drawer');
    const title = document.getElementById('notes-drawer-title');
    const editorDiv = document.getElementById('notes-drawer-editor');

    const isReadOnly = window.MMW_READONLY;
    const isImage = isImageNode(node);

    window.__mmwNotesActiveNodeId = nodeId;
    if (typeof window.__mmwApplyNotesOutline === 'function') window.__mmwApplyNotesOutline();

    if (drawer && title && editorDiv) {
        if (isImage) {
            title.textContent = 'Image';
        } else {
            title.textContent = (node.text || 'Node Notes').replace(/[#*`_~\[\]()]/g, '');
        }
        editorDiv.setAttribute('data-node-id', nodeId);

        editorDiv.setAttribute('contenteditable', isReadOnly ? 'false' : 'true');
        if (isReadOnly) {
            editorDiv.classList.add('readonly-mode');
        } else {
            editorDiv.classList.remove('readonly-mode');
        }

        const oldBtn = drawer.querySelector('.notes-ai-research-btn');
        if (oldBtn) oldBtn.remove();

        const { text, citations } = parseNodeNotes(node.notes);

        editorDiv.currentCitations = citations;
        node.citations = citations;

        if ((!text || text.trim() === '') && (!citations || citations.length === 0)) {
            if (isReadOnly) {
                editorDiv.innerHTML = '<div style="opacity: 0.6; font-style: italic; padding: 10px;">No notes available.</div>';
                drawer.classList.add('open');
                return;
            }

            if (source === 'longpress' && !isImage && !activeNotesGenerations.has(nodeId)) {
                showLoadingSkeleton(editorDiv);
                drawer.classList.add('open');
                setTimeout(() => generateNotesWithAI(nodeId, editorDiv), 350);
            } else {
                editorDiv.innerHTML = '';
                drawer.classList.add('open');
                if (!isReadOnly) {
                    setTimeout(() => editorDiv.focus(), 100);
                }
            }
            if (source !== 'longpress') {
                showAIResearchButton(editorDiv, nodeId, drawer);
            }
        } else {
            editorDiv.innerHTML = renderNotes(text, citations, true, true);
            drawer.classList.add('open');
            animateResourcesIn(editorDiv);
            showAIResearchButton(editorDiv, nodeId, drawer);
            if (!isReadOnly) {
                setTimeout(() => editorDiv.focus(), 100);
            }
        }
    }
};

window.closeNotesDrawer = function () {
    try {
        const drawer = document.getElementById('notes-drawer');
        if (!drawer) return; 

        drawer.classList.remove('open');
        window.__mmwNotesActiveNodeId = null;
        if (typeof window.__mmwApplyNotesOutline === 'function') window.__mmwApplyNotesOutline();
        const editorDiv = document.getElementById('notes-drawer-editor');

        if (window.MMW_READONLY) {
            if (editorDiv && typeof editorDiv.blur === 'function') editorDiv.blur();
            return;
        }

        if (editorDiv) {
            const nodeId = editorDiv.getAttribute('data-node-id');
            
            const canSearch = typeof findNodeByIdGlobal === 'function' && typeof currentHierarchy !== 'undefined';
            
            if (nodeId && canSearch) {
                const node = findNodeByIdGlobal(currentHierarchy, nodeId);
                if (node) {
                    const val = editorDiv.innerText;
                    if (!val || val.trim() === '') {
                        delete node.notes;
                        delete node.citations;

                        if (typeof __mmwComposeJsonWithCurrentSettings === 'function') {
                            const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
                            
                            const editorEl = (typeof editor !== 'undefined') ? editor : document.getElementById('json-editor');
                            if (editorEl) editorEl.value = json;

                            try {
                                if (typeof localStorageKey !== 'undefined') {
                                    localStorage.setItem(localStorageKey, json);
                                }
                            } catch (lsError) {}

                            if (typeof triggerAutoSave === 'function') triggerAutoSave();
                            if (typeof window.updateMindMap === 'function') {
                                window.updateMindMap();
                            } else if (typeof updateMindMap === 'function') {
                                updateMindMap();
                            }
                        }
                    }
                }
            }
            if (typeof editorDiv.blur === 'function') editorDiv.blur();
        }
    } catch (err) {
        console.warn("closeNotesDrawer failed silently:", err); 
    }
};

window.getNotesTopic = function (nodeId) {
    if (!currentHierarchy) return '';

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const targetNode = findNodeById(currentHierarchy, nodeId);
    if (!targetNode) return '';

    const path = [];
    let curr = targetNode;
    while (curr) {
        path.unshift(curr);
        curr = curr.parent;
    }

    if (path.length === 0) return '';

    const formattedPath = path.map((node, index) => {
        const level = index + 1;
        const prefix = level <= 6 ? '#'.repeat(level) : '-';
        return `${prefix} ${node.text}`;
    });

    const topic = formattedPath[formattedPath.length - 1];
    const context = formattedPath.slice(0, -1).join(' ');

    return context ? `Topic: ${topic} (In the context of: ${context}):` : `Topic: ${topic}:`;
};

async function generateNotesWithAI(nodeId, editorDiv) {
    if (window.MMW_READONLY) return; 

    if (activeNotesGenerations.has(nodeId)) return;

    const node = findNodeByIdGlobal(currentHierarchy, nodeId);
    if (!node) return;

    activeNotesGenerations.add(nodeId);

    try {
        const branchContext = window.getBranchContext ? window.getBranchContext(nodeId) : '';
        const context = branchContext || node.text;

        const apiKey = typeof getStoredApiKey === 'function' ? getStoredApiKey() : '';
        if (!apiKey) {
            if (typeof showApiKeyPopup === 'function') {
                showApiKeyPopup(() => generateNotesWithAI(nodeId, editorDiv));
            }
            return;
        }

        const useWebSearch = typeof window.MMW_USE_WEB_SEARCH === 'boolean' ? window.MMW_USE_WEB_SEARCH : true;
        const searchInstruction = useWebSearch
            ? '3. Search the web for current, factual information about ONLY the target topic'
            : '3. Use your internal knowledge base to provide factual information about ONLY the target topic';

        const systemPrompt = `You are a research assistant. Your task:

        1. Identify the node with the LOWEST hierarchy (fewest # symbols) - this is your target topic
        2. The other nodes with more # symbols are only context - DO NOT write about them
        ${searchInstruction}
        4. Write a concise, information-dense summary of exactly 600 characters (±50)
        5. Use clear, simple language
        6. Do not mention the character count in your response
        7. The generated notes should be in the same language as the context.

        Example: If given "## Physics > ### Quantum > #### Entanglement", write ONLY about Entanglement (4 #'s = lowest hierarchy).`;

        const plugins = useWebSearch ? [{ id: 'web', max_results: 3 }] : [];

        const requestPayload = {
            model: typeof getSelectedModel === 'function' ? getSelectedModel() : 'google/gemini-2.5-flash-lite',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: context }
            ],
            max_tokens: 450,
            temperature: 0.3,
            plugins,
            stream: true,
            reasoning: { exclude: true }
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Mind Map Wizard'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) {
                throw new Error('Invalid OpenRouter API key. Please check your API key and try again.');
            }
            if (response.status === 402) {
                throw new Error('Insufficient credits on your OpenRouter account.');
            }
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw new Error(errorData.error?.message || errorData.message || `Error ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let fullText = '';
        let citations = [];
        let isFirstChunk = true;
        let lineBuffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            lineBuffer += chunk;
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const jsonStr = line.substring(6);
                        const data = JSON.parse(jsonStr);

                        if (data.choices?.[0]?.delta) {
                            const delta = data.choices[0].delta;

                            if (delta.annotations) {
                                delta.annotations.forEach(annotation => {
                                    if (annotation.type === 'url_citation' && annotation.url_citation) {
                                        citations.push({
                                            title: annotation.url_citation.title,
                                            url: annotation.url_citation.url
                                        });
                                    }
                                });
                            }

                            if (delta.content) {
                                const content = delta.content;
                                fullText += content;

                                if (isFirstChunk) {
                                    editorDiv.innerHTML = '';
                                    isFirstChunk = false;
                                }

                                editorDiv.currentCitations = citations;
                                editorDiv.innerHTML = renderNotes(fullText, citations, false);
                                editorDiv.scrollTop = editorDiv.scrollHeight;
                            }
                        }
                    } catch (e) { }
                }
            }
        }

        editorDiv.currentCitations = citations;
        editorDiv.innerHTML = renderNotes(fullText, citations, true, true);
        animateResourcesIn(editorDiv);


        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'mm_notes_generated'
            });
        }
        if (window.rybbit) {
            window.rybbit.event("mm_notes_opened", {});
        }
        node.citations = citations;
        if (!fullText || fullText.trim() === '') {
            delete node.notes;
        } else {
            node.notes = serializeNodeNotes(fullText, citations);
        }

        const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
        const editorEl = (typeof editor !== 'undefined') ? editor : document.getElementById('json-editor');
        if (editorEl) editorEl.value = json;
        localStorage.setItem(localStorageKey, json);
        triggerAutoSave();
        if (typeof window.updateMindMap === 'function') {
            window.updateMindMap();
        }

        setTimeout(() => {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editorDiv);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            editorDiv.focus();
        }, 100);

    } catch (error) {
        console.error('Notes generation error:', error);
        if (!window.MMW_READONLY) {
            editorDiv.innerHTML = `<div class="notes-error">Failed to generate notes.<br><span class="retry-btn" onclick="window.openNotesDrawer('${nodeId}')">Retry</span></div>`;
        } else {
            editorDiv.innerHTML = `<div class="notes-error">Failed to generate notes.</div>`;
        }
    } finally {
        activeNotesGenerations.delete(nodeId);
    }
}

function renderResources(citations, shouldAnimate = false) {
    if (!citations || !Array.isArray(citations) || citations.length === 0) return '';

    const resources = [];
    const embeds = [];

    citations.forEach(cit => {
        if (!cit || !cit.url) return;

        const isYt = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/.exec(cit.url);
        if (isYt) {
            embeds.push({ url: cit.url, id: isYt[1] });
        } else {
            let hostname = '';
            try { hostname = new URL(cit.url).hostname; } catch (e) { }
            const favicon = hostname ? `https://icons.duckduckgo.com/ip3/${hostname}.ico` : '';
            resources.push({ ...cit, favicon });
        }
    });

    if (resources.length === 0 && embeds.length === 0) return '';

    const animClass = shouldAnimate ? ' pending-animation' : '';

    let html = '<div class="notes-resources" contenteditable="false">';
    html += '<h3 class="notes-resources-title">Ressources</h3>';

    if (resources.length > 0) {
        html += '<ul class="notes-resources-list">';
        resources.forEach(r => {
            html += `<li class="notes-resources-item${animClass}"><a href="${escapeHtml(r.url)}" target="_blank" class="notes-resources-link">${r.favicon ? `<img src="${r.favicon}" class="notes-resources-favicon" onerror="this.style.display='none'">` : ''}<span class="notes-resources-text">${escapeHtml(r.title || r.url)}</span></a></li>`;
        });
        html += '</ul>';
    }

    if (embeds.length > 0) {
        html += '<div class="notes-resources-embeds">';
        embeds.forEach(yt => {
            html += `<div class="notes-resources-embed${animClass}">
                <iframe src="https://www.youtube.com/embed/${yt.id}" frameborder="0" allowfullscreen style="width: 100%; aspect-ratio: 16/9; display: block;"></iframe>
            </div>`;
        });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function getFaviconUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        return hostname ? `https://icons.duckduckgo.com/ip3/${hostname}.ico` : '';
    } catch (e) {
        return '';
    }
}

function renderNotes(text, citations = [], showResources = true) {
    let processed = text ? escapeHtml(text) : '';

    processed = processed.replace(/^#\s+(.*$)/gm, '<h1 style="margin: 0.54rem 0; font-size: 1.5rem; font-weight: bold;">$1</h1>');
    processed = processed.replace(/^##\s+(.*$)/gm, '<h2 style="margin:0.5rem 0; font-size: 1.3rem; font-weight: bold;">$1</h2>');
    processed = processed.replace(/^###\s+(.*$)/gm, '<h3 style="margin: 0.5rem 0; font-size: 1.1rem; font-weight: bold;">$1</h3>');
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');
    processed = processed.replace(/^\s*-\s+(.*$)/gm, '<li>$1</li>');
    processed = processed.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px;">$1</code>');
    processed = processed.replace(/\n/g, '<br>');

    processed = processed.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (match, text, url) => {
        const fav = getFaviconUrl(url);
        const imgHtml = fav ? `<img src="${fav}" class="inline-note-favicon" style="width:14px; height:14px; vertical-align: middle; margin-right: 4px; opacity: 0.8;" contenteditable="false">` : '';
        const className = fav ? 'notes-link favicon' : 'notes-link';
        return `<a href="${url}" target="_blank" class="${className}" style="white-space: nowrap;">${imgHtml}${text}</a>`;
    });

    processed = processed.replace(/\[([^\]<]+)\](?!\()/g, (match, content) => {
        const parts = content.split(',').map(p => p.trim());

        const linkedParts = parts.map(part => {
            if (citations && citations.length > 0) {
                const matched = citations.find(c =>
                    c.url && c.url.toLowerCase().includes(part.toLowerCase())
                );

                if (matched && matched.url) {
                    const fav = getFaviconUrl(matched.url);
                    const imgHtml = fav ? `<img src="${fav}" class="inline-note-favicon" style="width:14px; height:14px; vertical-align: middle; margin-right: 4px; opacity: 0.8; margin-bottom: 2.5px;" contenteditable="false">` : '';
                    const className = fav ? 'notes-link favicon' : 'notes-link';
                    return `<a href="${matched.url}" target="_blank" class="${className}">${imgHtml}${part}</a>`;
                }
            }

            if (part.includes('.') && !/\s/.test(part)) {
                try {
                    let urlStr = part;
                    if (!urlStr.startsWith('http')) urlStr = 'https://' + urlStr;
                    const urlObj = new URL(urlStr);

                    const fav = getFaviconUrl(urlObj.href);
                    const imgHtml = fav ? `<img src="${fav}" class="inline-note-favicon" style="width:14px; height:14px; vertical-align: middle; margin-right: 4px; opacity: 0.8; margin-bottom: 2.5px;" contenteditable="false">` : '';
                    const className = fav ? 'notes-link favicon' : 'notes-link';

                    return `<a href="${urlObj.href}" target="_blank" class="${className}">${imgHtml}${part}</a>`;
                } catch (e) {
                }
            }

            return part;
        });

        return linkedParts.join(', ');
    });

    const urlOrTagRegex = /(<a\s[^>]*>.*?<\/a>)|(https?:\/\/[^\s<"']+)/g;
    processed = processed.replace(urlOrTagRegex, (match, existingTag, rawUrl) => {
        if (existingTag) return existingTag;

        const ytMatch = rawUrl.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
        if (ytMatch && ytMatch[1]) {
            return `<a href="${rawUrl}" target="_blank" class="notes-link">${rawUrl}</a><div class="yt-embed" contenteditable="false"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
        }

        return `<a href="${rawUrl}" target="_blank" class="notes-link">${rawUrl}</a>`;
    });

    if (showResources) {
        processed += renderResources(citations);
    }

    return processed;
}


function getCursorOffset(root) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return { start: 0, end: 0 };
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer)) return { start: 0, end: 0 };

    const calc = (isStart) => {
        const targetContainer = isStart ? range.startContainer : range.endContainer;
        const targetOffset = isStart ? range.startOffset : range.endOffset;

        const pointRange = document.createRange();
        pointRange.setStart(targetContainer, targetOffset);
        pointRange.setEnd(targetContainer, targetOffset);

        let total = 0;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, null);
        let node;

        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node === targetContainer) {
                    total += targetOffset;
                    return total;
                }
                const nodeRange = document.createRange();
                nodeRange.selectNodeContents(node);
                if (pointRange.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0) {
                    total += node.nodeValue.length;
                }
            } else if (node.tagName === 'BR') {
                const nodeRange = document.createRange();
                nodeRange.selectNode(node);
                if (pointRange.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0) {
                    total += 1;
                }
            }
        }
        return total;
    };

    return { start: calc(true), end: calc(false) };
}

function setTextOffset(root, startOffset, endOffset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, null);
    let node;
    let current = 0;
    let startNode = null, startOff = 0, endNode = null, endOff = 0;
    let foundStart = false, foundEnd = false;

    function check(len, isBr) {
        if (!foundStart) {
            if (current + len >= startOffset) {
                if (isBr) {
                    if (startOffset === current) {
                        startNode = node.parentNode;
                        startOff = Array.prototype.indexOf.call(startNode.childNodes, node);
                        foundStart = true;
                    } else {
                        startNode = node.parentNode;
                        startOff = Array.prototype.indexOf.call(startNode.childNodes, node) + 1;
                        foundStart = true;
                    }
                } else {
                    startNode = node;
                    startOff = startOffset - current;
                    foundStart = true;
                }
            }
        }
        if (!foundEnd) {
            if (current + len >= endOffset) {
                if (isBr) {
                    if (endOffset === current) {
                        endNode = node.parentNode;
                        endOff = Array.prototype.indexOf.call(endNode.childNodes, node);
                        foundEnd = true;
                    } else {
                        endNode = node.parentNode;
                        endOff = Array.prototype.indexOf.call(endNode.childNodes, node) + 1;
                        foundEnd = true;
                    }
                } else {
                    endNode = node;
                    endOff = endOffset - current;
                    foundEnd = true;
                }
            }
        }
    }

    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
            check(node.nodeValue.length, false);
            current += node.nodeValue.length;
        } else if (node.tagName === 'BR') {
            check(1, true);
            current += 1;
        }
        if (foundStart && foundEnd) break;
    }

    if (foundStart && foundEnd) {
        const range = document.createRange();
        range.setStart(startNode, startOff);
        range.setEnd(endNode, endOff);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function initNotesDrawer() {
    const closeBtn = document.getElementById('notes-drawer-close');
    const editorDiv = document.getElementById('notes-drawer-editor');

    if (closeBtn) {
        closeBtn.addEventListener('click', window.closeNotesDrawer);
    }

    if (editorDiv) {
        editorDiv.addEventListener('input', (e) => {
            if (window.MMW_READONLY) return;

            const nodeId = e.target.getAttribute('data-node-id');
            if (activeNotesGenerations.has(nodeId)) return;
            const node = findNodeByIdGlobal(currentHierarchy, nodeId);

            if (node) {
                const resourcesBlock = editorDiv.querySelector('.notes-resources');
                if (resourcesBlock) {
                    resourcesBlock.remove();
                }

                const val = domToMarkdown(e.target);
                const { start: startOffset, end: endOffset } = getCursorOffset(e.target);
                const currentCitations = editorDiv.currentCitations || node.citations || [];

                if (!val || val.trim() === '') {
                    delete node.notes;
                    delete node.citations;
                } else {
                    node.notes = serializeNodeNotes(val, currentCitations);
                    node.citations = currentCitations;
                }

                e.target.innerHTML = renderNotes(val, currentCitations, false);

                if (resourcesBlock) {
                    e.target.appendChild(resourcesBlock);
                } else if (currentCitations.length > 0) {
                    const resHtml = renderResources(currentCitations);
                    if (resHtml) e.target.insertAdjacentHTML('beforeend', resHtml);
                }

                setTextOffset(e.target, startOffset, endOffset);

                const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
                const editorEl = (typeof editor !== 'undefined') ? editor : document.getElementById('json-editor');
                if (editorEl) editorEl.value = json;
                localStorage.setItem(localStorageKey, json);
                triggerAutoSave();
                if (typeof window.updateMindMap === 'function') {
                    window.updateMindMap();
                } else if (typeof updateMindMap === 'function') {
                    updateMindMap();
                }
            }
        });

        editorDiv.addEventListener('click', (e) => {
            let target = e.target;
            if (target.tagName === 'IMG' && target.parentElement.tagName === 'A') {
                target = target.parentElement;
            }
            if (target.nodeType === Node.TEXT_NODE) target = target.parentElement;

            if (target.tagName === 'A') {
                window.open(target.href, '_blank');
                return;
            }
        });
    }
}


function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function findNodeByIdGlobal(node, id) {
    if (!node) return null;
    if (node.id === id) return node;

    if (node.children) {  
        for (const child of node.children) {
            const found = findNodeByIdGlobal(child, id);
            if (found) return found;
        }
    }
    
    return null;
}


function domToMarkdown(node) {
    function processChildren(n) {
        let res = '';
        for (const child of n.childNodes) {
            const isBlock = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE'].includes(child.tagName);
            if (isBlock && res.length > 0 && !res.endsWith('\n')) {
                res += '\n';
            }
            res += convert(child);
        }
        return res;
    }

    function convert(n) {
        if (n.nodeType === Node.TEXT_NODE) return n.textContent;
        if (n.nodeType !== Node.ELEMENT_NODE) return '';

        if (n.classList && (n.classList.contains('yt-embed') || n.classList.contains('citation-tooltip') || n.classList.contains('notes-resources'))) return '';

        const tagName = n.tagName;
        if (tagName === 'DIV' || tagName === 'P') {
            const content = processChildren(n);
            return content ? content + '\n' : '\n';
        }
        if (tagName === 'BR') return '\n';
        if (tagName === 'H1') return '# ' + processChildren(n) + '\n';
        if (tagName === 'H2') return '## ' + processChildren(n) + '\n';
        if (tagName === 'H3') return '### ' + processChildren(n) + '\n';
        if (tagName === 'LI') return '- ' + processChildren(n) + '\n';
        if (tagName === 'B' || tagName === 'STRONG') return '**' + processChildren(n) + '**';
        if (tagName === 'I' || tagName === 'EM') return '*' + processChildren(n) + '*';
        if (tagName === 'CODE') return '`' + processChildren(n) + '`';

        if (tagName === 'A') {
            const href = n.getAttribute('href') || '';
            const text = n.textContent;

            if (!text || text.trim() === '') {
                return '';
            }

            if (text === href) {
                return text;
            }

            return `[${text}](${href})`;
        }

        return processChildren(n);
    }

    return processChildren(node);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotesDrawer);
} else {
    initNotesDrawer();
}

function animateResourcesIn(editorDiv) {
    if (!document.getElementById('mm-resources-anim-style')) {
        const style = document.createElement('style');
        style.id = 'mm-resources-anim-style';
        style.textContent = `
            @keyframes mmSlideInFade {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .notes-resources-item.pending-animation, 
            .notes-resources-embed.pending-animation {
                opacity: 0;
                transform: translateY(10px);
            }
            .mm-anim-active {
                opacity: 1;
                transform: translateY(0);
                animation: mmSlideInFade 0.3s ease-out forwards;
            }
        `;
        document.head.appendChild(style);
    }
    const items = editorDiv.querySelectorAll('.pending-animation');
    items.forEach((item, index) => {
        setTimeout(() => {
            item.classList.remove('pending-animation');
            item.classList.add('mm-anim-active');
        }, index * 40);
    });
}