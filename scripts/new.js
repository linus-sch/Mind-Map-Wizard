async function generateMindmap(mindmapTopic, isRegenerate = false) {
	if (!mindmapTopic) return;


	if (!isRegenerate) {
		document.getElementById('header').style.display = 'none';
		document.getElementById('ai-content-disclaimer').style.display = 'block';
		document.getElementById('mindmap').style.display = 'none';
	}
	document.getElementById('loading-animation').style.display = 'flex';

	if (isRegenerate) {
		const regenerateBtn = document.getElementById('regenerate-button');
		regenerateBtn.classList.add('rotating');
	}

	currentMindmapTitle = mindmapTopic;
	document.getElementById('mindmap').style.display = 'block';

	try {
			let apiKey = getStoredApiKey();
			if (!apiKey) {
				const apiKeyInput = document.getElementById('openrouter-api-key');
				apiKey = apiKeyInput?.value?.trim();
			}
	
			if (!apiKey) {
				showApiKeyPopup();
				return;
			}

		const requestPayload = {
			model: getSelectedModel(),
			messages: [
				{
					role: "user",
					content: `Create a comprehensive mind map about: ${mindmapTopic.trim()}
Generate the mind map as Markdown text using the following structure:

# Matching Mind Map Title
## Branch 1
### Sub Branch A
### Sub Branch B
## Branch 2

**Formatting Requirements:**
- Each text element must be aligned to a specific hierarchical level using a new line plus the appropriate number of # symbols
- Aim for 2-3 levels of depth to keep the mind map scannable and not overwhelming
- For large enumerations (6+ items), combine related items into comma-separated lists within a single branch rather than creating excessive sub-branches

**Content Requirements:**
- Include **specific, concrete details and facts**, not just category labels
  - ❌ Bad: "## Education" 
  - ✅ Good: "## Education: PhD in Physics from MIT (2015)"
- Avoid generic structural sections like "Overview," "Introduction," or "Conclusion" – this is a mind map, not an essay
- If the topic contains extensive information, prioritize breadth over depth and consolidate where necessary
- Focus on the most relevant and interesting information that creates a useful knowledge structure
- Make the branches have different lengths for making the mind map visually more interesting.

**Output Format:**
Structure your response exactly like this:
{
	"markdown": "# Main Topic\\n\\n## Subtopic 1\\n- Point A\\n- Point B\\n\\n## Subtopic 2\\n- Point C\\n- Point D"
}  
`    
    
				}
			],
			max_tokens: 2000,
			temperature: 0.7
		};

		// Add reasoning parameter if toggle is enabled
		if (getReasoningEnabled()) {
			requestPayload.reasoning = { exclude: true };
		}

		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
				'HTTP-Referer': window.location.origin,
				'X-Title': 'Mind Map Wizard'
			},
			body: JSON.stringify(requestPayload)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));

			if (response.status === 401) {
				throw new Error('Invalid OpenRouter API key. Please check your API key and try again.');
			} else if (response.status === 429) {
				throw new Error('Rate limit exceeded. Please wait before trying again.');
			} else if (response.status === 402) {
				throw new Error('Insufficient credits. Please check your OpenRouter account balance.');
			} else {
				throw new Error(errorData.error?.message || `API error: ${response.status}`);
			}
		}

		const data = await response.json();

		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			throw new Error('Invalid response from OpenRouter API');
		}

		let parsedContent;
		try {
			const content = data.choices[0].message.content.trim();

			// Extract JSON from content that may have additional text
			// Look for JSON object starting with { and ending with }
			const jsonMatch = content.match(/\{[^]*"markdown"[^]*\}/);
			
			if (jsonMatch) {
				let jsonContent = jsonMatch[0];
				
				// Parse the JSON - the markdown field should already have proper escaping
				try {
					parsedContent = JSON.parse(jsonContent);
				} catch (jsonError) {
					// If parsing fails, try to extract just the markdown value
					const markdownMatch = jsonContent.match(/"markdown"\s*:\s*"([^]*?)"\s*\}/);
					if (markdownMatch) {
						// Extract the markdown content and unescape it
						let markdownContent = markdownMatch[1]
							.replace(/\\n/g, '\n')
							.replace(/\\r/g, '\r')
							.replace(/\\t/g, '\t')
							.replace(/\\"/g, '"')
							.replace(/\\\\/g, '\\');
						parsedContent = { markdown: markdownContent };
					} else {
						throw jsonError;
					}
				}
			} else {
				// No JSON found, assume content is markdown
				parsedContent = { markdown: content };
			}
		} catch (parseError) {
			console.error('Failed to parse API response as JSON:', parseError);
			console.error('Raw content:', data.choices[0].message.content);
			throw new Error('Invalid response format from API');
		}

		if (!parsedContent.markdown) {
			throw new Error('Invalid response from API: missing required markdown field');
		}

		const topic = parsedContent.topic || mindmapTopic;
		const markdown = parsedContent.markdown;

		if (!markdown || typeof markdown !== 'string' || markdown.trim().length === 0) {
			throw new Error('Generated content is empty or invalid');
		}

		const sanitizedMarkdown = markdown
			.replace(/<script[^>]*>.*?<\/script>/gi, '')
			.replace(/javascript:/gi, '')
			.replace(/on\w+\s*=/gi, '')
			.trim();

		if (sanitizedMarkdown.length === 0) {
			throw new Error('Generated content failed security validation');
		}

		const responseData = {
			topic: topic,
			raw: sanitizedMarkdown,
		};

		const {
			topic: finalTopic,
			markdown: finalMarkdown
		} = formatMarkdown(responseData);

		if (finalMarkdown) {
			renderMindmap(finalMarkdown);

			let mindmapId;

			if (!isRegenerate) {
				mindmapId = saveMindmapToHistory(finalTopic || mindmapTopic, finalMarkdown);
			} else {
				const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
				const lastEntry = history[history.length - 1];
				if (lastEntry && lastEntry.topic === finalTopic && lastEntry.markdown !== finalMarkdown) {
					lastEntry.markdown = finalMarkdown;
					localStorage.setItem('mindmap-history', JSON.stringify(history));
					loadMindmapsLeftSidebar();
					mindmapId = lastEntry.id;
				} else {
					mindmapId = saveMindmapToHistory(finalTopic || mindmapTopic, finalMarkdown);
				}
			}

			const navLinks = document.querySelector('.nav-links');

			if (navLinks) {
				navLinks.classList.add('padding-right');
			}

			currentMindmapTitle = finalTopic || mindmapTopic;

			const url = new URL(window.location);

			if (url.searchParams.has('q')) {
				url.searchParams.delete('q');
			}

			if (mindmapId) {
				url.searchParams.set('id', mindmapId);
			}

			window.history.replaceState({}, '', url.toString());
		} else {
			throw new Error('Generated markdown content is empty or invalid after processing.');
		}

		document.getElementById('loading-animation').style.display = 'none';
		document.getElementById('button-container').style.display = 'flex';

		if (isRegenerate) {
			const regenerateBtn = document.getElementById('regenerate-button');
			regenerateBtn.classList.remove('rotating');
		}

} catch (error) {
	console.error('Error generating the mindmap:', error);

	let userMessage = 'An error occurred while generating the mindmap.';
	let shouldShowError = true;

	if (error.message.includes('Rate limit')) {
		userMessage = 'Too many requests. Please wait a moment before trying again.';
	} else if (error.message.includes('network') || error.message.includes('fetch')) {
		userMessage = 'Network error. Please check your connection and try again.';
	} else if (error.message.includes('security')) {
		userMessage = 'Content validation failed. Please try a different topic.';
	} else if (error.message.includes('API key')) {
		userMessage = error.message;
	}

	if (shouldShowError) {
		showErrorPopup(userMessage, mindmapTopic);
	}

	document.getElementById('loading-animation').style.display = 'none';

	if (isRegenerate) {
		const regenerateBtn = document.getElementById('regenerate-button');
		regenerateBtn.classList.remove('rotating');
	}
}

	hideHeader();
}

function initializeMainButtons() {
	const prompt = document.getElementById('prompt');
	const regenerateBtn = document.getElementById('regenerate-button');
	const generateBtn = document.getElementById('generate-mindmap-btn');

	const triggerMindmapGeneration = (topic, isRegenerate = false) => {
		if (isGeneratingMindmap) {
			return;
		}

		isGeneratingMindmap = true;

		generateMindmap(topic, isRegenerate)
			.then(() => {
				isGeneratingMindmap = false;
			})
			.catch(error => {
				console.error("Error during mindmap generation:", error);
				isGeneratingMindmap = false;
			});
	};


	generateBtn?.addEventListener('click', function () {
		const mindmapTopic = prompt?.value.trim();
		if (mindmapTopic) {
			triggerMindmapGeneration(mindmapTopic);
		}
	});

	prompt?.addEventListener('keypress', function (event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const mindmapTopic = prompt.value.trim();
			if (mindmapTopic) {
				triggerMindmapGeneration(mindmapTopic);
			}
		}
	});

	regenerateBtn?.addEventListener('click', function () {
		if (currentMindmapTitle) {
			triggerMindmapGeneration(currentMindmapTitle, true);
		}
	});
}


	function showHeader() {
		const buttonContainer = document.getElementById('button-container');
		if (buttonContainer) {
			buttonContainer.style.display = 'none';
		}
		
		const inAppErrorMessage = document.getElementById('inAppErrorMessage');
		if (inAppErrorMessage) {
			inAppErrorMessage.style.display ='none';
		}
	
		const app = document.getElementById('app');
		if (app ) {
			app.style.display ='block';
		}

		const mindmapElement = document.getElementById('mindmap');
		if (mindmapElement) {
			mindmapElement.style.display = 'none';
		}

		const headerElement = document.getElementById('header');
		if (headerElement) {
			headerElement.style.display = 'block'
			setTimeout(() => {
				headerElement.classList.add('active');
			}, 10);
		}

		const aiContentDisclaimer = document.getElementById('ai-content-disclaimer');
		if (aiContentDisclaimer) {
			aiContentDisclaimer.style.display = 'none';
		}

		const toolbarElement = document.querySelector('.mm-toolbar');
		if (toolbarElement) {
			toolbarElement.style.display = 'none';
		}

		const navLinks = document.getElementById('nav-links');
		if (navLinks) {
			navLinks.classList.remove('padding-right');
		}
		document.getElementById('prompt')?.focus();
		removeUrlParameter('id');
	}








document.addEventListener('DOMContentLoaded', function () {
	initializeEditMode();
	initializePopupElements();
	addMindmapActionStyles();
	loadReasoningPreference();


	const randomTextElement = document.getElementById('randomText');
	if (randomTextElement) {
		randomTextElement.textContent = getRandomText();
	}
	const openSearchPopupBtn = document.getElementById('openSearchPopupBtn');
	const closeSearchPopupBtn = document.getElementById('closeSearchPopupBtn');
	const searchMindmapsPopupOverlay = document.getElementById('searchMindmapsPopupOverlay');
	const popupMindmapSearchInput = document.getElementById('popupMindmapSearchInput');


	if (openSearchPopupBtn) {
		openSearchPopupBtn.addEventListener('click', openSearchMindmapsPopup);
	}
	if (closeSearchPopupBtn) {
		closeSearchPopupBtn.addEventListener('click', closeSearchMindmapsPopup);
	}
	if (searchMindmapsPopupOverlay) {
		searchMindmapsPopupOverlay.addEventListener('click', function (e) {
			if (e.target === this) {
				closeSearchMindmapsPopup();
			}
		});
	}
	if (popupMindmapSearchInput) {
		popupMindmapSearchInput.addEventListener('input', (event) => {
			filterAndDisplayMindmapsInPopup(event.target.value);
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && searchMindmapsPopupOverlay.classList.contains('active')) {
				closeSearchMindmapsPopup();
			}
		});
	}
});



function removeUrlParameter(param) {
	const url = new URL(window.location.href);
	if (url.searchParams.has(param)) {
		url.searchParams.delete(param);
		window.history.replaceState({}, document.title, url.toString());
	}
}

function initLeftSidebar() {
	const leftSidebar = document.getElementById('leftSidebar');
	const toggle = document.getElementById('leftSidebarToggle');
	const app = document.getElementById('app');
	const mindmap = document.getElementById('mindmap');
	const menubar = document.getElementById('menubar');

	if (!leftSidebar || !toggle) {
		console.error('Left sidebar elements not found');
		return;
	}

	if (!leftSidebar.querySelector('.sidebar-navbar')) {
		const navbar = document.createElement('div');
		navbar.className = 'sidebar-navbar';
		leftSidebar.insertBefore(navbar, leftSidebar.firstChild);
	}

	const sidebarState = localStorage.getItem('left-sidebar-state');
	if (sidebarState === 'open') {
		leftSidebar.classList.add('open');
		if (app) app.classList.add('left-sidebar-open');
		if (mindmap) mindmap.classList.add('left-sidebar-open');

		if (menubar) {
			menubar.classList.add('sidebar-open');
		}
	}

	loadMindmapsLeftSidebar();
}

function initializeEditMode() {
	const editModeButton = document.getElementById('edit-mode-button');
	const cancelEditButton = document.getElementById('cancel-edit');
	const saveEditButton = document.getElementById('save-edit');

	editModeButton?.addEventListener('click', () => toggleEditMode(true));
	cancelEditButton?.addEventListener('click', () => toggleEditMode(false));
	saveEditButton?.addEventListener('click', updateMindmapFromEdit);
}

function saveMindmapToHistory(topic, markdown) {
	const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
	const timestamp = new Date().toISOString();

	history.push({
		topic,
		markdown,
		timestamp,
		id: Date.now()
	});

	if (history.length > 100) {
		history.shift();
	}

	localStorage.setItem('mindmap-history', JSON.stringify(history));

	if (typeof loadMindmapsLeftSidebar === 'function') {
		loadMindmapsLeftSidebar();
	}
}

function updateCurrentMindmap() {
	const mindmapElement = document.getElementById('mindmap');
	const markdown = mindmapElement ?
		mindmapElement.getAttribute('data-markdown') || '' :
		'';
	currentMindmap = {
		topic: currentMindmapTitle,
		markdown: markdown,
		timestamp: new Date().toISOString(),
	};
}
function renderErrorMessage(container, error, markdown) {
	const errorMessage = document.createElement('div');
	errorMessage.textContent = 'Error rendering the mindmap: ' + error.message;
	errorMessage.style.color = 'var(--error-color)';
	errorMessage.style.padding = '20px';
	errorMessage.style.textAlign = 'center';
	errorMessage.style.marginTop = '50px';
	container.appendChild(errorMessage);

	const errorDetails = document.createElement('pre');
	errorDetails.textContent =
		'Markdown content (first 100 chars): ' +
		(markdown ? markdown.substring(0, 100) + '...' : 'undefined');
	errorDetails.style.fontSize = '12px';
	errorDetails.style.margin = '20px';
	errorDetails.style.padding = '10px';
	errorDetails.style.background = '#f5f5f5';
	errorDetails.style.border = '1px solid #ddd';
	errorDetails.style.borderRadius = '4px';
	errorDetails.style.overflow = 'auto';
	container.appendChild(errorDetails);
}

function toggleEditMode(show) {
	const mindmapElement = document.getElementById('mindmap');
	const editorElement = document.getElementById('markdown-editor');
	const textarea = document.getElementById('markdown-textarea');
	const editorOverlay = document.getElementById('editor-overlay');

	if (show) {
		editorElement.classList.add('show');
		editorOverlay.classList.add('show');
		textarea.value = window.currentMarkdown || '';
		textarea.focus();
	} else {
		editorElement.classList.remove('show');
		editorOverlay.classList.remove('show');

		mindmapElement.style.display = 'block';
	}
}

function handleUrlParameters() {
  if (!window.markmap?.autoLoader) {
    setTimeout(handleUrlParameters, 50);
    return;
  }

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const q  = params.get('q');

  if (id) {
    loadMindMapById(id);
  } else if (q) {
    generateMindmap(q);
    removeQueryParam('q');
  }
}

function initLeftSidebar() {
	const leftSidebar = document.getElementById('leftSidebar');
	const toggle = document.getElementById('leftSidebarToggle');
	const app = document.getElementById('app');
	const mindmap = document.getElementById('mindmap');
	const menubar = document.getElementById('menubar');

	if (!leftSidebar || !toggle) {
		console.error('Left sidebar elements not found');
		return;
	}

	if (!leftSidebar.querySelector('.sidebar-navbar')) {
		const navbar = document.createElement('div');
		navbar.className = 'sidebar-navbar';
		leftSidebar.insertBefore(navbar, leftSidebar.firstChild);
	}

	const sidebarState = localStorage.getItem('left-sidebar-state');
	if (sidebarState === 'open') {
		leftSidebar.classList.add('open');
		if (app) app.classList.add('left-sidebar-open');
		if (mindmap) mindmap.classList.add('left-sidebar-open');

		if (menubar) {
			menubar.classList.add('sidebar-open');
		}
	}

	loadMindmapsLeftSidebar();
}


function updateMindmapFromEdit() {
	const textarea = document.getElementById('markdown-textarea');
	const newMarkdown = textarea.value;

	if (newMarkdown !== currentMarkdown) {
		currentMarkdown = newMarkdown;
		renderMindmap(currentMarkdown);

		const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
		const currentItem = history.find((item) => item.topic === currentMindmapTitle);

		if (currentItem) {
			currentItem.markdown = currentMarkdown;
			localStorage.setItem('mindmap-history', JSON.stringify(history));
			loadMindmapsLeftSidebar();
		}
	}

	toggleEditMode(false);
}


function closeClearPopup() {
	const popup = document.querySelector('.delete-popup');
	if (popup) {
		popup.remove();
	}
}

function confirmClear() {
	localStorage.removeItem('mindmap-history');
	localStorage.removeItem('mindmap_local');
	localStorage.removeItem('mindmap-playground');
	localStorage.removeItem('lastMindmapInput');

	closeClearPopup();

	const url = new URL(window.location.href);
	url.searchParams.delete('q');
	url.searchParams.delete('id');

	window.history.replaceState({}, document.title, url);

	window.location.reload();
}

function initializePopupElements() {
	const popupOverlay = document.createElement('div');
	popupOverlay.className = 'popup-overlay';
	popupOverlay.id = 'popupOverlay';

	const renamePopup = document.createElement('div');
	renamePopup.className = 'custom-popup';
	renamePopup.id = 'renamePopup';
	renamePopup.innerHTML = `
        <div class="popup-header">
            <h3>
                Rename Mind Map
            </h3>
            <button class="popup-close" id="renamePopupClose">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                </svg>
            </button>
        </div>
        <div class="popup-content">
            <div class="popup-message">Enter a new name for this mind map:</div>
            <input type="text" id="renameInput" class="rename-input" placeholder="Mind map name">
            <div class="popup-buttons">
                <button class="popup-btn popup-btn-cancel" id="renameCancelBtn">Cancel</button>
                <button class="popup-btn popup-btn-confirm" id="renameConfirmBtn">Rename</button>
            </div>
        </div>
    `;

	const deletePopup = document.createElement('div');
	deletePopup.className = 'custom-popup';
	deletePopup.id = 'deletePopup';
	deletePopup.innerHTML = `
        <div class="popup-header">
            <h3>
                Delete Mind Map
            </h3>
            <button class="popup-close" id="deletePopupClose">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                </svg>
            </button>
        </div>
        <div class="popup-content">
            <div class="popup-message">Are you sure you want to delete this mind map? This action cannot be undone.</div>
            <div class="popup-buttons">
                <button class="popup-btn popup-btn-cancel" id="deleteCancelBtn">Cancel</button>
                <button class="popup-btn popup-btn-delete" id="deleteConfirmBtn">Delete</button>
            </div>
        </div>
    `;

	popupOverlay.appendChild(renamePopup);
	popupOverlay.appendChild(deletePopup);

	document.body.appendChild(popupOverlay);

	setupPopupEventListeners();
}

const infoButton = document.querySelector('.info-button');
if (infoButton) {
	infoButton.addEventListener('click', function (e) {
		e.preventDefault();
		const infoMenu = document.querySelector('.info-menu');
		if (infoMenu) {
			infoMenu.classList.toggle('show');
		}
	});
}

function hideHeader() {
	const headerElement = document.getElementById('header');
	if (headerElement) {
		headerElement.classList.remove('active');
		headerElement.classList.add('header-hidden');
	}
}


function loadMindMapById(id) {

	if (!id) {
		console.error('No mind map ID provided');
		showErrorMessage('No mind map ID provided');
		return;
	}

	const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');

	const stringId = String(id);

	const mindMap = history.find((item) => String(item.id) === stringId);

	if (!mindMap) {
		console.error('Mind map not found with ID:', stringId);
		showErrorMessage('Mind map not found. It may have been deleted.');
		return;
	}


	updateUrlWithId(stringId);
	hideInitialElements();
	showMindmapElements();

	currentMindmapTitle = mindMap.topic || 'Mind Map';
	localStorage.setItem('lastMindmapInput', mindMap.topic);

	if (mindMap.markdown) {
		try {

			let markdown = mindMap.markdown;

			if (typeof formatMarkdown === 'function') {
				try {
					const formatted = formatMarkdown(mindMap);

					if (formatted && formatted.markdown) {
						markdown = formatted.markdown;
						if (formatted.topic && formatted.topic !== 'Mind Map') {
							currentMindmapTitle = formatted.topic;
						}
					}
				} catch (formatError) {
					console.warn('formatMarkdown failed, using raw markdown:', formatError);
					markdown = mindMap.markdown;
				}
			}

			if (typeof markdown !== 'string') {
				console.warn('Markdown is not a string, converting:', typeof markdown);
				markdown = String(markdown);
			}

			if (!markdown.trim().startsWith('#')) {
				markdown = '# ' + currentMindmapTitle + '\n\n' + markdown;
			}


			currentMarkdown = markdown;

			renderMindmap(markdown);

			document.title = `${currentMindmapTitle} | Mind Map Wizard`;

		} catch (error) {
			console.error('Error processing mindmap:', error);
			showErrorMessage('Error loading the mind map: ' + error.message);
		}
	} else {
		console.error('Mind map has no markdown content');
		showErrorMessage('The mind map content is empty or corrupted.');
	}


	const navLinks = document.querySelector('.nav-links');
	if (navLinks) {
		navLinks.classList.add('padding-right');
	}

	hideHeader();
}

const API_KEY_ENCRYPTION_KEY = 'mmw_encryption_key_2024';

function encryptApiKey(apiKey) {
	if (!apiKey) return '';

	let encrypted = '';
	for (let i = 0; i < apiKey.length; i++) {
		const keyChar = API_KEY_ENCRYPTION_KEY.charCodeAt(i % API_KEY_ENCRYPTION_KEY.length);
		const apiKeyChar = apiKey.charCodeAt(i);
		encrypted += String.fromCharCode(apiKeyChar ^ keyChar);
	}
	return btoa(encrypted);
}

function decryptApiKey(encryptedApiKey) {
	if (!encryptedApiKey) return '';

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

function saveApiKey() {
	const apiKeyInput = document.getElementById('openrouter-api-key');
	const apiKey = apiKeyInput?.value?.trim();

	if (apiKey) {
		const encryptedApiKey = encryptApiKey(apiKey);
		localStorage.setItem('openrouter-api-key-encrypted', encryptedApiKey);
		apiKeyInput.value = '';

		const saveBtn = document.getElementById('save-api-key');
		const originalText = saveBtn.textContent;
		saveBtn.textContent = 'Saved!';
		setTimeout(() => {
			saveBtn.textContent = originalText;
		}, 1500);
	}
}

function loadApiKey() {
	const apiKeyInput = document.getElementById('openrouter-api-key');
	const encryptedApiKey = localStorage.getItem('openrouter-api-key-encrypted');

	if (encryptedApiKey && apiKeyInput) {
		const decryptedApiKey = decryptApiKey(encryptedApiKey);
		if (decryptedApiKey) {
			apiKeyInput.value = decryptedApiKey;
		}
	}
}

function getStoredApiKey() {
	const encryptedApiKey = localStorage.getItem('openrouter-api-key-encrypted');
	if (!encryptedApiKey) return '';

	return decryptApiKey(encryptedApiKey);
}

function showApiKeyPopup() {
	const existingPopup = document.getElementById('api-key-popup');
	if (existingPopup) {
		existingPopup.remove();
	}

	const popup = document.createElement('div');
	popup.id = 'api-key-popup';
	popup.className = 'api-key-popup';
	popup.innerHTML = `
		<div class="api-key-popup-content">
			<div class="popup-header">
				<h3>OpenRouter API Key Required</h3>
				<button class="popup-close" id="close-api-key-popup">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 6 6 18"></path>
						<path d="m6 6 12 12"></path>
					</svg>
				</button>
			</div>
			<div class="popup-body">
				<p>To generate mind maps, you need an OpenRouter API key.</p>
				<div style="margin-bottom: 20px; font-size: 0.95em; color: var(--text-color); opacity: 0.8; line-height: 1.5;">
					Get your API key at:<br>
					<a href="https://openrouter.ai/keys" target="_blank" style="color: var(--primary-color); text-decoration: none; font-weight: 500;">openrouter.ai/keys</a>
				</div>
				<div style="margin-bottom: 12px;">
					<label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-color);">API Key</label>
					<input type="password" id="popup-api-key-input" placeholder="sk-or-v1-..." class="popup-input" style="margin-bottom: 16px;">
					<button id="save-and-generate-btn" class="popup-save-btn">Save & Generate Mind Map</button>
				</div>
				<div style="font-size: 0.85em; color: var(--text-color); opacity: 0.6; text-align: center;">
					Your API key is stored locally and encrypted on this device.
				</div>
			</div>
		</div>
	`;

	document.body.appendChild(popup);

	const closeBtn = document.getElementById('close-api-key-popup');
	const saveBtn = document.getElementById('save-and-generate-btn');
	const input = document.getElementById('popup-api-key-input');

	closeBtn.addEventListener('click', () => {
		popup.remove();
		document.getElementById('loading-animation').style.display = 'none';
		showHeader();
	});

	saveBtn.addEventListener('click', () => {
		const apiKey = input.value.trim();
		if (apiKey) {
			const encryptedApiKey = encryptApiKey(apiKey);
			localStorage.setItem('openrouter-api-key-encrypted', encryptedApiKey);
			popup.remove();

			const promptInput = document.getElementById('prompt');
			if (promptInput && promptInput.value.trim()) {
				generateMindmap(promptInput.value.trim(), false);
			}
		} else {
			input.style.borderColor = '#dc3545';
			setTimeout(() => {
				input.style.borderColor = '';
			}, 2000);
		}
	});

	input.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			saveBtn.click();
		}
	});

	setTimeout(() => input.focus(), 100);
}

function showApiKeyManagement() {
	const existingPopup = document.getElementById('api-key-manage-popup');
	if (existingPopup) {
		existingPopup.remove();
	}

	const currentApiKey = getStoredApiKey();

	const popup = document.createElement('div');
	popup.id = 'api-key-manage-popup';
	popup.className = 'api-key-popup';
	popup.innerHTML = `
		<div class="api-key-popup-content">
			<div class="popup-header">
				<h3>API Key Management</h3>
				<button class="popup-close" id="close-api-key-manage-popup">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 6 6 18"></path>
						<path d="m6 6 12 12"></path>
					</svg>
				</button>
			</div>
			<div class="popup-body">
				<div>
					<label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-color);">OpenRouter API Key</label>
					<input type="password" id="manage-api-key-input" placeholder="Enter your OpenRouter API key" class="popup-input" style="width: 100%; margin-bottom: 12px;" value="${currentApiKey || ''}">
					<div style="font-size: 0.85em; color: var(--text-color); opacity: 0.7; margin-bottom: 15px;">
						Get your free API key at: <a href="https://openrouter.ai/keys" target="_blank" style="color: var(--primary-color);">openrouter.ai/keys</a>
					</div>
					<div style="display: flex; gap: 10px; margin-top: 40px;">
						${currentApiKey ? `<button id="remove-api-key-btn" class="remove-btn" style="flex: 1; margin: 0;">Remove API Key</button>` : ''}
						<button id="update-api-key-btn" class="popup-save-btn" style="flex: 1;">Done</button>
					</div>
				</div>
			</div>
		</div>
	`;

	document.body.appendChild(popup);

	const closeBtn = document.getElementById('close-api-key-manage-popup');
	const updateBtn = document.getElementById('update-api-key-btn');
	const removeBtn = document.getElementById('remove-api-key-btn');
	const input = document.getElementById('manage-api-key-input');

	closeBtn.addEventListener('click', () => {
		popup.remove();
	});

	updateBtn.addEventListener('click', () => {
		const apiKey = input.value.trim();
		if (apiKey) {
			const encryptedApiKey = encryptApiKey(apiKey);
			localStorage.setItem('openrouter-api-key-encrypted', encryptedApiKey);

			popup.style.opacity = '0';
			setTimeout(() => {
				popup.remove();
			}, 300);
		} else {
			input.style.borderColor = '#dc3545';
			setTimeout(() => {
				input.style.borderColor = '';
			}, 2000);
		}
	});

	if (removeBtn) {
		removeBtn.addEventListener('click', () => {
			localStorage.removeItem('openrouter-api-key-encrypted');
			popup.remove();
		});
	}

	input.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			updateBtn.click();
		}
	});

	setTimeout(() => input.focus(), 100);
}

let availableModels = [];
let filteredModels = [];
let selectedModel = 'google/gemini-2.5-flash-lite';
let isDropdownOpen = false;

const MODELS_CACHE_KEY = 'openrouter-models-cache';
const MODELS_CACHE_EXPIRY = 'openrouter-models-expiry';
const PREFERRED_MODEL_KEY = 'preferred-model';
const LAST_USED_MODEL_KEY = 'last-used-model';

document.addEventListener('DOMContentLoaded', function() {
	loadApiKey();

	const saveApiKeyBtn = document.getElementById('save-api-key');
	if (saveApiKeyBtn) {
		saveApiKeyBtn.addEventListener('click', saveApiKey);
	}

	initializeModelSelector();
});

function isModelsCacheValid() {
	const expiry = localStorage.getItem(MODELS_CACHE_EXPIRY);
	if (!expiry) return false;

	return Date.now() < parseInt(expiry);
}

function getCachedModels() {
	const cached = localStorage.getItem(MODELS_CACHE_KEY);
	return cached ? JSON.parse(cached) : [];
}

function cacheModels(models) {
	localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(models));
	localStorage.setItem(MODELS_CACHE_EXPIRY, (Date.now() + 60 * 60 * 1000).toString());
}

async function fetchAvailableModels() {
	try {
		const response = await fetch('https://openrouter.ai/api/v1/models', {
			method: 'GET',
			headers: {}
		});

		if (!response.ok) {
			throw new Error('Failed to fetch models');
		}

		const data = await response.json();
		return data.data || [];
	} catch (error) {
		console.error('Error fetching models:', error);
		return [];
	}
}

function getPreferredModel() {
	return localStorage.getItem(PREFERRED_MODEL_KEY) || 'google/gemini-2.5-flash-lite';
}

function setPreferredModel(modelId) {
	localStorage.setItem(PREFERRED_MODEL_KEY, modelId);
	localStorage.setItem(LAST_USED_MODEL_KEY, modelId);
}

function getLastUsedModel() {
	return localStorage.getItem(LAST_USED_MODEL_KEY) || getPreferredModel();
}

async function initializeModelSelector() {
	const dropdownBtn = document.getElementById('model-dropdown-btn');
	const dropdown = document.getElementById('model-dropdown');
	const modelSearch = document.getElementById('model-search');
	const modelOptions = document.getElementById('model-options');

	if (!dropdownBtn || !dropdown || !modelSearch || !modelOptions) return;

	selectedModel = getLastUsedModel();

	dropdownBtn.addEventListener('click', function(e) {
		e.stopPropagation();
		toggleDropdown();
	});

	document.addEventListener('click', function(e) {
		if (!dropdownBtn.contains(e.target) && !dropdown.contains(e.target)) {
			closeDropdown();
		}
	});

	modelSearch.addEventListener('input', function(e) {
		filterAndRenderModels(e.target.value);
	});

	await loadModels();

	updateCurrentModelDisplay();
}

async function loadModels() {
	const modelOptions = document.getElementById('model-options');
	const modelLoading = document.getElementById('model-loading');

	if (!modelOptions) return;

	modelLoading.style.display = 'flex';
	modelOptions.innerHTML = '';

	try {
		let models;

		if (isModelsCacheValid()) {
			models = getCachedModels();
		} else {
			models = await fetchAvailableModels();
			if (models.length > 0) {
				cacheModels(models);
			}
		}

		availableModels = models.filter(model =>
			model.id &&
			model.name &&
			model.architecture?.modality?.includes('text') &&
			!model.id.includes('vision') 
		);

		filterAndRenderModels('');

			// Update the current model display after models are loaded
			updateCurrentModelDisplay();

		} catch (error) {
			console.error('Failed to load models:', error);
			modelOptions.innerHTML = '<div class="model-error">Failed to load models</div>';
			// Update display even on error to show proper state
			updateCurrentModelDisplay();
		} finally {
			modelLoading.style.display = 'none';
		}
}

function filterAndRenderModels(searchTerm) {
 	const modelOptions = document.getElementById('model-options');
 	if (!modelOptions) return;

 	// Define popular models that should appear at the top (in this specific order)
 	const popularModels = [
		'google/gemini-2.5-flash-lite',
		'google/gemini-2.5-flash',
		'google/gemini-2.5-pro',
		'google/gemma-3-12b-it',
		'anthropic/claude-sonnet-4.5',
		'anthropic/claude-opus-4.1',
		'anthropic/claude-3.5-sonnet',
		'anthropic/claude-3.5-haiku',
		'deepseek/deepseek-chat-v3-0324',
		'deepseek/deepseek-r1-0528',
		'deepseek/deepseek-v3.1-terminus',
		'meta-llama/llama-3.3-70b-instruct',
		'meta-llama/llama-4-scout',
		'mistralai/mistral-nemo',
		'moonshotai/kimi-k2-0905',
		'openai/gpt-5',
		'openai/gpt-5-codex',
		'openai/gpt-5-mini',
		'openai/gpt-5-nano',
		'openai/gpt-4.1-mini',
		'openai/gpt-4o-mini-2024-07-18',
		'openai/gpt-4o',
		'openai/gpt-oss-120b',
		'qwen/qwen3-14b',
		'x-ai/grok-4',
		'x-ai/grok-4-fast'
		];

 	if (!searchTerm.trim()) {
 		const popularModelObjects = popularModels
 			.map(id => availableModels.find(model => model.id === id))
 			.filter(model => model !== undefined);

 		const otherModels = availableModels.filter(model => !popularModels.includes(model.id));

 		filteredModels = [...popularModelObjects, ...otherModels];
 	} else {
 		const term = searchTerm.toLowerCase();
 		const searchResults = availableModels.filter(model =>
 			model.name.toLowerCase().includes(term) ||
 			model.id.toLowerCase().includes(term)
 		);

 		const popularInResults = popularModels
 			.map(id => searchResults.find(model => model.id === id))
 			.filter(model => model !== undefined);

 		const otherInResults = searchResults.filter(model => !popularModels.includes(model.id));

 		filteredModels = [...popularInResults, ...otherInResults];
 	}

 	renderModelOptions();
 }

function renderModelOptions() {
 	const modelOptions = document.getElementById('model-options');
 	if (!modelOptions) return;

 	modelOptions.innerHTML = '';

 	filteredModels.forEach(model => {
 		const option = document.createElement('button');
 		option.type = 'button';
 		option.className = `model-option ${model.id === selectedModel ? 'selected' : ''}`;

 		const modelNameContainer = document.createElement('span');
 		modelNameContainer.textContent = model.name;
 		modelNameContainer.className = 'model-name';

 		const isDefaultModel = model.id === 'google/gemini-2.5-flash-lite';
 		if (isDefaultModel) {
 			const defaultBadge = document.createElement('span');
 			defaultBadge.textContent = 'Default';
 			defaultBadge.className = 'default-badge';
 			option.appendChild(modelNameContainer);
 			option.appendChild(defaultBadge);
 		} else {
 			option.appendChild(modelNameContainer);
 		}

 		option.title = model.id;

 		option.addEventListener('click', function() {
 			selectModel(model.id, model.name);
 		});

 		modelOptions.appendChild(option);
 	});
 }

function toggleDropdown() {
	const dropdown = document.getElementById('model-dropdown');
	const dropdownBtn = document.getElementById('model-dropdown-btn');

	if (!dropdown || !dropdownBtn) return;

	isDropdownOpen = !isDropdownOpen;
	dropdown.classList.toggle('open', isDropdownOpen);
	dropdownBtn.classList.toggle('open', isDropdownOpen);

	if (isDropdownOpen) {
		const modelSearch = document.getElementById('model-search');
		if (modelSearch) {
			setTimeout(() => modelSearch.focus(), 100);
		}
	}
}

function closeDropdown() {
	const dropdown = document.getElementById('model-dropdown');
	const dropdownBtn = document.getElementById('model-dropdown-btn');

	if (!dropdown || !dropdownBtn) return;

	isDropdownOpen = false;
	dropdown.classList.remove('open');
	dropdownBtn.classList.remove('open');
}

function selectModel(modelId, modelName) {
	selectedModel = modelId;
	setPreferredModel(modelId);
	updateCurrentModelDisplay();
	closeDropdown();

	const modelSearch = document.getElementById('model-search');
	if (modelSearch) {
		modelSearch.value = '';
		filterAndRenderModels('');
	}
}

function updateCurrentModelDisplay() {
 	const currentModelName = document.getElementById('current-model-name');
 	if (!currentModelName) return;

 	// If models aren't loaded yet, show loading state
 	if (availableModels.length === 0) {
 		currentModelName.textContent = 'Loading models...';
 		return;
 	}

 	const model = availableModels.find(m => m.id === selectedModel);
 	currentModelName.textContent = model ? model.name : selectedModel; // Fallback to ID if name not found
 }

function getSelectedModel() {
	return selectedModel;
}

function getReasoningEnabled() {
	const toggle = document.getElementById('reasoning-toggle');
	return toggle ? toggle.checked : false;
}

function saveReasoningPreference() {
	const enabled = getReasoningEnabled();
	localStorage.setItem('reasoning-disabled', enabled.toString());
}

function loadReasoningPreference() {
	const toggle = document.getElementById('reasoning-toggle');
	if (toggle) {
		const saved = localStorage.getItem('reasoning-disabled');
		toggle.checked = saved === 'true';
		toggle.addEventListener('change', saveReasoningPreference);
	}
}

function updateUrlWithId(id) {
	const currentUrl = new URL(window.location.href);
	const urlParams = new URLSearchParams(currentUrl.search);

	urlParams.set('id', id);

	if (urlParams.has('yt-link')) urlParams.delete('yt-link');
	if (urlParams.has('q')) urlParams.delete('q');

	const newUrl = `${currentUrl.pathname}?${urlParams.toString()}`;
	window.history.pushState({
		id: id
	}, '', newUrl);
}

function showErrorMessage(message) {
	console.error(message);
	const app = document.getElementById('app');
	app.style.display = 'none';	
	
	const mindmapContainer = document.getElementById('mindmap');
	if (mindmapContainer) {
		mindmapContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; text-align: center; padding: 20px;" id="inAppErrorMessage">
                <h2 style="margin-bottom: 10px;">Something went wrong.</h2>
                <p>${message}</p>
                <button onclick="showHeader()" style="margin-top: 20px; padding: 8px 25px; background: var(--text-color); color: white; border: none; border-radius: 40px; cursor: pointer; font-size: 0.9rem; font-family: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "Avenir", "Montserrat", "Corbel", "URW Gothic", "Source Sans Pro", sans-serif;">Close</button>
            </div>
        `;
		mindmapContainer.style.display = 'block';
		hideInitialElements();
	}
}


function loadMindmapsLeftSidebar() {
	const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
	const playground = JSON.parse(localStorage.getItem('mindmap-playground') || 'null');
	const list = document.getElementById('leftSidebarMindmapList');

	if (!list) {
		console.error('Left sidebar mindmap list element not found');
		return;
	}

	let allMindmaps = [...history];
	if (playground && !history.some(item => item.id === playground.id)) {
		allMindmaps.push(playground);
	}
    
    const sampleMarkdown = "# Mind Map\n\n## Branch\n## Branch";

    const filteredMindmaps = allMindmaps.filter(item => item.markdown !== sampleMarkdown);


	if (filteredMindmaps.length === 0) {
		list.innerHTML = `
        <div class="no-mindmaps">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                <path d="M2 10h20"/>
            </svg>
            <h3>No mind maps yet</h3>
            <p>Create your first mind map!</p>
        </div>
        `;
		return;
	}

	const sortedMindmaps = filteredMindmaps.sort((a, b) => {
		const dateA = new Date(a.timestamp);
		const dateB = new Date(b.timestamp);
		return dateB - dateA;
	});

	list.innerHTML = sortedMindmaps
		.map(
			(item) => `
        <div class="mindmap-item" data-id="${item.id}">
            <div class="mindmap-info">
                <div class="mindmap-title">${escapeHtmlLeftSidebar(item.topic)}</div>
                <div class="mindmap-date">${formatDateLeftSidebar(item.timestamp)}</div>
            </div>
            <div class="mindmap-actions">
                <div class="fade-overlay"></div>
                <button class="rename-btn" onclick="renameMindmap('${item.id}')" title="Rename">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                </button>
                <button class="delete-btn" onclick="deleteMindmap('${item.id}')" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            </div>
        </div>
        `,
		)
		.join('');

	document.querySelectorAll('.mindmap-item').forEach((item) => {
		item.addEventListener('click', function (e) {
			if (!e.target.closest('button')) {
				const id = this.getAttribute('data-id');
				openMindmapLeftSidebar(id);
			}
		});
	});
}


function openMindmapLeftSidebar(id) {
	document.querySelectorAll('.mindmap-item').forEach((item) => {
		item.classList.remove('active');
	});

	const selectedItem = document.querySelector(`.mindmap-item[data-id="${id}"]`);
	if (selectedItem) {
		selectedItem.classList.add('active');
	}

	loadMindMapById(id);
	hideHeader()
}

function getMindmapFromStorage(id) {
	let history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
	let mindmap = history.find((item) => String(item.id) === String(id));
	let source = 'history';

	if (!mindmap) {
		const playground = JSON.parse(localStorage.getItem('mindmap-playground') || 'null');
		if (playground && String(playground.id) === String(id)) {
			mindmap = playground;
			source = 'playground';
		}
	}
	return { mindmap, source };
}

function renameMindmap(id) {
    const { mindmap, source } = getMindmapFromStorage(id);

    if (!mindmap) {
        console.error('Mind map not found for rename');
        return;
    }

    const newNameCallback = (id, newName) => {
        updateMindmapInStorage(id, { topic: newName });
        loadMindmapsLeftSidebar();
        if (String(currentMindmap.id) === String(id)) {
            currentMindmapTitle = newName;
            document.title = `${currentMindmapTitle} - Mind Map Wizard`;
        }
    };

    if (window.customPopups) {
        window.customPopups.openRenamePopup(id, mindmap.topic, newNameCallback);
    } else {
        const newName = window.prompt('Enter a new name for this mind map:', mindmap.topic);
        if (newName !== null && newName.trim() !== '') {
            newNameCallback(id, newName.trim());
        }
    }
}


function deleteMindmap(id) {
    const deleteCallback = (idToDelete) => {
        let history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
        const updatedHistory = history.filter((item) => String(item.id) !== String(idToDelete));

        if (updatedHistory.length < history.length) {
            localStorage.setItem('mindmap-history', JSON.stringify(updatedHistory));
        } else {
            const playground = JSON.parse(localStorage.getItem('mindmap-playground') || 'null');
            if (playground && String(playground.id) === String(idToDelete)) {
                localStorage.removeItem('mindmap-playground');
            }
        }

        loadMindmapsLeftSidebar();

        if (String(currentMindmap.id) === String(idToDelete)) {
            currentMarkdown = '';
            currentMindmapTitle = '';
            const mindmapContainer = document.getElementById('mindmap');
            if (mindmapContainer) {
                mindmapContainer.innerHTML = '';
                mindmapContainer.style.display = 'none';
            }
            const buttonContainer = document.getElementById('button-container');
            if (buttonContainer) {
                buttonContainer.style.display = 'none';
            }
            window.location.href = window.location.pathname;
        }
    };

    if (window.customPopups) {
        window.customPopups.openDeletePopup(id, deleteCallback);
    } else {
        if (confirm('Are you sure you want to delete this mind map? This action cannot be undone.')) {
            deleteCallback(id);
        }
    }
}

function updateMindmapInStorage(id, updates) {
    let history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
    let mindmapInHistory = history.find(item => String(item.id) === String(id));

    if (mindmapInHistory) {
        Object.assign(mindmapInHistory, updates);
        localStorage.setItem('mindmap-history', JSON.stringify(history));
    } else {
        let playground = JSON.parse(localStorage.getItem('mindmap-playground') || 'null');
        if (playground && String(playground.id) === String(id)) {
            Object.assign(playground, updates);
            localStorage.setItem('mindmap-playground', JSON.stringify(playground));
        }
    }
}

function setupPopupEventListeners() {
	const renamePopupClose = document.getElementById('renamePopupClose');
	const deletePopupClose = document.getElementById('deletePopupClose');
	const renameCancelBtn = document.getElementById('renameCancelBtn');
	const deleteCancelBtn = document.getElementById('deleteCancelBtn');
	const popupOverlay = document.getElementById('popupOverlay');

	if (renamePopupClose) renamePopupClose.addEventListener('click', closeRenamePopup);
	if (deletePopupClose) deletePopupClose.addEventListener('click', closeDeletePopup);
	if (renameCancelBtn) renameCancelBtn.addEventListener('click', closeRenamePopup);
	if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeletePopup);

	if (popupOverlay) {
		popupOverlay.addEventListener('click', function (e) {
			if (e.target === this) {
				closeAllPopups();
			}
		});
	}


	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') {
			closeAllPopups();
		}
	});
}

function openRenamePopup(id, currentName, callback) {
	const overlay = document.getElementById('popupOverlay');
	const popup = document.getElementById('renamePopup');
	const input = document.getElementById('renameInput');
	const confirmBtn = document.getElementById('renameConfirmBtn');

	if (!overlay || !popup || !input || !confirmBtn) {
		console.error('Rename popup elements not found');
		return;
	}


	input.value = currentName;

	overlay.classList.add('active');
	popup.style.display = 'block';
	const deletePopup = document.getElementById('deletePopup');
	if (deletePopup) {
		deletePopup.style.display = 'none';
	}


	setTimeout(() => {
		input.focus();
		input.select();
	}, 100);

	confirmBtn.onclick = null;
	input.onkeydown = null;

	const handleRename = () => {
		const newName = input.value.trim();
		if (newName !== '') {
			closeRenamePopup();
			if (callback && typeof callback === 'function') {
				callback(id, newName);
			}
		} else {
			input.classList.add('error');
			setTimeout(() => {
				input.classList.remove('error');
			}, 500);
		}
	};


	input.onkeydown = function (e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleRename();
		}
	};

	confirmBtn.onclick = handleRename;
}

function openDeletePopup(id, callback) {
	const overlay = document.getElementById('popupOverlay');
	const popup = document.getElementById('deletePopup');
	const confirmBtn = document.getElementById('deleteConfirmBtn');

	if (!overlay || !popup || !confirmBtn) {
		console.error('Delete popup elements not found');
		return;
	}


	overlay.classList.add('active');
	popup.style.display = 'block';

	const renamePopup = document.getElementById('renamePopup');
	if (renamePopup) {
		renamePopup.style.display = 'none';
	}


	confirmBtn.onclick = null;

	confirmBtn.onclick = function () {
		closeDeletePopup();
		if (callback && typeof callback === 'function') {
			callback(id);
		}
	};
}

function closeRenamePopup() {
	const overlay = document.getElementById('popupOverlay');
	const popup = document.getElementById('renamePopup');
	if (overlay) overlay.classList.remove('active');
	if (popup) popup.style.display = 'none';
}

function closeDeletePopup() {
	const overlay = document.getElementById('popupOverlay');
	const popup = document.getElementById('deletePopup');
	if (overlay) overlay.classList.remove('active');
	if (popup) popup.style.display = 'none';
}

function closeAllPopups() {
	closeRenamePopup();
	closeDeletePopup();
}

window.customPopups = {
	openRenamePopup,
	openDeletePopup,
};

function addMindmapActionStyles() {
	const styleId = 'mindmap-action-styles';
	if (document.getElementById(styleId)) {
		return;
	}
}

window.addEventListener('storage', function (e) {
	if (e.key === 'mindmap-history') {
		loadMindmapsLeftSidebar();
	}
});

function escapeHtml(unsafe) {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

window.downloadMindmap = downloadMindmap;
window.clearHistory = clearHistory;


const texts = [
	'Generate a Mind Map with AI',
	'Generate a Mind Map with AI',
	'Generate a Mind Map with AI',
	'Generate a Mind Map with AI',
	'What do you want to discover?',
	'What do you want to discover?',
	'What do you want to discover?',
	'Research Made Easy',
	'Get an Overview with AI',
	'Get the Full Picture',
];

function getRandomText() {
	const randomIndex = Math.floor(Math.random() * texts.length);
	return texts[randomIndex];
}

function openSearchMindmapsPopup() {
	const overlay = document.getElementById('searchMindmapsPopupOverlay');
	const searchInput = document.getElementById('popupMindmapSearchInput');
	const resultsList = document.getElementById('searchResultsList');

	if (!overlay || !searchInput || !resultsList) {
		console.error('Search popup elements not found in openSearchMindmapsPopup!');
		return;
	}

	allMindmapHistory = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
	allMindmapHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

	searchInput.value = '';
	filterAndDisplayMindmapsInPopup('');

	overlay.style.display = 'flex';

	setTimeout(() => {
		overlay.classList.add('active');
		setTimeout(() => searchInput.focus(), 300);
	}, 10);
}


function closeSearchMindmapsPopup() {
	const overlay = document.getElementById('searchMindmapsPopupOverlay');
	overlay.style.display = 'none';
	if (overlay) {
		overlay.classList.remove('active');
	}
}


function renderSearchMindmapResults(mindmapsToDisplay) {
	const resultsList = document.getElementById('searchResultsList');
	const searchInput = document.getElementById('popupMindmapSearchInput');

	if (!resultsList) {
		console.error('Search results list element not found!');
		return;
	}

	if (mindmapsToDisplay.length === 0) {
		resultsList.innerHTML = `
            <div class="no-results-message">
                <h3>${searchInput?.value.trim()
				? 'Nothing found'
				: 'Start typing to search'
			}</h3>
                <p>${searchInput?.value.trim()
				? 'Try a different search term.'
				: 'Your mind maps will appear here.'
			}</p>
            </div>
        `;
		return;
	}

	resultsList.innerHTML = mindmapsToDisplay
		.map(
			(item) => `
        <div class="mindmap-item" data-id="${item.id}">
            <div class="mindmap-info">
                <div class="mindmap-title">${escapeHtmlLeftSidebar(item.topic)}</div>
                <div class="mindmap-date">${formatDateLeftSidebar(item.timestamp)}</div>
            </div>
        </div>
        `,
		)
		.join('');

	resultsList.querySelectorAll('.mindmap-item').forEach((item) => {
		item.addEventListener('click', function (e) {
			if (!e.target.closest('button')) {
				const id = this.getAttribute('data-id');
				openMindmapFromSearchPopup(id);
			}
		});
	});
}

function filterAndDisplayMindmapsInPopup(searchTerm) {
	const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();

	const filteredMindmaps = lowerCaseSearchTerm ?
		allMindmapHistory.filter((item) =>
			item.topic.toLowerCase().includes(lowerCaseSearchTerm),
		) :
		allMindmapHistory;

	renderSearchMindmapResults(filteredMindmaps);
}


function openMindmapFromSearchPopup(id) {
	closeSearchMindmapsPopup();
	openMindmapLeftSidebar(id);
}

function saveMindmapToHistory(topic, markdown) {
	const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
	const timestamp = new Date().toISOString();
	const newId = Date.now();

	history.push({
		topic,
		markdown,
		timestamp,
		id: newId
	});

	if (history.length > 100) {
		history.shift();
	}

	localStorage.setItem('mindmap-history', JSON.stringify(history));

	if (document.getElementById('searchMindmapsPopupOverlay')?.classList.contains('active')) {
		allMindmapHistory = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
		allMindmapHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
		filterAndDisplayMindmapsInPopup(document.getElementById('popupMindmapSearchInput')?.value || '');
	}
	if (typeof loadMindmapsLeftSidebar === 'function') {
		loadMindmapsLeftSidebar();
	}
}

window.openSearchMindmapsPopup = openSearchMindmapsPopup;
window.closeSearchMindmapsPopup = closeSearchMindmapsPopup;
window.openMindmapFromSearchPopup = openMindmapFromSearchPopup;


function initializeDownloadFeatures() {
	const downloadBtn = document.getElementById('download-mindmap-btn');
	const popup = document.getElementById('download-options-popup');
	const closeBtn = document.getElementById('close-download-options-popup');
	const formatSelect = document.getElementById('download-format');
	const downloadFormatBtn = document.getElementById('download-btn');

	if (!downloadBtn || !popup) return;

	downloadBtn.addEventListener('click', function () {
		popup.classList.add('show');
	});

	closeBtn?.addEventListener('click', function () {
		popup.classList.remove('show');
	});

	popup.addEventListener('click', function (event) {
		if (event.target === popup) {
			popup.classList.remove('show');
		}
	});

	downloadFormatBtn?.addEventListener('click', function () {
		const format = formatSelect?.value || 'jpg';
		downloadMindmap(format);
		popup.classList.remove('show');
	});

	document.getElementById('mm-fit')?.addEventListener('click', function (e) {
		e.preventDefault();
		e.stopPropagation();
		if (window.markmapInstance) {
			window.markmapInstance.fit();
		}
	});
}

function trackEvent(eventName, params = {}) {
	if (window.dataLayer) {
		window.dataLayer.push({
			'event': eventName,
			...params
		});
	} else {
		console.warn(`Google Analytics dataLayer not found. Event "${eventName}" not sent.`);
	}

}

const DownloadHandler = {
	getMindmapElements() {
		const container = document.getElementById('mindmap');
		const svg = container?.querySelector('svg');
		const topic = currentMindmapTitle || 'mindmap';

		if (!svg || container.children.length === 0) {
			throw new Error('No mind map available to download.');
		}

		return {
			svg,
			topic
		};
	},

	getSVGData(svg, padding = 30) {
		const bbox = svg.getBBox();
		const width = bbox.width + padding * 2;
		const height = bbox.height + padding * 2;

		const svgCopy = svg.cloneNode(true);
		svgCopy.setAttribute('width', width);
		svgCopy.setAttribute('height', height);
		svgCopy.setAttribute(
			'viewBox',
			`${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`,
		);

		const svgContent = new XMLSerializer().serializeToString(svgCopy);

		return {
			svgContent,
			width,
			height
		};
	},



	triggerDownload(blob, filename) {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		const fileExtension = filename.split('.').pop();
		trackEvent('mm_downloaded', {
			download_format: fileExtension,
			watermark_inserted: 'false'
		});
	},

	downloadMarkdown(topic) {
		const blob = new Blob([currentMarkdown], {
			type: 'text/markdown'
		});
		this.triggerDownload(blob, `${topic}.md`);
	},

	async downloadSVG(svgContent, width, height, topic) {
		const blob = new Blob([svgContent], {
			type: 'image/svg+xml;charset=utf-8'
		});
		this.triggerDownload(blob, `${topic}.svg`);
	},

	async downloadPDF(svgContent, width, height, topic) {
		const tempSvg = document.createElement('div');
		tempSvg.innerHTML = svgContent;
		const svgElement = tempSvg.firstElementChild;
		const svgData = new XMLSerializer().serializeToString(svgElement);

		const scale = 1.8;
		const canvas = document.createElement('canvas');
		canvas.width = width * scale;
		canvas.height = height * scale;
		const ctx = canvas.getContext('2d');

		const img = new Image();
		img.crossOrigin = 'Anonymous';

		img.onload = () => {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.scale(scale, scale);
			ctx.drawImage(img, 0, 0);

			const pdf = new jsPDF({
				orientation: width > height ? 'landscape' : 'portrait',
				unit: 'pt',
				format: 'letter',
			});

			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

			const pdfAspectRatio = pdfWidth / pdfHeight;
			const imageAspectRatio = width / height;
			let finalWidth = pdfWidth;
			let finalHeight = pdfHeight;

			if (imageAspectRatio > pdfAspectRatio) {
				finalHeight = pdfWidth / imageAspectRatio;
			} else {
				finalWidth = pdfHeight * imageAspectRatio;
			}

			const xOffset = (pdfWidth - finalWidth) / 2;
			const yOffset = (pdfHeight - finalHeight) / 2;

			pdf.addImage(
				canvas.toDataURL('image/jpeg', 1.0),
				'JPEG',
				xOffset,
				yOffset,
				finalWidth,
				finalHeight,
			);

			pdf.save(`${topic}.pdf`);
			canvas.remove();

			trackEvent('mm_downloaded', {
				download_format: 'pdf',
				watermark_inserted: 'false'
			});
		};

		img.src =
			'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
	},

	async downloadJPG(svg, topic) {
		const {
			svgContent,
			width,
			height
		} = this.getSVGData(svg);

		const tempSvg = document.createElement('div');
		tempSvg.innerHTML = svgContent;
		const svgElement = tempSvg.firstElementChild;
		const svgData = new XMLSerializer().serializeToString(svgElement);

		const scale = 2.0;
		const canvas = document.createElement('canvas');
		canvas.width = width * scale;
		canvas.height = height * scale;
		const ctx = canvas.getContext('2d');

		const img = new Image();
		img.crossOrigin = 'Anonymous';

		img.onload = () => {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.scale(scale, scale);
			ctx.drawImage(img, 0, 0);
			this.triggerDownload(
				this.dataURLToBlob(canvas.toDataURL('image/jpeg', 1.0)),
				`${topic}.jpg`,
			);
			canvas.remove();
		};

		img.src =
			'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
	},

	dataURLToBlob(dataURL) {
		const arr = dataURL.split(',');
		const mime = arr[0].match(/:(.*?);/)[1];
		const bstr = atob(arr[1]);
		let n = bstr.length;
		const u8arr = new Uint8Array(n);
		while (n--) {
			u8arr[n] = bstr.charCodeAt(n);
		}
		return new Blob([u8arr], {
			type: mime
		});
	},
};

window.jsPDF = window.jspdf.jsPDF;

async function downloadMindmap(format) {
	try {
		const {
			svg,
			topic
		} = DownloadHandler.getMindmapElements();


		if (format === 'markdown') {
			DownloadHandler.downloadMarkdown(topic);
			return;
		}

		const {
			svgContent,
			width,
			height
		} = DownloadHandler.getSVGData(svg);

		switch (format) {
			case 'svg':
				await DownloadHandler.downloadSVG(svgContent, width, height, topic);
				break;
			case 'pdf':
				await DownloadHandler.downloadPDF(svgContent, width, height, topic);
				break;
			case 'jpg':
				await DownloadHandler.downloadJPG(svg, topic);
				break;
			default:
				throw new Error(`Unsupported format: ${format}`);
		}

		document.getElementById('download-options-popup').style.display = 'none';
	} catch (error) {
		trackErrorEvent(`Download failed for format: ${format}. Reason: ${error.message}`);
		console.error('Download error:', error);
		alert(error.message); 
	}
}

async function downloadAsImage() {
	const format = 'png';
	try {

		const mindmapContainer = document.getElementById('mindmap');
		const svg = mindmapContainer.querySelector('svg');

		if (!svg) {
			throw new Error('No mind map available to export.');
		}

		const svgCopy = svg.cloneNode(true);
		const bbox = svg.getBBox();
		const padding = 20;
		const width = bbox.width + padding * 2;
		const height = bbox.height + padding * 2;

		svgCopy.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
		svgCopy.setAttribute('width', width);
		svgCopy.setAttribute('height', height);

		const serializer = new XMLSerializer();
		const svgStr = serializer.serializeToString(svgCopy);

		const svgBase64 = btoa(unescape(encodeURIComponent(svgStr)));
		const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

		const img = new Image();
		img.crossOrigin = 'Anonymous';
		img.onload = function () {
			const scale = 1.8;
			const canvas = document.createElement('canvas');
			canvas.width = this.width * scale;
			canvas.height = this.height * scale;

			const ctx = canvas.getContext('2d');
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.scale(scale, scale);
			ctx.drawImage(img, 0, 0);

			const url = canvas.toDataURL('image/png', 1.0);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'mindmap.png';
			a.click();

			trackEvent('mm_downloaded', {
				download_format: format,
				watermark_inserted: 'false'
			});
		};
		img.src = dataUrl;
		document.getElementById('download-options-popup').style.display = 'none';

	} catch (error) {
		trackErrorEvent(`Download as image (PNG) failed. Reason: ${error.message}`);
		console.error('Download as image error:', error);
		alert(error.message);
	}
}


window.addEventListener('load', () => {
	try {
		const historyKey = 'mindmap-history';
		const sampleMarkdown = "# Mind Map\n\n## Branch\n## Branch";
		const existingHistoryJSON = localStorage.getItem(historyKey);

		if (existingHistoryJSON) {
			let history = JSON.parse(existingHistoryJSON);
			const initialCount = history.length;
			const cleanedHistory = history.filter(item => item.markdown !== sampleMarkdown);
			const removedCount = initialCount - cleanedHistory.length;

			if (removedCount > 0) {
				localStorage.setItem(historyKey, JSON.stringify(cleanedHistory));
			} else {
			}
		}
	} catch (error) {
		trackErrorEvent(`History cleanup failed. Reason: ${error.message}`);
		console.error('Error cleaning up sample mind maps from history:', error);
	}
});
