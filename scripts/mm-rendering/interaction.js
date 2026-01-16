
let editor, preview, slider, editorContainer, appContainer, fitScreenBtn, editJsonBtn;
const localStorageKey = 'json-mindmap-content';
let scale = 1, isPanning = false;
let startPoint = { x: 0, y: 0 }, currentPoint = { x: 0, y: 0 };

const HistoryManager = {
    undoStack: [],
    redoStack: [],
    maxItems: 30,

    captureState: function () {
        if (!editor) return;
        const currentJson = editor.value;
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === currentJson) {
            return;
        }
        this.undoStack.push(currentJson);
        if (this.undoStack.length > this.maxItems) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateButtons();
    },

    undo: function () {
        if (this.undoStack.length === 0) return;
        if (!editor) return;

        const currentJson = editor.value;
        this.redoStack.push(currentJson);
        if (this.redoStack.length > this.maxItems) {
            this.redoStack.shift();
        }

        const prevState = this.undoStack.pop();
        editor.value = prevState;

        updateMindMap();
        triggerAutoSave();
        this.updateButtons();
    },

    redo: function () {
        if (this.redoStack.length === 0) return;
        if (!editor) return;

        const currentJson = editor.value;
        this.undoStack.push(currentJson);
        if (this.undoStack.length > this.maxItems) {
            this.undoStack.shift();
        }

        const nextState = this.redoStack.pop();
        editor.value = nextState;

        updateMindMap();
        triggerAutoSave();
        this.updateButtons();
    },

    updateButtons: function () {
        const undoBtn = document.getElementById('mm-undo-btn');
        const redoBtn = document.getElementById('mm-redo-btn');
        if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
    }
};

let lastRenderedStyle = null;

function getMindMapStyle(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        const settings = data['mm-settings'] || data.mmSettings || null;
        if (settings) {
            const ms = settings['style'] ?? settings.mindmapStyle ?? settings.theme;
            if (ms !== undefined && ms !== null) {
                const s = String(ms).toLowerCase().trim();
                if (s === 'clean') return '3';
                if (s === 'default') return '1';
                return s;
            }
        }
    } catch (e) { }
    return '1';
}

let currentHierarchy = null;
let previousHierarchy = null;

let autoSaveTimer = null;
const AUTO_SAVE_DEBOUNCE_MS = 500;

async function autoSaveMindMapToBackend() {
    if (!window.currentMindmap || !window.currentMindmap.id) {
        return;
    }

    if (!editor || !editor.value) {
        return;
    }

    if (typeof window.mmJsonToMarkdown !== 'function') {
        return;
    }

    if (typeof window.saveMindMap !== 'function' && typeof saveMindMap !== 'function') {
        return;
    }

    try {
        const jsonContent = editor.value;
        const markdown = jsonContent;

        const saveFn = window.saveMindMap || saveMindMap;
        await saveFn(
            window.currentMindmap.id,
            window.currentMindmapTitle || window.currentMindmap.title || 'Untitled',
            markdown
        );

        if (typeof window.getCachedMindmap === 'function' && typeof window.setCachedMindmap === 'function') {
            const cachedData = window.getCachedMindmap(window.currentMindmap.id);
            if (cachedData) {
                window.setCachedMindmap(window.currentMindmap.id, {
                    ...cachedData,
                    markdown: markdown,
                    updated_at: new Date().toISOString()
                });
            }
        }

        if (window.currentMarkdown !== undefined) {
            window.currentMarkdown = markdown;
        }

        if (window.extractTitleFromMindMapContent) {
            const newTitle = window.extractTitleFromMindMapContent(markdown);
            if (newTitle && newTitle !== 'Untitled Mind Map') {
                window.currentMindmapTitle = newTitle;
                document.title = `${newTitle} - Mind Map Wizard`;

                if (typeof window.updateSidebarItemTitle === 'function') {
                    window.updateSidebarItemTitle(window.currentMindmap.id, newTitle);
                }
            }
        }

    } catch (error) {
        console.error('Auto-save failed:', error);
    }
}

function triggerAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = setTimeout(() => {
        autoSaveMindMapToBackend();
        autoSaveTimer = null;
    }, AUTO_SAVE_DEBOUNCE_MS);
}


function initInteraction() {
    editor = document.getElementById('json-editor');
    preview = document.getElementById('svg-output');
    slider = document.getElementById('slider');
    editorContainer = document.getElementById('editor-container');
    appContainer = document.getElementById('app-container');
    fitScreenBtn = document.getElementById('fit-screen-btn');

    if (editor && preview) {
        const savedJson = localStorage.getItem(localStorageKey);
        if (savedJson && !window.MMW_READONLY) {
            editor.value = savedJson;
        } else {
            editor.value = JSON.stringify({
                "mm-settings": window.defaultMmSettings ? window.defaultMmSettings() : {
                    "spacing": 30,
                    "border-radius": 4
                },
                "mm-node": {
                    "content": "Mind Map Wizard",
                    "children": [
                        {
                            "content": "Right-click on a node for options",
                            "children": []
                        },
                        {
                            "content": "Double click to enter text",
                            "children": []
                        }
                    ]

                }
            }, null, 2);
        }
        updateMindMap();
        editor.addEventListener('input', () => {
            updateMindMap();
        });
        if (slider) slider.addEventListener('mousedown', startResize);
        attachCanvasListeners();

        const undoBtn = document.getElementById('mm-undo-btn');
        const redoBtn = document.getElementById('mm-redo-btn');
        if (undoBtn) undoBtn.addEventListener('click', () => HistoryManager.undo());
        if (redoBtn) redoBtn.addEventListener('click', () => HistoryManager.redo());

        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            if (isInput) return;

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

            if (cmdOrCtrl) {
                if (e.key === 'z' || e.key === 'Z') {
                    if (e.shiftKey) {
                        e.preventDefault();
                        HistoryManager.redo();
                    } else {
                        e.preventDefault();
                        HistoryManager.undo();
                    }
                } else if (e.key === 'y' || e.key === 'Y') {
                    if (!isMac) {
                        e.preventDefault();
                        HistoryManager.redo();
                    }
                }
            }
        });

        HistoryManager.updateButtons();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteraction);
} else {
    initInteraction();
}






window.__editingNodeId = null;

function __mmwGetCurrentSettings() {
    try {
        const data = JSON.parse(editor.value || '{}');
        return data['mm-settings'] || data.mmSettings || null;
    } catch {
        return null;
    }
}

function __mmwComposeJsonWithCurrentSettings(hierarchy) {
    try {
        const nodeOnly = JSON.parse(hierarchyToJson(hierarchy));
        const settings = __mmwGetCurrentSettings();
        if (settings && settings.style === '1') {
            delete settings.style;
        }
        const composed = settings ? { "mm-settings": settings, ...nodeOnly } : nodeOnly;
        return JSON.stringify(composed, null, 2);
    } catch {
        return hierarchyToJson(hierarchy);
    }
}

function updateMindMap() {
    if (!editor) {
        initInteraction();
        if (!editor) return;
    }
    const json = editor.value;
    if (!window.MMW_READONLY) {
        localStorage.setItem(localStorageKey, json);
    }

    let newHierarchy;
    let contextLinks = [];
    try {
        const data = JSON.parse(json);
        newHierarchy = { text: 'Root', children: [], level: 0, id: 'root' };
        if (data['mm-node']) {
            const jsonNode = data['mm-node'];
            const hierarchyNode = convertJsonToNode(jsonNode, 1, '0');
            newHierarchy.children.push(hierarchyNode);
        }
        contextLinks = data['mm-settings']?.contextUrls || [];
    } catch (e) {
        console.error('Invalid JSON:', e);
        newHierarchy = { text: 'Root', children: [], level: 0, id: 'root' };
    }

    const currentStyle = getMindMapStyle(json);
    const svg = preview.querySelector('svg');
    if (svg && previousHierarchy && lastRenderedStyle === currentStyle) {
        storePreviousPositions(previousHierarchy);
        updateSVGWithAnimations(newHierarchy, contextLinks);
    } else {
        lastRenderedStyle = currentStyle;
        const result = generateSVG(json, { contextUrls: contextLinks });
        const svgString = typeof result === 'string' ? result : result.svg;
        preview.innerHTML = svgString;
        if (result.updatedJson) {
            editor.value = result.updatedJson;
        }
        centerMindMap();

        const svgEl = preview.querySelector('svg');
        if (svgEl) {
            svgEl.classList.add('appearing');
            const stageEl = svgEl.querySelector('.mm-stage');
            if (stageEl) {
                stageEl.addEventListener('animationend', () => {
                    svgEl.classList.remove('appearing');
                }, { once: true });
            } else {
                svgEl.classList.remove('appearing');
            }
        }
    }

    function cloneHierarchy(node) {
        const clone = {
            text: node.text,
            children: node.children.map(cloneHierarchy),
            level: node.level,
            id: node.id,
            x: node.x,
            y: node.y,
            rectWidth: node.rectWidth,
            rectHeight: node.rectHeight,
            textLines: node.textLines ? [...node.textLines] : [],
            branchColor: node.branchColor
        };
        return clone;
    }
    previousHierarchy = cloneHierarchy(newHierarchy);
    currentHierarchy = newHierarchy;
    attachEventListeners();
}

const __mmwUpdateMindMapCore = updateMindMap;
updateMindMap = function () {
    if (!editor) return;
    const families = (typeof __mmwExtractFontFamiliesFromJson === 'function')
        ? __mmwExtractFontFamiliesFromJson(editor.value)
        : [];
    const sizePx = 16;

    if (document.fonts && document.fonts.load && document.fonts.check && families.length) {
        const pending = families
            .map(n => String(n).trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean)
            .filter(n => !document.fonts.check(`${sizePx}px "${n}"`));
        if (pending.length) {
            Promise.allSettled(pending.map(n => document.fonts.load(`${sizePx}px "${n}"`, 'BESbwy')))
                .finally(() => __mmwUpdateMindMapCore());
            return;
        }
    }
    __mmwUpdateMindMapCore();
};

window.updateMindMap = updateMindMap;

function storePreviousPositions(hierarchy) {
    function storePos(node) {
        if (node.x !== undefined) node._prevX = node.x;
        if (node.y !== undefined) node._prevY = node.y;
        if (node.rectWidth !== undefined) node._prevWidth = node.rectWidth;
        if (node.rectHeight !== undefined) node._prevHeight = node.rectHeight;
        node.children.forEach(storePos);
    }
    storePos(hierarchy);
}

function convertJsonToNode(jsonNode, level, pathId) {
    const node = {
        text: jsonNode.content || '',
        children: [],
        level: level,
        level: level,
        parent: null,
        id: pathId,
        branchColor: jsonNode.branchColor,
        collapsed: !!jsonNode.collapsed,
        notes: jsonNode.notes || ''
    };
    if (jsonNode.children && Array.isArray(jsonNode.children)) {
        jsonNode.children.forEach((childJson, index) => {
            const childPathId = `${pathId}-${index}`;
            const childNode = convertJsonToNode(childJson, level + 1, childPathId);
            childNode.parent = node;
            node.children.push(childNode);
        });
    }
    return node;
}

function attachEventListeners() {
    const svg = preview.querySelector('svg');
    if (!svg) return;

    let lastTouchTime = 0;

    const nodes = svg.querySelectorAll('.mm-node');
    nodes.forEach(node => {
        let clickCount = 0;
        let clickTimer = null;
        const clickDelay = 360;

        let longPressTimer = null;
        let isLongPress = false;
        const longPressDelay = 500;
        let startX = 0;
        let startY = 0;

        const handleStart = (e) => {
            if (e.type === 'touchstart') {
                lastTouchTime = Date.now();
            } else if (e.type === 'mousedown') {
                if (Date.now() - lastTouchTime < 1000) return;
            }

            if (e.target.closest && e.target.closest('.mm-add-btn')) return;

            if (longPressTimer) clearTimeout(longPressTimer);

            isLongPress = false;
            if (e.touches && e.touches.length > 0) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            longPressTimer = setTimeout(() => {
                isLongPress = true;
                const nodeId = node.getAttribute('data-node-id');
                if (window.openNotesDrawer) {
                    window.openNotesDrawer(nodeId);
                    if (navigator.vibrate) navigator.vibrate(50);
                }
            }, longPressDelay);
        };

        const handleMove = (e) => {
            if (!longPressTimer) return;

            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const moveThreshold = 10;
            if (Math.abs(clientX - startX) > moveThreshold || Math.abs(clientY - startY) > moveThreshold) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        const handleEnd = (e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            if (isLongPress) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();

                isPanning = false;
                if (preview) preview.classList.remove('panning');

                setTimeout(() => { isLongPress = false; }, 100);
            }
        };

        if (window.MMW_READONLY) return;

        node.addEventListener('touchstart', handleStart, { passive: true });
        node.addEventListener('touchmove', handleMove, { passive: true });
        node.addEventListener('touchend', handleEnd);

        node.addEventListener('mousedown', handleStart);
        node.addEventListener('mousemove', handleMove);
        node.addEventListener('mouseup', handleEnd);
        node.addEventListener('mouseleave', handleEnd);

        node.addEventListener('click', (e) => {
            if (isLongPress) {
                e.stopPropagation();
                e.preventDefault();
                return;
            }

            if (e.target.closest && e.target.closest('.mm-add-btn')) {
                return;
            }
            e.stopPropagation();
            clickCount++;

            if (clickTimer) {
                clearTimeout(clickTimer);
            }

            if (clickCount === 3) {
                editNodeText(node);
                clickCount = 0;
            } else {
                clickTimer = setTimeout(() => {
                    if (clickCount === 1) {
                        showContextMenu(e);
                    } else if (clickCount === 2) {
                        editNodeText(node);
                    }
                    clickCount = 0;
                }, clickDelay);
            }
        });

        node.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            editNodeText(node);
        });

        const addBtn = node.querySelector('.mm-add-btn');
        if (addBtn && !window.MMW_READONLY) {
            node.addEventListener('mouseenter', () => {
                addBtn.style.opacity = '1';
                addBtn.style.pointerEvents = 'auto';
                addBtn.style.transition = 'opacity 200ms ease, pointer-events 200ms ease';
            });
            node.addEventListener('mouseleave', () => {
                addBtn.style.opacity = '0';
                addBtn.style.pointerEvents = 'none';
                addBtn.style.transition = 'opacity 200ms ease, pointer-events 200ms ease';
            });
        }
    });

    if (!svg.__mmwAddBtnHandlerAttached) {
        svg.addEventListener('click', (e) => {
            const btn = e.target && typeof e.target.closest === 'function' ? e.target.closest('.mm-add-btn') : null;
            if (!btn) return;
            e.stopPropagation();
            e.preventDefault();
            const nodeGroup = btn.closest('.mm-node');
            const nodeId = nodeGroup ? nodeGroup.getAttribute('data-node-id') : btn.getAttribute('data-for-id');
            if (nodeId && typeof window.addChildNodeFor === 'function') {
                window.addChildNodeFor(nodeId);
            }
        });
        svg.__mmwAddBtnHandlerAttached = true;
    }

    if (!svg.__mmwExpandBtnHandlerAttached) {
        svg.addEventListener('click', (e) => {
            const btn = e.target && typeof e.target.closest === 'function' ? e.target.closest('.mm-expand-btn') : null;
            if (!btn) return;
            e.stopPropagation();
            e.preventDefault();
            const nodeId = btn.getAttribute('data-for-id');
            if (nodeId && typeof window.expandNodeChildren === 'function') {
                window.expandNodeChildren(nodeId);
            }
        });
        svg.__mmwExpandBtnHandlerAttached = true;
    }

    if (!svg.__mmwContextHandlerAttached) {
        svg.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (window.MMW_READONLY) return;
            showContextMenu(e);
        });
        svg.__mmwContextHandlerAttached = true;
    }
}

function editNodeText(nodeElement) {
    closeContextMenus();

    const textElement = nodeElement.querySelector('text');
    const rectElement = nodeElement.querySelector('rect');
    if (!textElement || !rectElement) return;

    const nodeId = nodeElement.getAttribute('data-node-id');
    const branchColor = rectElement.getAttribute('fill') || '#03a9f4';

    const editFontFamily = textElement.getAttribute('font-family') || '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "Avenir", "Montserrat", "Corbel", "URW Gothic", "Source Sans Pro", sans-serif';
    const isTitleNode = nodeId === '0';
    const editFontSize = isTitleNode ? '26px' : '16px';
    const editLineHeightPx = isTitleNode ? '32px' : '22px';
    const editFontWeight = isTitleNode ? '700' : '400';

    if (nodeElement.querySelector('foreignObject.node-edit-fo')) return;

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }
    const targetNode = findNodeById(currentHierarchy, nodeId);
    const originalText = targetNode ? targetNode.text : '';


    textElement.style.opacity = '0';

    const widthAttr = rectElement.getAttribute('width');
    const heightAttr = rectElement.getAttribute('height');
    const width = (widthAttr ? parseFloat(widthAttr) : rectElement.getBBox().width) || 0;
    const height = (heightAttr ? parseFloat(heightAttr) : rectElement.getBBox().height) || 0;
    const rxAttr = rectElement.getAttribute('rx');
    const editBorderRadius = (rxAttr && !isNaN(parseFloat(rxAttr))) ? `${parseFloat(rxAttr)}px` : '14px';

    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', '0');
    fo.setAttribute('y', '0');
    fo.setAttribute('width', String(width));
    fo.setAttribute('height', String(height));
    fo.classList.add('node-edit-fo');

    const div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    div.contentEditable = 'true';
    div.tabIndex = -1;
    div.textContent = originalText;
    div.spellcheck = false;
    div.autocomplete = 'off';
    div.autocorrect = 'off';
    div.autocapitalize = 'off';
    const liveAnimMs = 500;
    div.style.cssText = `
                    width: ${width}px;
                    height: ${height}px;
                    box-sizing: border-box;
                    padding: 8px 22px;
                    outline: none;
                    border: none;
                    box-shadow: inset 0 0 0 2px ${branchColor};
                    border-radius: ${editBorderRadius};
                    background: transparent;
                    color: var(--mm-text-color);
                    font-family: ${editFontFamily};
                    font-size: ${editFontSize};
                    line-height: ${editLineHeightPx};
                    font-weight: ${editFontWeight};
                    white-space: pre-wrap;
                    word-break: normal;
                    overflow-wrap: break-word;
                    overflow: hidden;
                    caret-color: ${branchColor};
                    -webkit-user-select: text;
                    user-select: text;
                    text-rendering: optimizeLegibility;
                    transition: height ${liveAnimMs}ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 300ms ease;
                    display: block;
                    text-indent: 0;
                    margin: 0;
                    animation: dissolveIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                `;
    const textAnchor = textElement.getAttribute('text-anchor');
    div.style.textAlign = textAnchor === 'middle' ? 'center' : 'left';

    fo.appendChild(div);
    nodeElement.appendChild(fo);
    (function () {
        try {
            const addBtn = nodeElement.querySelector('.mm-add-btn');
            if (addBtn && addBtn.parentNode === nodeElement) {
                nodeElement.appendChild(addBtn);
            }
        } catch { }
    })();

    function __mmwRenderMdHtmlFromPlain(plain) {
        let out = String(plain ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<span class="md-marker" style="display:none">[</span><span class="md-link">$1</span><span class="md-marker" style="display:none">]</span><span class="md-marker" style="display:none">(</span><span class="md-url" style="display:none">$2</span><span class="md-marker" style="display:none">)</span>');
        out = out.replace(/(?<!["'>(])([a-z0-9+.-]+:\/\/[^\s<]+|www\.[^\s<]+|[a-zA-Z0-9-]+\.[a-z]{2,}\/[^\s<]*)/gi, (match) => {
            let url = match;
            let punc = "";
            while (url.length > 0 && /[,.!?;:)]+$/.test(url)) {
                punc = url[url.length - 1] + punc;
                url = url.slice(0, -1);
            }
            return `<span class="md-link">${url}</span>` + punc;
        });
        out = out.replace(/~~([\s\S]+?)~~/g, '<span class="md-marker" style="display:none">~~</span><span class="md-strike">$1</span><span class="md-marker" style="display:none">~~</span>');
        out = out.replace(/\*\*([\s\S]+?)\*\*/g, '<span class="md-marker" style="display:none">**</span><span class="md-bold">$1</span><span class="md-marker" style="display:none">**</span>');
        out = out.replace(/(^|[^*])\*([^*][\s\S]*?)\*(?!\*)/g, '$1<span class="md-marker" style="display:none">*</span><span class="md-italic">$2</span><span class="md-marker" style="display:none">*</span>');
        out = out.replace(/\n/g, '<br/>');
        return out;
    }
    function __mmwPlainFromDiv(root) {
        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'BR') return '\n';
                let s = '';
                node.childNodes.forEach(ch => { s += walk(ch); });
                return s;
            }
            return '';
        }
        return walk(root);
    }
    function getSelectionOffsets(root) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        const r = selection.getRangeAt(0);
        if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;

        let start = 0;
        const w1 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let n;
        while ((n = w1.nextNode())) {
            if (n === r.startContainer) { start += r.startOffset; break; }
            start += (n.nodeValue || '').length;
        }

        let total = 0, end = 0;
        const w2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        while ((n = w2.nextNode())) {
            if (n === r.endContainer) { end = total + r.endOffset; break; }
            total += (n.nodeValue || '').length;
        }

        return { start: Math.min(start, end), end: Math.max(start, end) };
    }
    function setSelectionOffsets(root, start, end) {
        function locate(offset) {
            const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            let n; let acc = 0;
            while ((n = w.nextNode())) {
                const len = (n.nodeValue || '').length;
                if (acc + len >= offset) {
                    return { node: n, offset: offset - acc };
                }
                acc += len;
            }
            const last = root.lastChild;
            if (last && last.nodeType === Node.TEXT_NODE) {
                return { node: last, offset: (last.nodeValue || '').length };
            }
            return { node: root, offset: 0 };
        }
        const s = locate(start);
        const e = locate(end);
        const nr = document.createRange();
        nr.setStart(s.node, s.offset);
        nr.setEnd(e.node, e.offset);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(nr);
    }
    function renderEditorFormatting(preserveSelection) {
        const offs = preserveSelection ? getSelectionOffsets(div) : null;
        const raw = __mmwPlainFromDiv(div);
        div.innerHTML = __mmwRenderMdHtmlFromPlain(raw);

        (function hideResidualMd(root) {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            const nodes = [];
            let n;
            while ((n = walker.nextNode())) {
                const parentEl = n.parentElement;
                if (!parentEl) continue;
                if (parentEl.classList && parentEl.classList.contains('md-marker')) continue;
                const val = n.nodeValue || '';
                if (val.indexOf('*') !== -1 || val.indexOf('~') !== -1) nodes.push(n);
            }
            nodes.forEach(textNode => {
                const text = textNode.nodeValue || '';
                const frag = document.createDocumentFragment();
                let buf = '';
                const flushBuf = () => {
                    if (buf) {
                        frag.appendChild(document.createTextNode(buf));
                        buf = '';
                    }
                };
                for (let i = 0; i < text.length; i++) {
                    const ch = text[i];
                    if (ch === '*' || ch === '~') {
                        flushBuf();
                        const span = document.createElement('span');
                        span.className = 'md-marker';
                        span.style.display = 'none';
                        span.textContent = ch;
                        frag.appendChild(span);
                    } else {
                        buf += ch;
                    }
                }
                flushBuf();
                if (textNode.parentNode) {
                    textNode.parentNode.replaceChild(frag, textNode);
                }
            });
        })(div);

        if (preserveSelection && offs) setSelectionOffsets(div, offs.start, offs.end);
    }

    let __mmwCleaningGuard = false;
    function __mmwStripMarkdown(s) {
        if (!s) return '';
        let out = String(s);
        out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1');
        out = out.replace(/~~/g, '');
        out = out.replace(/\*\*/g, '').replace(/__/g, '');
        out = out.replace(/\*/g, '').replace(/_/g, '');
        out = out.replace(/[\[\]\(\)]/g, '');
        return out;
    }
    function __mmwIsExtremeMdNoise(s) {
        if (!s) return false;
        const len = s.length;
        if (len < 8) return false;
        const markers = (s.match(/[\*\_\~\[\]\(\)]/g) || []).length;
        const alnum = (s.match(/[A-Za-z0-9]/g) || []).length;
        const smallIt = (s.match(/\*[^*\s]\*/g) || []).length + (s.match(/_[^_\s]_/g) || []).length;
        return (alnum > 0 && markers / Math.max(1, alnum) > 0.5) || smallIt >= 3;
    }

    renderEditorFormatting(false);

    window.__editingNodeId = nodeId;

    fo.addEventListener('mousedown', (e) => e.stopPropagation());
    fo.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    fo.addEventListener('touchstart', (e) => e.stopPropagation());

    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    div.focus();

    syncEditorOverlayWithNode(nodeElement, liveAnimMs);

    let isActive = true;

    function cleanup() {
        isActive = false;
        if (window.__editingNodeId === nodeId) window.__editingNodeId = null;
        textElement.style.opacity = '1';
        if (fo.parentNode) fo.parentNode.removeChild(fo);
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
        try { document.removeEventListener('selectionchange', onSelectionChange); } catch { }
        closeContextMenus();
    }

    function saveEdit() {
        if (!isActive) return;

        const newText = __mmwPlainFromDiv(div);

        if (window.__editingNodeId === nodeId) window.__editingNodeId = null;
        cleanup();

        if (newText.trim() === '') {
            updateNodeTextInHierarchy(nodeElement, originalText);
            const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
            editor.value = json;
            HistoryManager.captureState();

            deleteNodeByElement(nodeElement);
        } else if (newText !== originalText) {
            HistoryManager.captureState();
            updateNodeTextInHierarchy(nodeElement, newText);
            const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
            editor.value = json;
            updateMindMap();
            triggerAutoSave();
        } else {
            updateMindMap();
        }
    }

    function cancelEdit() {
        if (!isActive) return;
        if (window.__editingNodeId === nodeId) window.__editingNodeId = null;
        updateNodeTextInHierarchy(nodeElement, originalText);
        const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
        editor.value = json;
        cleanup();
        if (originalText === 'New Node') {
            HistoryManager.captureState();
            deleteNodeByElement(nodeElement);
        } else {
            updateMindMap();
        }
    }

    function handleOutsideClick(e) {
        const inToolbar = !!(e.target && typeof e.target.closest === 'function' && e.target.closest('.editor-toolbar'));
        if (!fo.contains(e.target) && !inToolbar) {
            saveEdit();
        }
    }
    setTimeout(() => {
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('touchstart', handleOutsideClick);
    }, 50);

    div.addEventListener('input', () => {
        if (!isActive) return;

        const rawNow = __mmwPlainFromDiv(div);
        if (!__mmwCleaningGuard && __mmwIsExtremeMdNoise(rawNow)) {
            __mmwCleaningGuard = true;
            const cleaned = __mmwStripMarkdown(rawNow);
            if (cleaned !== rawNow) {
                div.textContent = cleaned;
                setSelectionOffsets(div, cleaned.length, cleaned.length);
            }
            __mmwCleaningGuard = false;
        }

        renderEditorFormatting(true);
        updateNodeTextInHierarchyLive(nodeElement, __mmwPlainFromDiv(div));
        const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
        editor.value = json;
        updateMindMap();
        requestAnimationFrame(() => syncEditorOverlayWithNode(nodeElement, 0));
    });

    div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
    let toolbarOpen = false;

    function showFormattingToolbar() {
        try {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            if (!div.contains(range.startContainer) || !div.contains(range.endContainer)) return;

            closeContextMenus();

            const offAtOpen = getSelectionOffsets(div);

            const tb = document.createElement('div');
            tb.className = 'editor-toolbar';
            tb.addEventListener('mousedown', (ev) => { ev.preventDefault(); ev.stopPropagation(); });
            tb.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); });

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.gap = '8px';
            container.style.alignItems = 'center';
            tb.appendChild(container);

            const addBtn = (html, handler, title) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.style.all = 'unset';
                btn.style.display = 'inline-flex';
                btn.style.alignItems = 'center';
                btn.style.gap = '6px';
                btn.style.cursor = 'pointer';
                btn.style.padding = '4px 8px';
                btn.style.borderRadius = '12px';
                btn.style.color = 'var(--mm-text-color)';
                btn.style.border = 'none';
                btn.innerHTML = html;
                if (title) btn.title = title;
                btn.addEventListener('mousedown', (ev) => { ev.preventDefault(); ev.stopPropagation(); });
                btn.addEventListener('click', () => {
                    try {
                        handler();
                    } finally {
                    }
                });
                container.appendChild(btn);
            };

            const ratingPopup = document.getElementById('ratingPopup');
            if (ratingPopup) {
                ratingPopup.classList.remove('show');
            }

            function triggerLiveUpdate() {
                renderEditorFormatting(true);
                updateNodeTextInHierarchyLive(nodeElement, __mmwPlainFromDiv(div));
                const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
                editor.value = json;
                updateMindMap();
                requestAnimationFrame(() => syncEditorOverlayWithNode(nodeElement, 0));
            }

            function getSelectionOffsets(root) {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return null;
                const r = selection.getRangeAt(0);
                if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;

                let start = 0;
                const w1 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
                let n;
                while ((n = w1.nextNode())) {
                    if (n === r.startContainer) { start += r.startOffset; break; }
                    start += (n.nodeValue || '').length;
                }

                let total = 0, end = 0;
                const w2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
                while ((n = w2.nextNode())) {
                    if (n === r.endContainer) { end = total + r.endOffset; break; }
                    total += (n.nodeValue || '').length;
                }

                return { start: Math.min(start, end), end: Math.max(start, end) };
            }

            function setSelectionOffsets(root, start, end) {
                function locate(offset) {
                    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
                    let n; let acc = 0;
                    while ((n = w.nextNode())) {
                        const len = (n.nodeValue || '').length;
                        if (acc + len >= offset) {
                            return { node: n, offset: offset - acc };
                        }
                        acc += len;
                    }
                    const last = root.lastChild;
                    if (last && last.nodeType === Node.TEXT_NODE) {
                        return { node: last, offset: (last.nodeValue || '').length };
                    }
                    return { node: root, offset: 0 };
                }
                const s = locate(start);
                const e = locate(end);
                const nr = document.createRange();
                nr.setStart(s.node, s.offset);
                nr.setEnd(e.node, e.offset);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(nr);
            }

            function applyWrap(wrapStart, wrapEnd) {
                const liveOff = getSelectionOffsets(div);
                const off = liveOff || offAtOpen;
                if (!off) return;

                const full = __mmwPlainFromDiv(div);

                let selStart = off.start;
                let selEnd = off.end;

                if (selStart === selEnd) {
                    let l = selStart, r = selEnd;
                    while (l > 0 && !/\s/.test(full[l - 1])) l--;
                    while (r < full.length && !/\s/.test(full[r])) r++;
                    if (l === r) return;
                    selStart = l; selEnd = r;
                }

                const origStart = selStart;
                const origEnd = selEnd;
                const isSpace = (c) => c === ' ' || c === '\t';
                while (selStart < selEnd && isSpace(full[selStart])) selStart++;
                while (selEnd > selStart && isSpace(full[selEnd - 1])) selEnd--;

                if (selStart >= selEnd) return;

                const core = full.slice(selStart, selEnd);
                const preSpaces = full.slice(origStart, selStart);
                const postSpaces = full.slice(selEnd, origEnd);

                const sameMarkers = (a, b) => a === b && a.length > 0 && a.split('').every(ch => ch === a[0]);

                let newPlain = null, newStart = null, newEnd = null;

                if (sameMarkers(wrapStart, wrapEnd)) {
                    const unit = wrapStart;
                    const ch = unit[0];
                    const unitLen = unit.length;

                    const leftExactly = selStart >= unitLen && full.slice(selStart - unitLen, selStart) === unit;
                    const rightExactly = selEnd + unitLen <= full.length && full.slice(selEnd, selEnd + unitLen) === unit;

                    const countLeft = (idx) => {
                        let c = 0;
                        for (let i = idx - 1; i >= 0 && full[i] === ch; i--) c++;
                        return c;
                    };
                    const countRight = (idx) => {
                        let c = 0;
                        for (let i = idx; i < full.length && full[i] === ch; i++) c++;
                        return c;
                    };

                    let didUnwrap = false;

                    if (core.startsWith(unit) && core.endsWith(unit) && core.length >= unitLen * 2) {
                        const inner = core.slice(unitLen, core.length - unitLen);
                        newPlain = full.slice(0, selStart) + inner + full.slice(selEnd);
                        newStart = selStart;
                        newEnd = selStart + inner.length;
                        didUnwrap = true;
                    }
                    else if (leftExactly && rightExactly) {
                        const leftCut = selStart - unitLen;
                        const rightCut = selEnd + unitLen;
                        newPlain = full.slice(0, leftCut) + full.slice(selStart, selEnd) + full.slice(rightCut);
                        newStart = leftCut;
                        newEnd = leftCut + (selEnd - selStart);
                        didUnwrap = true;
                    }
                    else if (unitLen === 1) {
                        const lCnt = countLeft(selStart);
                        const rCnt = countRight(selEnd);
                        if (lCnt % 2 === 1 && rCnt % 2 === 1) {
                            const leftCut = selStart - 1;
                            const rightCut = selEnd + 1;
                            if (leftCut >= 0 && rightCut <= full.length) {
                                newPlain = full.slice(0, leftCut) + full.slice(selStart, selEnd) + full.slice(rightCut);
                                newStart = leftCut;
                                newEnd = leftCut + (selEnd - selStart);
                                didUnwrap = true;
                            }
                        }
                    }
                    else {
                        const lCnt = countLeft(selStart);
                        const rCnt = countRight(selEnd);
                        if (lCnt >= unitLen && rCnt >= unitLen) {
                            const leftCut = selStart - unitLen;
                            const rightCut = selEnd + unitLen;
                            newPlain = full.slice(0, leftCut) + full.slice(selStart, selEnd) + full.slice(rightCut);
                            newStart = leftCut;
                            newEnd = leftCut + (selEnd - selStart);
                            didUnwrap = true;
                        }
                    }

                    if (!didUnwrap) {
                        const head = full.slice(0, origStart);
                        const tail = full.slice(origEnd);
                        newPlain = head + preSpaces + unit + full.slice(selStart, selEnd) + unit + postSpaces + tail;
                        const startOfUnit = head.length + preSpaces.length;
                        newStart = startOfUnit + unitLen;
                        newEnd = newStart + (selEnd - selStart);
                    }
                } else {
                    const lOk = selStart >= wrapStart.length && full.slice(selStart - wrapStart.length, selStart) === wrapStart;
                    const rOk = selEnd + wrapEnd.length <= full.length && full.slice(selEnd, selEnd + wrapEnd.length) === wrapEnd;

                    if (lOk && rOk) {
                        const leftCut = selStart - wrapStart.length;
                        const rightCut = selEnd + wrapEnd.length;
                        newPlain = full.slice(0, leftCut) + full.slice(selStart, selEnd) + full.slice(rightCut);
                        newStart = leftCut;
                        newEnd = leftCut + (selEnd - selStart);
                    } else if (core.startsWith(wrapStart) && core.endsWith(wrapEnd) && core.length >= (wrapStart.length + wrapEnd.length)) {
                        const inner = core.slice(wrapStart.length, core.length - wrapEnd.length);
                        newPlain = full.slice(0, selStart) + inner + full.slice(selEnd);
                        newStart = selStart;
                        newEnd = selStart + inner.length;
                    } else {
                        const head = full.slice(0, origStart);
                        const tail = full.slice(origEnd);
                        newPlain = head + preSpaces + wrapStart + full.slice(selStart, selEnd) + wrapEnd + postSpaces + tail;
                        const startOfUnit = head.length + preSpaces.length;
                        newStart = startOfUnit + wrapStart.length;
                        newEnd = newStart + (selEnd - selStart);
                    }
                }

                if (newPlain == null) return;

                div.textContent = newPlain;
                setSelectionOffsets(div, newStart, newEnd);
                triggerLiveUpdate();
            }

            function applyLink() {
                const off = getSelectionOffsets(div);
                if (!off) return;
                const txt = div.textContent || '';
                const selectionText = txt.slice(off.start, off.end);
                let href = selectionText.trim();

                if (!/^https?:\/\//i.test(href)) {
                    showUrlInputPopup((entered) => {
                        if (!entered) return;
                        href = entered.trim();
                        if (!/^https?:\/\//i.test(href)) return;

                        const replacement = '[' + (selectionText || 'link') + '](' + href + ')';
                        const newText = txt.slice(0, off.start) + replacement + txt.slice(off.end);
                        div.textContent = newText;
                        const labelStart = off.start + 1;
                        const labelEnd = labelStart + (selectionText || 'link').length;
                        setSelectionOffsets(div, labelStart, labelEnd);
                        triggerLiveUpdate();
                    });
                } else {
                    const replacement = '[' + (selectionText || 'link') + '](' + href + ')';
                    const newText = txt.slice(0, off.start) + replacement + txt.slice(off.end);
                    div.textContent = newText;
                    const labelStart = off.start + 1;
                    const labelEnd = labelStart + (selectionText || 'link').length;
                    setSelectionOffsets(div, labelStart, labelEnd);
                    triggerLiveUpdate();
                }
            }

            function showUrlInputPopup(callback) {
                const backdrop = document.createElement('div');
                backdrop.className = 'url-input-backdrop';

                const dialog = document.createElement('div');
                dialog.className = 'url-input-dialog';

                const title = document.createElement('h3');
                title.textContent = 'Enter URL';
                dialog.appendChild(title);

                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'https://';
                input.value = 'https://';
                dialog.appendChild(input);

                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'url-input-buttons';

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancel';
                cancelBtn.className = 'url-input-btn url-input-btn-cancel';
                cancelBtn.onclick = () => {
                    document.body.removeChild(backdrop);
                    callback(null);
                };

                const confirmBtn = document.createElement('button');
                confirmBtn.textContent = 'Insert';
                confirmBtn.className = 'url-input-btn url-input-btn-confirm';
                confirmBtn.onclick = () => {
                    let value = input.value.trim();

                    value = value.replace(/^(https?:\/\/)+/i, '');

                    if (value.length > 0) {
                        value = 'https://' + value;
                    }

                    document.body.removeChild(backdrop);
                    callback(value);
                };

                buttonContainer.appendChild(cancelBtn);
                buttonContainer.appendChild(confirmBtn);
                dialog.appendChild(buttonContainer);

                backdrop.appendChild(dialog);
                document.body.appendChild(backdrop);

                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 50);

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        confirmBtn.click();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelBtn.click();
                    }
                });

                backdrop.addEventListener('click', (e) => {
                    if (e.target === backdrop) {
                        document.body.removeChild(backdrop);
                        callback(null);
                    }
                });
            }

            if (!isTitleNode) {
                addBtn(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bold-icon lucide-bold"><path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/></svg>`, () => applyWrap('**', '**'), 'Bold');
            }
            addBtn(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-italic-icon lucide-italic"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>`, () => applyWrap('*', '*'), 'Italic');
            addBtn(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-strikethrough-icon lucide-strikethrough"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>`, () => applyWrap('~~', '~~'), 'Strikethrough');
            addBtn(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`, applyLink, 'Insert link');
            addBtn(`<svg xmlns="http://www.w3.org/2000/svg"r width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-remove-formatting-icon lucide-remove-formatting"><path d="M4 7V4h16v3"/><path d="M5 20h6"/><path d="M13 4 8 20"/><path d="m15 15 5 5"/><path d="m20 15-5 5"/></svg><span>Remove Styling</span>`, () => {
                const raw = __mmwPlainFromDiv(div);
                const cleaned = __mmwStripMarkdown(raw);
                div.textContent = cleaned;
                setSelectionOffsets(div, cleaned.length, cleaned.length);
                triggerLiveUpdate();
            }, 'Remove styling');

            document.body.appendChild(tb);
            toolbarOpen = true;
        } catch { }
    }

    function onSelectionChange() {
        if (!isActive) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            if (toolbarOpen) { closeContextMenus(); toolbarOpen = false; }
            return;
        }
        const range = sel.getRangeAt(0);
        if (!div.contains(range.commonAncestorContainer)) {
            if (toolbarOpen) { closeContextMenus(); toolbarOpen = false; }
            return;
        }
        if (range.toString().length > 0) {
            if (!toolbarOpen) showFormattingToolbar();
        } else {
            if (toolbarOpen) { closeContextMenus(); toolbarOpen = false; }
        }
    }
    document.addEventListener('selectionchange', onSelectionChange);

    div.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        showFormattingToolbar();
    });
}

function syncEditorOverlayWithNode(nodeElement, animMs = 200) {
    const rectElement = nodeElement.querySelector('rect');
    if (!rectElement) return;
    const fo = nodeElement.querySelector('foreignObject.node-edit-fo');
    if (!fo) return;
    const textElement = nodeElement.querySelector('text');

    const widthAttr = rectElement.getAttribute('width');
    const heightAttr = rectElement.getAttribute('height');
    const width = (widthAttr ? parseFloat(widthAttr) : rectElement.getBBox().width) || 0;
    const height = (heightAttr ? parseFloat(heightAttr) : rectElement.getBBox().height) || 0;

    fo.style.transition = `height ${animMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    fo.setAttribute('width', String(width));
    fo.setAttribute('height', String(height));

    const div = fo.firstChild;
    if (div && div.style) {
        div.style.transition = `height ${animMs}ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 300ms ease`;
        div.style.width = `${width}px`;
        div.style.height = `${height}px`;

        const rxAttr = rectElement.getAttribute('rx');
        if (rxAttr && !isNaN(parseFloat(rxAttr))) {
            div.style.borderRadius = `${parseFloat(rxAttr)}px`;
        }

        const branchColor = rectElement.getAttribute('fill') || '#03a9f4';
        div.style.boxShadow = `inset 0 0 0 2px ${branchColor}`;
        div.style.caretColor = branchColor;

        const textAnchor = textElement ? textElement.getAttribute('text-anchor') : null;
        if (textAnchor) {
            div.style.textAlign = textAnchor === 'middle' ? 'center' : 'left';
        }
    }
}

function updateNodeTextInHierarchy(nodeElement, newText) {
    const nodeId = nodeElement.getAttribute('data-node-id');

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const targetNode = findNodeById(currentHierarchy, nodeId);
    if (targetNode) {
        targetNode.text = newText;
        const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
        localStorage.setItem(localStorageKey, json);
    }
}

function updateNodeTextInHierarchyLive(nodeElement, newText) {
    const nodeId = nodeElement.getAttribute('data-node-id');

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const targetNode = findNodeById(currentHierarchy, nodeId);
    if (targetNode) {
        targetNode.text = newText;
    }
}

function closeContextMenus() {
    document.querySelectorAll('.context-menu, .editor-toolbar').forEach(el => el.remove());
}

window.editNode = function () {
    if (!window.currentNodeElement) return;
    const el = window.currentNodeElement;
    closeContextMenus();
    editNodeText(el);
};

function showContextMenu(e) {
    if (document.querySelector('.node-edit-fo')) {
        return;
    }

    const nodeElement = e.target.closest('.mm-node');
    if (!nodeElement) return;

    e.preventDefault();
    closeContextMenus();

    window.currentNodeElement = nodeElement;

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const targetNode = findNodeById(currentHierarchy, nodeElement.getAttribute('data-node-id'));

    const isLevelDeepEnough = targetNode && targetNode.level >= 2;

    const menuScale = Math.min(scale, 1.0);
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.style.maxWidth = `${225 / menuScale}px`;

    menu.style.opacity = '0';
    menu.style.transform = `scale(${menuScale * 0.85})`;
    menu.style.transition = 'transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 140ms cubic-bezier(0.2, 0.8, 0.2, 1)';

    menu.innerHTML = `
                    <div class="context-menu-buttons-container">
                        <div class="context-menu-colors" style="display: flex; gap: 7px; padding: 4px 0px 8px 2px; justify-content: center; flex-wrap: wrap;  margin-bottom: 4px;">
                            ${['rgb(255, 127, 15)', 'rgb(0, 191, 191)', 'rgb(255, 64, 129)', 'rgb(206, 91, 255)', 'rgb(50, 205, 53)', 'rgb(255, 191, 0)', 'rgb(3, 169, 244)'].map(color => `
                                <div onclick="setBranchColor('${color}')" style="width: 18px; height: 18px; border-radius: 50%; background-color: ${color}; cursor: pointer; border: 2px solid rgba(255,255,255,0.2); transition: transform 0.1s; opacity: 0.8;"></div>
                            `).join('')}
                        </div>
                        ${(!targetNode.collapsed) ? `<div class="context-menu-button" onclick="addChildNode()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.3rem" height="1.3rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: -2px;">
                                <path d="M5 12h14"/>
                                <path d="M12 5v14"/>
                            </svg>
                            Add Branch
                        </div>` : ''}
                        
                         ${(!targetNode.notes) ? `<div class="context-menu-button" onclick="window.openNotesDrawer('${targetNode.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.3rem" height="1.3rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: -2px;">
                                <path d="M21 5H3"/>
                                <path d="M15 12H3"/>
                                <path d="M17 19H3"/>
                            </svg>
                            Add Notes
                        </div>` : ''}
                        
                        ${isLevelDeepEnough && !window.MMW_DISABLE_AI_FEATURES ? `<div class="context-menu-button" onclick="expandMindMapNode()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1.2rem" height="1.2rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8 12C13 12 11 6 16 6" />
                        <path d="M8 12C13 12 11 18 16 18" />
                        <rect x="16" y="3" width="6" height="6" rx="1" />
                        <rect x="16" y="15" width="6" height="6" rx="1" />
                        <rect x="2" y="9" width="6" height="6" rx="1" />
                        </svg>
                        AI Expand                
                        </div>` : ''}

                        <div class="context-menu-button" onclick="editNode()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M13 21h8"/>
                                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5 .5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
                            </svg>
                            Edit Node
                        </div>

                        ${(isLevelDeepEnough && targetNode.children && targetNode.children.length > 0 && !targetNode.collapsed) ? `<div class="context-menu-button" onclick="collapseNodeChildren()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.2rem" height="1.2rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 20 5-5 5 5"/><path d="m7 4 5 5 5-5"/></svg>
                            Collapse Children
                        </div>` : ''}

                        <div class="context-menu-button" onclick="removeStylingFromNode()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.2rem" height="1.2rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-remove-formatting-icon lucide-remove-formatting">
                                <path d="M4 7V4h16v3"/>
                                <path d="M5 20h6"/>
                                <path d="M13 4 8 20"/>
                                <path d="m15 15 5 5"/>
                                <path d="m20 15-5 5"/>
                            </svg>
                            Remove Styles
                        </div>
                        ${isLevelDeepEnough ? `<div class="context-menu-button delete-node-button" onclick="deleteNode()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.55rem" height="1.55rem" viewBox="-5 -5 34 34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="delete-node-icon">
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            </svg>
                            Delete Node
                        </div>` : ''}
                    </div>
                `;
    document.body.appendChild(menu);

    requestAnimationFrame(() => {
        menu.style.opacity = '1';
        menu.style.transform = `scale(${menuScale})`;
    });

    const removeMenu = () => {
        if (document.body.contains(menu)) {
            document.body.removeChild(menu);
        }
    };

    setTimeout(() => document.addEventListener('click', removeMenu, { once: true }), 100);
}

window.addChildNodeFor = function (targetNodeId) {
    if (!targetNodeId) return;

    closeContextMenus();

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const parentNode = findNodeById(currentHierarchy, targetNodeId);
    if (parentNode) {
        const newChildIndex = parentNode.children.length;
        const newPathId = `${parentNode.id}-${newChildIndex}`;
        const newNode = {
            text: 'New Node',
            children: [],
            level: parentNode.level + 1,
            parent: parentNode,
            id: newPathId
        };
        HistoryManager.captureState();
        parentNode.children.push(newNode);

        const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
        editor.value = json;
        localStorage.setItem(localStorageKey, json);
        updateMindMap();

        triggerAutoSave();

        setTimeout(() => {
            const newNodeElement = preview.querySelector(`[data-node-id="${newPathId}"]`);
            if (newNodeElement) {
                editNodeText(newNodeElement);
            }
        }, 600);
    }
};

window.addChildNode = function () {
    if (!window.currentNodeElement) return;
    const clickedNodeId = window.currentNodeElement.getAttribute('data-node-id');
    window.addChildNodeFor(clickedNodeId);
};

function deleteNodeByElement(nodeElement) {
    const nodeId = nodeElement.getAttribute('data-node-id');

    function findNodeAndParent(node, id, parent = null) {
        if (node.id === id) return { node, parent };
        for (const child of node.children) {
            const found = findNodeAndParent(child, id, node);
            if (found) return found;
        }
        return null;
    }

    const result = findNodeAndParent(currentHierarchy, nodeId);
    if (result && result.parent) {
        const { node, parent } = result;
        const childIndex = parent.children.indexOf(node);
        if (childIndex > -1) {
            parent.children.splice(childIndex, 1);

            parent.children.forEach((child, index) => {
                reassignPathIds(child, `${parent.id}-${index}`);
            });

            const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
            editor.value = json;
            localStorage.setItem(localStorageKey, json);
            updateMindMap();

            triggerAutoSave();
        }
    }
}

function reassignPathIds(node, newPathId) {
    node.id = newPathId;
    node.children.forEach((child, index) => {
        reassignPathIds(child, `${newPathId}-${index}`);
    });
}

window.deleteNode = function () {
    if (!window.currentNodeElement) return;
    closeContextMenus();
    HistoryManager.captureState();
    deleteNodeByElement(window.currentNodeElement);
};

window.removeStylingFromNode = function () {
    if (!window.currentNodeElement) return;
    closeContextMenus();

    const nodeEl = window.currentNodeElement;
    const nodeId = nodeEl.getAttribute('data-node-id');

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    function stripMd(s) {
        if (!s) return '';
        let out = String(s);
        out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1');
        out = out.replace(/~~/g, '');
        out = out.replace(/\*\*/g, '').replace(/__/g, '');
        out = out.replace(/\*/g, '').replace(/_/g, '');
        out = out.replace(/[\[\]\(\)]/g, '');
        return out;
    }

    const target = findNodeById(currentHierarchy, nodeId);
    if (!target) return;

    const cleaned = stripMd(target.text);
    let changed = false;

    if (cleaned !== target.text) {
        HistoryManager.captureState();
        updateNodeTextInHierarchy(nodeEl, cleaned);
        changed = true;
    }

    if (target.branchColor) {
        if (!changed) HistoryManager.captureState();
        delete target.branchColor;
        changed = true;
    }

    if (changed) {
        const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
        editor.value = json;
        localStorage.setItem(localStorageKey, json);
        updateMindMap();
        triggerAutoSave();
    }
};

window.setBranchColor = function (color) {
    if (!window.currentNodeElement) return;
    closeContextMenus();

    const nodeEl = window.currentNodeElement;
    const nodeId = nodeEl.getAttribute('data-node-id');

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const target = findNodeById(currentHierarchy, nodeId);
    if (!target) return;

    if (target.branchColor !== color) {
        HistoryManager.captureState();
        target.branchColor = color;
        const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
        editor.value = json;
        localStorage.setItem(localStorageKey, json);
        updateMindMap();
        triggerAutoSave();
    }
};

window.collapseNodeChildren = function () {
    if (!window.currentNodeElement) return;
    closeContextMenus();
    const nodeEl = window.currentNodeElement;
    const nodeId = nodeEl.getAttribute('data-node-id');

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const target = findNodeById(currentHierarchy, nodeId);
    if (!target) return;

    HistoryManager.captureState();
    target.collapsed = true;
    const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
    editor.value = json;
    localStorage.setItem(localStorageKey, json);
    updateMindMap();
    triggerAutoSave();
};

window.expandNodeChildren = function (nodeId) {
    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const target = findNodeById(currentHierarchy, nodeId);
    if (!target) return;

    HistoryManager.captureState();
    target.collapsed = false;
    const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
    editor.value = json;
    localStorage.setItem(localStorageKey, json);
    updateMindMap();
    triggerAutoSave();
};

window.replaceNodeChildren = function (targetNodeId, markdownContent) {
    if (!targetNodeId || !markdownContent) return null;
    closeContextMenus();

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const targetNode = findNodeById(currentHierarchy, targetNodeId);
    if (!targetNode) return null;

    const parsed = window.markdownToMmJson(markdownContent);
    const rootFromMd = parsed['mm-node'];

    function convertToInternal(node, parent, level, index) {
        const newId = `${parent.id}-${index}`;
        const newNode = {
            id: newId,
            text: node.content,
            children: [],
            level: level,
            parent: parent
        };

        if (node.children && node.children.length > 0) {
            node.children.forEach((child, idx) => {
                newNode.children.push(convertToInternal(child, newNode, level + 1, idx));
            });
        }
        return newNode;
    }

    const oldChildren = targetNode.children;

    targetNode.children = [];

    if (rootFromMd.children && rootFromMd.children.length > 0) {
        rootFromMd.children.forEach((child, index) => {
            targetNode.children.push(convertToInternal(child, targetNode, targetNode.level + 1, index));
        });
    }

    const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
    editor.value = json;
    localStorage.setItem(localStorageKey, json);
    updateMindMap();
    triggerAutoSave();

    return oldChildren;
};

window.restoreNodeChildren = function (targetNodeId, oldChildren) {
    if (!targetNodeId || !oldChildren) return;

    function findNodeById(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
        return null;
    }

    const targetNode = findNodeById(currentHierarchy, targetNodeId);
    if (!targetNode) return;

    targetNode.children = oldChildren;

    const json = __mmwComposeJsonWithCurrentSettings(currentHierarchy);
    editor.value = json;
    localStorage.setItem(localStorageKey, json);
    updateMindMap();
    triggerAutoSave();
};

window.getBranchContext = function (nodeId) {
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

    return path.map((node, index) => {
        const level = index + 1;
        const prefix = level <= 6 ? '#'.repeat(level) : '-';
        return `${prefix} ${node.text}`;
    }).join('\n');
};



let viewBoxAnimationId = null;

function animateViewBox(svg, targetViewBox, targetWidth, targetHeight, duration) {
    if (viewBoxAnimationId) {
        cancelAnimationFrame(viewBoxAnimationId);
        viewBoxAnimationId = null;
    }

    const startViewBox = svg.getAttribute('viewBox').split(' ').map(parseFloat);
    const endViewBox = targetViewBox.split(' ').map(parseFloat);

    const startWidth = parseFloat(svg.getAttribute('width'));
    const endWidth = parseFloat(targetWidth);

    const startHeight = parseFloat(svg.getAttribute('height'));
    const endHeight = parseFloat(targetHeight);

    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        const currentViewBox = startViewBox.map((v, i) => v + (endViewBox[i] - v) * ease);
        const currentWidth = startWidth + (endWidth - startWidth) * ease;
        const currentHeight = startHeight + (endHeight - startHeight) * ease;

        svg.setAttribute('viewBox', currentViewBox.join(' '));
        svg.setAttribute('width', currentWidth);
        svg.setAttribute('height', currentHeight);

        if (progress < 1) {
            viewBoxAnimationId = requestAnimationFrame(step);
        } else {
            viewBoxAnimationId = null;
        }
    }

    viewBoxAnimationId = requestAnimationFrame(step);
}

function updateSVGWithAnimations(newHierarchy, contextLinks = []) {
    const svg = preview.querySelector('svg');
    if (!svg) {
        const result = generateSVG(editor.value, { contextUrls: contextLinks });
        const svgString = typeof result === 'string' ? result : result.svg;
        if (result.updatedJson) editor.value = result.updatedJson;
        preview.innerHTML = svgString;
        updateTransform();
        return;
    }
    const stage = svg.querySelector('.mm-stage') || svg;

    try { generateSVG(editor.value, { contextUrls: contextLinks }); } catch (e) { }

    assignBranchColors(newHierarchy);
    processNode(newHierarchy);
    newHierarchy.textLines = [];
    newHierarchy.rectWidth = 0;
    newHierarchy.rectHeight = 0;
    assignPositions(newHierarchy);
    assignXPositions(newHierarchy, 0);

    let extents = createExtents();
    collectExtents(newHierarchy, extents);
    if (!Number.isFinite(extents.minX) || !Number.isFinite(extents.minY)) {
        return;
    }
    const offsetX = -extents.minX;
    const offsetY = -extents.minY;
    shiftCoordinates(newHierarchy, offsetX, offsetY);

    function buildParentChildMap(hierarchy) {
        const map = new Map();
        function traverse(node, parent) {
            if (parent) {
                map.set(node.id, parent.id);
            }
            node.children.forEach(child => traverse(child, node));
        }
        traverse(hierarchy, null);
        return map;
    }

    const oldParentMap = buildParentChildMap(previousHierarchy);
    const newParentMap = buildParentChildMap(newHierarchy);

    const result = generateSVG(editor.value, { contextUrls: contextLinks });
    const svgString = typeof result === 'string' ? result : result.svg;
    if (result.updatedJson) editor.value = result.updatedJson;

    const temp = document.createElement('div');
    temp.innerHTML = svgString;
    const newSvg = temp.querySelector('svg');

    if (!newSvg) return;

    (function syncDefsStyle() {
        try {
            const existingStyleEl = svg.querySelector('defs style');
            const newStyleEl = newSvg.querySelector('defs style');
            if (existingStyleEl && newStyleEl) {
                svg.__mmwPrevStyleText = existingStyleEl.textContent || '';
                svg.__mmwNextStyleText = newStyleEl.textContent || '';
                if (svg.__mmwPrevStyleText !== svg.__mmwNextStyleText) {
                    existingStyleEl.textContent = svg.__mmwNextStyleText;
                }
            }
        } catch { }
    })();

    const newNodes = newSvg.querySelectorAll('.mm-node');
    const newLinks = newSvg.querySelectorAll('.mm-link');
    const newCollapsedLinks = newSvg.querySelectorAll('.mm-collapsed-link');
    const newExpandBtns = newSvg.querySelectorAll('.mm-expand-btn');

    const existingNodesMap = new Map();
    const existingLinksMap = new Map();
    const existingCollapsedLinksMap = new Map();
    const existingExpandBtnsMap = new Map();

    svg.querySelectorAll('.mm-node').forEach(el => {
        const id = el.getAttribute('data-node-id');
        if (id) existingNodesMap.set(id, el);
    });

    svg.querySelectorAll('.mm-link').forEach(el => {
        const id = el.getAttribute('data-link-id');
        if (id) existingLinksMap.set(id, el);
    });

    svg.querySelectorAll('.mm-collapsed-link').forEach(el => {
        const id = el.getAttribute('data-link-id');
        if (id) existingCollapsedLinksMap.set(id, el);
    });

    svg.querySelectorAll('.mm-expand-btn').forEach(el => {
        const id = el.getAttribute('data-for-id');
        if (id) existingExpandBtnsMap.set(id, el);
    });

    const isEditing = window.__editingNodeId !== null;
    const animationDuration = isEditing ? 0 : 500;
    const fadeInDuration = isEditing ? 0 : 400;
    const fadeOutDuration = isEditing ? 0 : 300;
    const nodesToKeep = new Set();
    const linksToKeep = new Set();
    const collapsedLinksToKeep = new Set();
    const expandBtnsToKeep = new Set();

    newNodes.forEach(newNode => {
        const id = newNode.getAttribute('data-node-id');
        nodesToKeep.add(id);
        const existingNode = existingNodesMap.get(id);

        if (existingNode) {
            const oldParent = oldParentMap.get(parseInt(id));
            const newParent = newParentMap.get(parseInt(id));
            const parentUnchanged = oldParent === newParent;

            const newTransform = newNode.getAttribute('transform');
            existingNode.style.transition = `transform ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${fadeInDuration}ms ease`;
            existingNode.setAttribute('transform', newTransform);

            const existingRect = existingNode.querySelector('rect');
            const newRect = newNode.querySelector('rect');
            if (existingRect && newRect) {
                existingRect.style.transition = `height ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), fill 300ms ease, fill-opacity 300ms ease`;
                existingRect.setAttribute('width', newRect.getAttribute('width'));
                existingRect.setAttribute('height', newRect.getAttribute('height'));
                existingRect.setAttribute('rx', newRect.getAttribute('rx'));
                existingRect.setAttribute('ry', newRect.getAttribute('ry'));
                existingRect.setAttribute('fill', newRect.getAttribute('fill'));
                existingRect.setAttribute('fill-opacity', newRect.getAttribute('fill-opacity'));
            }

            const existingText = existingNode.querySelector('text');
            const newText = newNode.querySelector('text');
            if (existingText && newText) {
                existingText.innerHTML = newText.innerHTML;

                const attrsToCopy = ['fill', 'x', 'y', 'text-anchor', 'font-size', 'font-family'];
                attrsToCopy.forEach(attr => {
                    const val = newText.getAttribute(attr);
                    if (val !== null) {
                        existingText.setAttribute(attr, val);
                    }
                });
            }

            try {
                const keep = (el) => {
                    if (!el || el.nodeType !== 1) return false;
                    return el.matches('rect') || el.matches('text') || el.matches('.mm-add-btn') || el.matches('foreignObject.node-edit-fo') || el.matches('.mm-context-link') || el.matches('.mm-context-overflow-btn') || el.matches('.node-note-indicator');
                };

                Array.from(existingNode.children).forEach((child) => {
                    if (!keep(child)) child.remove();
                });

                Array.from(newNode.children).forEach((child) => {
                    if (!keep(child)) existingNode.appendChild(child.cloneNode(true));
                });
            } catch (e) {
            }

            const existingBtn = existingNode.querySelector('.mm-add-btn');
            const newBtn = newNode.querySelector('.mm-add-btn');

            if (existingBtn && newBtn) {
                existingBtn.style.transition = `transform ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                existingBtn.setAttribute('transform', newBtn.getAttribute('transform'));

                const existingPath = existingBtn.querySelector('path');
                const newPath = newBtn.querySelector('path');
                if (existingPath && newPath) {
                    existingPath.style.transition = `stroke 300ms ease`;
                    existingPath.setAttribute('stroke', newPath.getAttribute('stroke'));
                }
            } else if (existingBtn && !newBtn) {
                existingBtn.style.transition = `opacity 300ms ease-out`;
                existingBtn.style.opacity = '0';
                existingBtn.style.pointerEvents = 'none';
                setTimeout(() => {
                    if (existingBtn.parentNode) existingBtn.parentNode.removeChild(existingBtn);
                }, 300);
            } else if (!existingBtn && newBtn) {
                existingNode.appendChild(newBtn);
            }

            const existingNoteInd = existingNode.querySelector('.node-note-indicator');
            const newNoteInd = newNode.querySelector('.node-note-indicator');

            if (existingNoteInd && newNoteInd) {
                existingNoteInd.style.transition = `transform ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                existingNoteInd.setAttribute('transform', newNoteInd.getAttribute('transform'));

                const existingIcon = existingNoteInd.querySelector('svg');
                const newIcon = newNoteInd.querySelector('svg');
                if (existingIcon && newIcon) {
                    existingIcon.style.transition = 'stroke 300ms ease';
                    existingIcon.setAttribute('stroke', newIcon.getAttribute('stroke'));
                }
            } else if (existingNoteInd && !newNoteInd) {
                existingNoteInd.remove();
            } else if (!existingNoteInd && newNoteInd) {
                existingNode.appendChild(newNoteInd);
            }
        } else {
            newNode.style.opacity = '0';
            newNode.style.transition = `opacity ${fadeInDuration}ms ease-in`;
            stage.appendChild(newNode);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    newNode.style.opacity = '1';
                });
            });
        }
    });

    newLinks.forEach(newLink => {
        const id = newLink.getAttribute('data-link-id');
        linksToKeep.add(id);
        const existingLink = existingLinksMap.get(id);

        if (existingLink) {
            existingLink.style.transition = `d ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), stroke 300ms ease, opacity ${fadeInDuration}ms ease`;
            existingLink.setAttribute('d', newLink.getAttribute('d'));
            existingLink.setAttribute('stroke', newLink.getAttribute('stroke'));
            existingLink.setAttribute('stroke-width', newLink.getAttribute('stroke-width'));
        } else {
            newLink.style.opacity = '0';
            newLink.style.transition = `opacity ${fadeInDuration}ms ease-in`;
            const firstNode = stage.querySelector('.mm-node');
            if (firstNode && firstNode.parentNode === stage) {
                stage.insertBefore(newLink, firstNode);
            } else {
                stage.appendChild(newLink);
            }
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    newLink.style.opacity = '1';
                });
            });
        }
    });

    newCollapsedLinks.forEach(newLink => {
        const id = newLink.getAttribute('data-link-id');
        collapsedLinksToKeep.add(id);
        const existingLink = existingCollapsedLinksMap.get(id);

        if (existingLink) {
            existingLink.style.transition = `x1 ${animationDuration}ms, y1 ${animationDuration}ms, x2 ${animationDuration}ms, y2 ${animationDuration}ms, stroke 300ms ease, opacity ${fadeInDuration}ms ease`;
            existingLink.setAttribute('x1', newLink.getAttribute('x1'));
            existingLink.setAttribute('y1', newLink.getAttribute('y1'));
            existingLink.setAttribute('x2', newLink.getAttribute('x2'));
            existingLink.setAttribute('y2', newLink.getAttribute('y2'));
            existingLink.setAttribute('stroke', newLink.getAttribute('stroke'));
        } else {
            newLink.style.opacity = '0';
            newLink.style.transition = `opacity ${fadeInDuration}ms ease-in`;
            const firstNode = stage.querySelector('.mm-node');
            if (firstNode && firstNode.parentNode === stage) {
                stage.insertBefore(newLink, firstNode);
            } else {
                stage.appendChild(newLink);
            }
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    newLink.style.opacity = '1';
                });
            });
        }
    });

    newExpandBtns.forEach(newBtn => {
        const id = newBtn.getAttribute('data-for-id');
        expandBtnsToKeep.add(id);
        const existingBtn = existingExpandBtnsMap.get(id);

        if (existingBtn) {
            existingBtn.style.transition = `transform ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${fadeInDuration}ms ease`;
            existingBtn.setAttribute('transform', newBtn.getAttribute('transform'));

            const newCircle = newBtn.querySelector('circle');
            const existingCircle = existingBtn.querySelector('circle');
            if (newCircle && existingCircle) {
                existingCircle.setAttribute('fill', newCircle.getAttribute('fill'));
            }
        } else {
            newBtn.style.opacity = '0';
            newBtn.style.transition = `opacity ${fadeInDuration}ms ease-in`;
            stage.appendChild(newBtn);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    newBtn.style.opacity = '1';
                });
            });
        }
    });

    existingNodesMap.forEach((el, id) => {
        if (!nodesToKeep.has(id)) {
            el.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
            el.style.opacity = '0';
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, fadeOutDuration);
        }
    });

    const newContextLinks = newSvg.querySelectorAll('.mm-context-link');
    const existingContextLinksMap = new Map();
    svg.querySelectorAll('.mm-context-link').forEach(el => {
        const id = el.getAttribute('href');
        existingContextLinksMap.set(id, el);
    });
    newContextLinks.forEach(newLink => {
        const id = newLink.getAttribute('href');
        const existingLink = existingContextLinksMap.get(id);
        if (existingLink) {
            const newRect = newLink.querySelector('rect');
            const existingRect = existingLink.querySelector('rect');
            if (newRect && existingRect) {
                existingRect.style.transition = `x ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), y ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                existingRect.setAttribute('x', newRect.getAttribute('x'));
                existingRect.setAttribute('y', newRect.getAttribute('y'));
                existingRect.setAttribute('width', newRect.getAttribute('width'));
                existingRect.setAttribute('height', newRect.getAttribute('height'));
            }
            const newText = newLink.querySelector('text');
            const existingText = existingLink.querySelector('text');
            if (newText && existingText) {
                existingText.style.transition = `x ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), y ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                existingText.setAttribute('x', newText.getAttribute('x'));
                existingText.setAttribute('y', newText.getAttribute('y'));
            }
            const newIcon = newLink.querySelector('svg');
            const existingIcon = existingLink.querySelector('svg');
            if (newIcon && existingIcon) {
                existingIcon.style.transition = `x ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), y ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                existingIcon.setAttribute('x', newIcon.getAttribute('x'));
                existingIcon.setAttribute('y', newIcon.getAttribute('y'));
            }
        } else {
            const titleNode = svg.querySelector('.mm-node[data-node-id="0"]');
            if (titleNode) {
                titleNode.appendChild(newLink.cloneNode(true));
            }
        }
    });
    existingContextLinksMap.forEach((el, id) => {
        if (!Array.from(newContextLinks).some(nl => nl.getAttribute('href') === id)) {
            el.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
            el.style.opacity = '0';
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, fadeOutDuration);
        }
    });

    const newOverflowBtns = newSvg.querySelectorAll('.mm-context-overflow-btn');
    const existingOverflowBtnsMap = new Map();
    svg.querySelectorAll('.mm-context-overflow-btn').forEach(el => {
        const id = 'overflow';
        existingOverflowBtnsMap.set(id, el);
    });
    newOverflowBtns.forEach(newBtn => {
        const id = 'overflow';
        const existingBtn = existingOverflowBtnsMap.get(id);
        if (existingBtn) {
            const newRect = newBtn.querySelector('rect');
            const existingRect = existingBtn.querySelector('rect');
            if (newRect && existingRect) {
                existingRect.style.transition = `x ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), y ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                existingRect.setAttribute('x', newRect.getAttribute('x'));
                existingRect.setAttribute('y', newRect.getAttribute('y'));
                existingRect.setAttribute('width', newRect.getAttribute('width'));
                existingRect.setAttribute('height', newRect.getAttribute('height'));
            }
            const newIcon = newBtn.querySelector('svg');
            const existingIcon = existingBtn.querySelector('svg');
            if (newIcon && existingIcon) {
                existingIcon.style.transition = `x ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), y ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                existingIcon.setAttribute('x', newIcon.getAttribute('x'));
                existingIcon.setAttribute('y', newIcon.getAttribute('y'));
            }
        } else {
            const titleNode = svg.querySelector('.mm-node[data-node-id="0"]');
            if (titleNode) {
                titleNode.appendChild(newBtn.cloneNode(true));
            }
        }
    });
    existingOverflowBtnsMap.forEach((el, id) => {
        if (!newOverflowBtns.length) {
            el.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
            el.style.opacity = '0';
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, fadeOutDuration);
        }
    });

    existingLinksMap.forEach((el, id) => {
        if (!linksToKeep.has(id)) {
            el.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
            el.style.opacity = '0';
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, fadeOutDuration);
        }
    });

    existingCollapsedLinksMap.forEach((el, id) => {
        if (!collapsedLinksToKeep.has(id)) {
            el.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
            el.style.opacity = '0';
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, fadeOutDuration);
        }
    });

    existingExpandBtnsMap.forEach((el, id) => {
        if (!expandBtnsToKeep.has(id)) {
            el.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
            el.style.opacity = '0';
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, fadeOutDuration);
        }
    });

    try {
        const prevStyle = svg.__mmwPrevStyleText || '';
        const nextStyle = svg.__mmwNextStyleText || '';
        const styleChanged = prevStyle !== nextStyle;
        if (styleChanged && document.fonts && document.fonts.load) {
            const fams = (typeof __mmwExtractFontFamiliesFromJson === 'function')
                ? __mmwExtractFontFamiliesFromJson(editor.value)
                : [];
            if (Array.isArray(fams) && fams.length) {
                const sizePx = 16;
                const cleaned = fams.map(n => String(n).trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
                Promise.allSettled(cleaned.map(n => document.fonts.load(`${sizePx}px "${n}"`, 'BESbwy')))
                    .finally(() => {
                        if (!svg.__mmwFontRefitDone) {
                            svg.__mmwFontRefitDone = true;
                            requestAnimationFrame(() => updateMindMap());
                            setTimeout(() => { svg.__mmwFontRefitDone = false; }, 1000);
                        }
                    });
            }
        }
    } catch { }

    if (isEditing) {
        if (viewBoxAnimationId) {
            cancelAnimationFrame(viewBoxAnimationId);
            viewBoxAnimationId = null;
        }
        svg.setAttribute('viewBox', newSvg.getAttribute('viewBox'));
        svg.setAttribute('width', newSvg.getAttribute('width'));
        svg.setAttribute('height', newSvg.getAttribute('height'));
    } else {
        animateViewBox(svg, newSvg.getAttribute('viewBox'), newSvg.getAttribute('width'), newSvg.getAttribute('height'), animationDuration);
    }
}



let containerRect = null;



function startResize(e) {
    e.preventDefault();

    containerRect = appContainer.getBoundingClientRect();

    document.body.classList.add('resizing');

    window.addEventListener('mousemove', doResize);
    window.addEventListener('mouseup', stopResize);
}

function doResize(e) {
    const newEditorWidth = e.clientX - containerRect.left;

    const minWidth = 100;
    const maxWidth = containerRect.width - 100;

    const clampedWidth = Math.max(minWidth, Math.min(newEditorWidth, maxWidth));

    window.requestAnimationFrame(() => {
        editorContainer.style.flexBasis = `${clampedWidth}px`;
    });
}

function stopResize() {
    document.body.classList.remove('resizing');
    window.removeEventListener('mousemove', doResize);
    window.removeEventListener('mouseup', stopResize);
    containerRect = null;
}



function updateTransform() {
    const svg = preview.querySelector('svg');
    if (svg) {
        svg.style.transform = `scale(${scale}) translate(${currentPoint.x / scale}px, ${currentPoint.y / scale}px)`;
        svg.style.transformOrigin = '0 0';
    }
}

function fitToScreen() {
    const svg = preview.querySelector('svg');
    if (!svg) return;
    closeContextMenus();

    svg.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

    scale = 1;
    currentPoint = { x: 0, y: 0 };
    updateTransform();

    setTimeout(() => {
        svg.style.transition = '';
    }, 500);
}

function centerMindMap() {
    const svg = preview ? preview.querySelector('svg') : null;
    if (!svg) return;

    const svgWidth = parseFloat(svg.getAttribute('width'));
    const svgHeight = parseFloat(svg.getAttribute('height'));

    const containerRect = preview.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    if (containerWidth === 0 || containerHeight === 0) {
        setTimeout(centerMindMap, 10);
        return;
    }

    scale = 1;

    currentPoint.x = 0;
    currentPoint.y = 0;

    svg.style.transform = `translate(${currentPoint.x}px, ${currentPoint.y}px) scale(${scale})`;
}


window.centerMindMap = centerMindMap;

function attachCanvasListeners() {
    if (!preview) return;

    preview.addEventListener('wheel', (e) => {
        if (!preview.querySelector('svg')) return;
        e.preventDefault();
        closeContextMenus();
        const scaleAmount = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(0.1, scale * scaleAmount), 10);
        const rect = preview.getBoundingClientRect();
        const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
        const scaleRatio = newScale / scale;
        currentPoint.x = mouseX - (mouseX - currentPoint.x) * scaleRatio;
        currentPoint.y = mouseY - (mouseY - currentPoint.y) * scaleRatio;
        scale = newScale;
        updateTransform();
    });

    preview.addEventListener('mousedown', (e) => {
        if (!preview.querySelector('svg')) return;
        const t = e.target;
        if (t && typeof t.closest === 'function' && t.closest('a')) {
            return;
        }
        if (t && typeof t.closest === 'function' && t.closest('.mm-add-btn')) {
            return;
        }
        if (t && typeof t.closest === 'function' && t.closest('.mm-node')) {
        } else {
            e.preventDefault();
        }
        closeContextMenus();
        isPanning = true;
        startPoint = { x: e.clientX - currentPoint.x, y: e.clientY - currentPoint.y };
        preview.classList.add('panning');
    });
    window.addEventListener('mouseup', () => { isPanning = false; preview.classList.remove('panning'); });
    window.addEventListener('mousemove', (e) => { if (!isPanning) return; e.preventDefault(); currentPoint = { x: e.clientX - startPoint.x, y: e.clientY - startPoint.y }; updateTransform(); });

    let initialPinchDistance = null;

    function getDistance(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getCenter(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2,
        };
    }

    preview.addEventListener('touchstart', (e) => {
        if (!preview.querySelector('svg')) return;
        const t = e.target;
        if (t && typeof t.closest === 'function' && (t.closest('a') || t.closest('.mm-add-btn'))) {
            return;
        }

        if (e.touches.length > 1) {
            e.preventDefault();
        }

        closeContextMenus();

        if (e.touches.length === 1) {
            isPanning = true;
            initialPinchDistance = null;
            startPoint = { x: e.touches[0].clientX - currentPoint.x, y: e.touches[0].clientY - currentPoint.y };
            preview.classList.add('panning');
        } else if (e.touches.length === 2) {
            isPanning = false;
            initialPinchDistance = getDistance(e.touches);
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!isPanning && initialPinchDistance === null) return;

        if (preview.querySelector('svg')) {
            e.preventDefault();
        } else {
            return;
        }

        if (e.touches.length === 1 && isPanning) {
            currentPoint = { x: e.touches[0].clientX - startPoint.x, y: e.touches[0].clientY - startPoint.y };
            updateTransform();
        } else if (e.touches.length === 2 && initialPinchDistance !== null) {
            const newDistance = getDistance(e.touches);
            const scaleAmount = newDistance / initialPinchDistance;
            const newScale = Math.min(Math.max(0.1, scale * scaleAmount), 10);

            const rect = preview.getBoundingClientRect();
            const center = getCenter(e.touches);
            const mouseX = center.x - rect.left;
            const mouseY = center.y - rect.top;

            const scaleRatio = newScale / scale;
            currentPoint.x = mouseX - (mouseX - currentPoint.x) * scaleRatio;
            currentPoint.y = mouseY - (mouseY - currentPoint.y) * scaleRatio;
            scale = newScale;

            updateTransform();
            initialPinchDistance = newDistance;
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            isPanning = false;
            preview.classList.remove('panning');
            initialPinchDistance = null;
        } else if (e.touches.length === 1) {
            isPanning = true;
            initialPinchDistance = null;
            startPoint = { x: e.touches[0].clientX - currentPoint.x, y: e.touches[0].clientY - currentPoint.y };
        }
    });
}

function zoom(factor) {
    if (!preview.querySelector('svg')) return;
    closeContextMenus();
    const newScale = Math.min(Math.max(0.1, scale * factor), 10);
    const rect = preview.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const scaleRatio = newScale / scale;

    currentPoint.x = centerX - (centerX - currentPoint.x) * scaleRatio;
    currentPoint.y = centerY - (centerY - currentPoint.y) * scaleRatio;
    scale = newScale;
    updateTransform();
}

function __mmwExtractFontFamiliesFromJson(json) {
    try {
        const parsed = JSON.parse(json);
        const s = parsed['mm-settings'] || parsed.mmSettings;
        const ff = s ? (s['font-family'] ?? s.fontFamily ?? s.fonts) : null;
        if (!ff) return [];
        if (Array.isArray(ff)) return ff.map(f => String(f).trim()).filter(Boolean);
        if (typeof ff === 'string') return ff.split(',').map(x => x.trim()).filter(Boolean);
        return [];
    } catch { return []; }
}

window.fitToScreen = fitToScreen;
window.zoomMindMap = zoom;

function hierarchyToJson(hierarchy) {
    function convert(node) {
        const obj = {
            content: node.text || '',
            children: []
        };
        if (node.collapsed) obj.collapsed = true;
        if (node.branchColor) {
            obj.branchColor = node.branchColor;
        }
        if (node.notes && node.notes.trim().length > 0) {
            obj.notes = node.notes;
        }
        if (node.citations && Array.isArray(node.citations) && node.citations.length > 0) {
            obj.citations = node.citations;
        }
        if (node.children && node.children.length > 0) {
            obj.children = node.children.map(convert);
        }
        return obj;
    }

    const root = convert(hierarchy.children[0]);


    if (hierarchy.id === 'root' && hierarchy.text === 'Root' && hierarchy.children.length > 0) {
        return JSON.stringify({ "mm-node": convert(hierarchy.children[0]) }, null, 2);
    } else {
        return JSON.stringify({ "mm-node": convert(hierarchy) }, null, 2);
    }
}

function resetMindMapHistory() {
    if (typeof HistoryManager !== 'undefined') {
        HistoryManager.undoStack = [];
        HistoryManager.redoStack = [];
        HistoryManager.updateButtons();
    }

    previousHierarchy = null;
    currentHierarchy = null;
    
    lastRenderedStyle = null;

    scale = 1;
    currentPoint = { x: 0, y: 0 };
    if (typeof updateTransform === 'function') {
        updateTransform();
    }

    window.__editingNodeId = null;
    if (typeof closeContextMenus === 'function') {
        closeContextMenus();
    }
    
    const activeEditor = document.querySelector('.node-edit-fo');
    if (activeEditor) {
        activeEditor.remove();
    }
};
