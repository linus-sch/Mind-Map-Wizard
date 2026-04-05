class ChatManager {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.chatHistory = [];
        this.apiEndpoint = '/chat/edit';

        this.drawer = document.getElementById('chat-drawer');
        this.messagesContainer = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send-btn');
        this.closeBtn = document.getElementById('close-chat-btn');
        this.toggleBtn = document.getElementById('chat-toggle-btn');
        this.loadingIndicator = document.getElementById('chat-loading');
        this.suggestionsContainer = document.getElementById('chat-suggestions');

        this.init();
    }

    init() {
        if (!this.drawer) return;

        this.closeBtn.addEventListener('click', () => this.toggle(false));
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }

        const adjustHeight = () => {
            this.input.style.height = 'auto';
            const newHeight = Math.min(this.input.scrollHeight, 160);
            this.input.style.height = newHeight + 'px';

            if (this.input.scrollHeight > 160) {
                this.input.style.overflowY = 'auto';
            } else {
                this.input.style.overflowY = 'hidden';
            }
        };

        this.input.addEventListener('input', adjustHeight);
        window.addEventListener('resize', adjustHeight);
        this.adjustHeight = adjustHeight;

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
                this.adjustHeight();
            }
        });

        if (this.suggestionsContainer) {
            this.suggestionsContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.chat-suggestion');
                if (btn) {
                    const text = btn.textContent;
                    this.input.value = text;
                    this.sendMessage();
                }
            });
        }

        if (this.chatHistory.length === 0) {
            this.addSystemMessage("");
        }

        setTimeout(() => {
            this.adjustHeight();
        }, 0);
    }

    toggle(forceState = null) {
        if (forceState !== null) {
            this.isOpen = forceState;
        } else {
            this.isOpen = !this.isOpen;
        }

        if (this.isOpen) {
            if (window.playHaptic) window.playHaptic('1');
            this.drawer.classList.add('open');
            document.body.classList.add('chat-open');
            setTimeout(() => this.input.focus(), 300);
        } else {
            this.drawer.classList.remove('open');
            document.body.classList.remove('chat-open');
        }
    }

    reset() {
        if (this.chatHistory.length === 0 && this.messagesContainer && this.messagesContainer.children.length > 0) {
        }
        
        if (this.chatHistory.length === 0 && this.messagesContainer && this.messagesContainer.children.length === 1) {
            return;
        }

        this.chatHistory = [];
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
            this.addSystemMessage("");
        }
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'flex';
        }
    }

    /**
     * Generate a unique ID matching backend format
     * @returns {string} Timestamp-based unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Recursively assign unique IDs to all nodes in the structure
     * Only assigns IDs to nodes that don't already have them
     * @param {Object} node - The node to process
     */
    assignIdsToStructure(node) {
        if (!node) return;

        if (!node.id) {
            node.id = this.generateId();
        }

        if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child) => {
                this.assignIdsToStructure(child);
            });
        }
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text || this.isLoading) return;

        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'none';
        }

        this.input.value = '';
        this.adjustHeight();
        this.addUserMessage(text);
        this.setLoading(true);

        try {
            let mmJson = null;
            const editor = document.getElementById('json-editor');
            const editorValue = editor ? editor.value : null;

            const parseOrConvert = (content) => {
                if (!content) return null;
                try {
                    return JSON.parse(content);
                } catch (e) {
                    if (window.markdownToMmJson) {
                        return window.markdownToMmJson(content);
                    }
                }
                return null;
            };

            if (editorValue) {
                mmJson = parseOrConvert(editorValue);
            }

            if (!mmJson && window.currentMindmap && window.currentMindmap.markdown) {
                mmJson = parseOrConvert(window.currentMindmap.markdown);
            }

            if (!mmJson && window.currentMarkdown) {
                mmJson = parseOrConvert(window.currentMarkdown);
            }

            if (!mmJson) {
                throw new Error("Could not retrieve current mind map structure.");
            }

            if (mmJson['mm-node']) {
                this.assignIdsToStructure(mmJson['mm-node']);
            }

            const token = await window.Clerk.session.getToken();
            if (!token) throw new Error("Please sign in to use AI features.");

            const response = await fetch('https://gen.mindmapwizard.com/chat/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    input: text,
                    mmjson: mmJson,
                    chatHistory: this.chatHistory
                })
            });

            const result = await response.json();

            if (result.error === 'LIMIT_ERROR') {
                if (result.details?.plan === 'pro') {
                    if (typeof window.showProPlanSpecialAIRequestsPopup === 'function') {
                        window.showProPlanSpecialAIRequestsPopup(true);
                    }
                } else {
                    if (typeof window.showFreeLimitPopup === 'function') {
                        window.showFreeLimitPopup(true, 'assitant');
                    }
                }
                
                const userMessages = this.messagesContainer.querySelectorAll('.chat-message.user');
                if (userMessages.length > 0) {
                    userMessages[userMessages.length - 1].remove();
                }

                if (this.suggestionsContainer && this.chatHistory.length === 0) {
                    this.suggestionsContainer.style.display = 'flex';
                }
                
                return;
            }

            if (!result.success) {
                throw new Error(result.message || "Failed to edit mind map.");
            }

            this.addBotMessage(result.message);

            this.chatHistory.push({ role: 'user', content: text });
            this.chatHistory.push({ role: 'assistant', content: result.message });

            if (result.modifiedMmJson) {
                this.applyMindMapUpdates(result.modifiedMmJson);
            }

            if (result.frontendCommand) {
                this.handleFrontendCommand(result.frontendCommand);
            }

        } catch (error) {
            console.error("Chat Error:", error);
            this.addSystemMessage(`Error: ${error.message}`, true);
        } finally {
            this.setLoading(false);
        }
    }

    applyMindMapUpdates(newMmJson) {
        try {
            const jsonStr = JSON.stringify(newMmJson, null, 2);

            window.currentMarkdown = jsonStr;
            if (window.currentMindmap) {
                window.currentMindmap.markdown = jsonStr;
            }

            if (typeof window.extractTitleFromMindMapContent === 'function') {
                const newTitle = window.extractTitleFromMindMapContent(jsonStr);
                window.currentMindmapTitle = newTitle;
                if (newTitle) {
                    document.title = `${newTitle} - Mind Map Wizard`;

                    if (window.currentMindmap?.id && typeof window.updateSidebarItemTitle === 'function') {
                        window.updateSidebarItemTitle(window.currentMindmap.id, newTitle);
                    }
                }
            }

            const editor = document.getElementById('json-editor');
            if (editor) {
                editor.value = jsonStr;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (typeof window.renderMindmapFromJSON === 'function') {
                window.renderMindmapFromJSON(jsonStr);
            }

            if (window.currentMindmap?.id && typeof window.saveMindMap === 'function') {
                window.saveMindMap(
                    window.currentMindmap.id,
                    window.currentMindmapTitle || window.currentMindmap.title,
                    jsonStr
                ).catch(err => console.error("Auto-save failed:", err));
            }

        } catch (e) {
            console.error("Failed to update mind map UI:", e);
        }
    }

    /**
     * Handle frontend commands from the API response.
     * Supports actions: export (with format), share
     * @param {Object} command - The frontend command object
     */
    handleFrontendCommand(command) {
        if (!command || !command.action) {
            console.warn("Invalid frontend command:", command);
            return;
        }

        try {
            switch (command.action) {
                case 'export':
                    const format = command.format || 'png';
                    if (typeof window.downloadMindmap === 'function') {
                        window.downloadMindmap(format);
                    } else {
                        console.error("downloadMindmap function not available");
                    }
                    break;

                case 'share':
                    if (typeof window.shareMindmap === 'function') {
                        window.shareMindmap();
                    } else {
                        console.error("shareMindmap function not available");
                    }
                    break;

                default:
                    console.warn("Unknown frontend command action:", command.action);
            }
        } catch (e) {
            console.error("Error executing frontend command:", e);
        }
    }

    addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-message user';
        div.textContent = text;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    addBotMessage(text) {
        if (!text) return;
        const div = document.createElement('div');
        div.className = 'chat-message bot';
        this.messagesContainer.appendChild(div);

        let i = 0;
        const speed = 10;
        const typingInterval = setInterval(() => {
            if (i < text.length) {
                div.textContent += text.charAt(i);
                i++;
                this.scrollToBottom();
            } else {
                clearInterval(typingInterval);
            }
        }, speed);
        
        this.scrollToBottom();
    }

    addSystemMessage(text, isError = false) {
        const div = document.createElement('div');
        div.className = `chat-message system ${isError ? 'error' : ''}`;
        div.innerHTML = `<span><svg xmlns="http://www.w3.org/2000/svg" viewBox="34.0431 91.0588 732.1 617.8" height="60px" width="60px" style="margin-top:20vh;">
                        <path d="M436.302 93.75c5.558-5.253 9.438-3.012 14.638 8.457 3.475 7.665 8.184 21.583 12.617 37.293 1.741 6.172 2.353 8.536 6.863 26.5a5547 5547 0 004.552 18 816 816 0 013.429 14c.833 3.575 2.683 11.45 4.113 17.5s3.075 13.25 3.656 16 1.867 8.6 2.859 13c3.084 13.676 5.743 25.693 7.415 33.5a2550 2550 0 003.495 16 871 871 0 013.565 17c.922 4.675 2.348 11.378 3.169 14.897.822 3.518 1.865 8.469 2.319 11s1.726 8.878 2.828 14.103c4.853 23.02 10.47 50.907 11.179 55.5.424 2.75 1.468 7.925 2.32 11.5.851 3.575 1.762 7.85 2.024 9.5s1.459 7.95 2.659 14c3.222 16.234 5.941 30.34 6.942 36 3.888 21.999 16.346 53.249 26.294 65.954 11.574 14.782 19.695 17.564 50.33 17.244 15.696-.164 20.128.119 25.932 1.655 14.391 3.811 23.442 9.591 39.5 25.228 6.325 6.159 12.85 12.319 14.5 13.689 5.833 4.845 42.45 44.403 52.654 56.884 19.734 24.138 24.75 36.899 15.596 39.677-6.802 2.065-110.257 4.936-259.75 7.21-34.375.522-87.25 1.416-117.5 1.986-30.25.569-111.823 1.305-181.273 1.635-131.495.623-161.857.03-166.977-3.261-5.611-3.608-.402-11.941 14.25-22.793 8.361-6.192 13.556-9.271 32.994-19.549 6.751-3.569 32.885-15.542 48.006-21.992 5.5-2.347 10.714-4.63 11.588-5.074.873-.444 6.498-2.691 12.5-4.993 6.001-2.302 12.819-5.044 15.151-6.093S175.278 623 175.645 623s6.56-2.292 13.761-5.093c7.202-2.8 15.569-6.001 18.594-7.113 12.423-4.564 16.648-6.154 19.5-7.341 1.65-.686 7.285-2.677 12.523-4.424l9.523-3.176 14.977 2.122A5624 5624 0 01293 602.098c7.425 1.101 16.875 2.422 21 2.938a674 674 0 0114.5 1.999c3.85.584 10.6 1.481 15 1.992 4.4.512 11.15 1.403 15 1.98 3.85.578 10.825 1.46 15.5 1.961 24.932 2.674 45.199 4.97 48.159 5.457 1.838.302 10.766 1.011 19.841 1.574s17.512 1.296 18.75 1.629c4.018 1.081 2.631-2.348-1.5-3.707-2.062-.679-6.675-2.69-10.25-4.468-15.027-7.475-44.12-19.425-105-43.127a1219 1219 0 00-15.5-5.861c-4.95-1.831-12.15-4.513-16-5.959s-10.6-3.919-15-5.494a569 569 0 01-20.645-7.823c-1.455-.583-2.851-1.651-3.102-2.374s.865-4.915 2.48-9.315 5.321-14.75 8.237-23 6.277-17.7 7.47-21c6.595-18.245 34.461-101.641 55.97-167.5 6.197-18.975 12.083-36.75 13.081-39.5s4.317-12.65 7.375-22c3.058-9.35 9.213-27.575 13.678-40.5 4.464-12.925 8.496-24.625 8.959-26 6.212-18.458 13.999-38.552 24.026-62 9.602-22.456 15.187-32.497 21.273-38.25" 
                        fill="rgba(0, 0, 0, 0.06)"/>
                        </svg><br>${text}</span>`;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    setLoading(loading) {
        this.isLoading = loading;
        if (loading) {
            this.loadingIndicator.style.display = 'flex';
            this.messagesContainer.appendChild(this.loadingIndicator);
            this.input.disabled = true;
            this.scrollToBottom();
        } else {
            this.loadingIndicator.style.display = 'none';
            this.input.disabled = false;
            this.input.focus();
        }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
});