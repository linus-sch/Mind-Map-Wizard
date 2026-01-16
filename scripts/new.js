const API_KEY_ENCRYPTION_KEY = 'mmw_encryption_key_2024';

let currentMindmapTopic = '';
let generationInProgress = false;

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
						Get your API key at: <a href="https://openrouter.ai/keys" target="_blank" style="color: var(--primary-color);">openrouter.ai/keys</a>
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
let modelSelectorDocumentListenerBound = false;

const MODELS_CACHE_KEY = 'openrouter-models-cache';
const MODELS_CACHE_EXPIRY = 'openrouter-models-expiry';
const PREFERRED_MODEL_KEY = 'preferred-model';
const LAST_USED_MODEL_KEY = 'last-used-model';

document.addEventListener('DOMContentLoaded', function () {
	loadApiKey();

	const saveApiKeyBtn = document.getElementById('save-api-key');
	if (saveApiKeyBtn) {
		saveApiKeyBtn.addEventListener('click', saveApiKey);
	}

	const manageApiKeyBtn = document.getElementById('manage-api-key');
	if (manageApiKeyBtn) {
		manageApiKeyBtn.addEventListener('click', showApiKeyManagement);
	}

	initializeModelSelector();
	initializeAiDisableToggle();
});

function initializeAiDisableToggle() {
	if (window.__mmwAiDisableToggleInit) return;
	window.__mmwAiDisableToggleInit = true;

	const stored = localStorage.getItem('mmw-disable-ai-features');
	const isDisabled = stored === 'true';
	window.MMW_DISABLE_AI_FEATURES = isDisabled;

	const disableButton = document.getElementById('disable-ai-button');
	const disableToggle = document.getElementById('disable-ai-toggle');
	if (disableButton) {
		disableButton.addEventListener('click', (event) => {
			if (event.target && event.target.closest('#disable-ai-toggle')) {
				return;
			}
			event.preventDefault();
			if (!disableToggle) return;
			disableToggle.checked = !disableToggle.checked;
			const nextEnabled = disableToggle.checked;
			window.MMW_DISABLE_AI_FEATURES = !nextEnabled;
			localStorage.setItem('mmw-disable-ai-features', String(!nextEnabled));
			updateAiFeaturesUI();
		});
	}
	if (disableToggle) {
		disableToggle.addEventListener('change', () => {
			const nextEnabled = disableToggle.checked;
			window.MMW_DISABLE_AI_FEATURES = !nextEnabled;
			localStorage.setItem('mmw-disable-ai-features', String(!nextEnabled));
			updateAiFeaturesUI();
		});
	}

	updateAiFeaturesUI();
}

function updateAiFeaturesUI() {
	const isDisabled = Boolean(window.MMW_DISABLE_AI_FEATURES);
	const disableButton = document.getElementById('disable-ai-button');
	const disableToggle = document.getElementById('disable-ai-toggle');
	if (disableButton) {
		disableButton.classList.remove('active');
	}
	if (disableToggle) {
		disableToggle.checked = !isDisabled;
	}

	const aiDisclaimer = document.getElementById('ai-content-disclaimer');
	if (aiDisclaimer) {
		aiDisclaimer.style.display = isDisabled ? 'none' : 'block';
	}

	const regenerateBtn = document.getElementById('regenerate-button');
	if (regenerateBtn) {
		regenerateBtn.style.display = isDisabled ? 'none' : '';
	}

	const modelDropdown = document.querySelector('.model-selector-container');
	if (modelDropdown) {
		modelDropdown.style.display = isDisabled ? 'none' : '';
	}

	const prompt = document.getElementById('prompt');
	if (prompt) {
		prompt.placeholder = isDisabled ? 'Enter your topic (manual mind map)' : 'Enter your text or URL...';
	}
}

window.toggleAiFeatures = function () {
	const next = !window.MMW_DISABLE_AI_FEATURES;
	window.MMW_DISABLE_AI_FEATURES = next;
	localStorage.setItem('mmw-disable-ai-features', String(next));
	updateAiFeaturesUI();
};

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

	if (!dropdownBtn.dataset.modelDropdownBound) {
		dropdownBtn.addEventListener('click', function (e) {
			e.stopPropagation();
			toggleDropdown();
		});
		dropdownBtn.dataset.modelDropdownBound = 'true';
	}

	if (!modelSelectorDocumentListenerBound) {
		document.addEventListener('click', function (e) {
			if (!dropdownBtn.contains(e.target) && !dropdown.contains(e.target)) {
				closeDropdown();
			}
		});
		modelSelectorDocumentListenerBound = true;
	}

	if (!modelSearch.dataset.modelDropdownBound) {
		modelSearch.addEventListener('input', function (e) {
			filterAndRenderModels(e.target.value);
		});
		modelSearch.dataset.modelDropdownBound = 'true';
	}

	await loadModels();

	updateCurrentModelDisplay();
}

async function loadModels() {
	const modelOptions = document.getElementById('model-options');

	if (!modelOptions) return;

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

		updateCurrentModelDisplay();
	} catch (error) {
		console.error('Failed to load models:', error);
		modelOptions.innerHTML = '<div class="model-error">Failed to load models</div>';
		updateCurrentModelDisplay();
	} finally {
	}
}

function filterAndRenderModels(searchTerm) {
	const modelOptions = document.getElementById('model-options');
	if (!modelOptions) return;

	const popularModels = [
		'google/gemini-2.5-flash-lite',
		'google/gemini-3-flash-preview',
		'google/gemini-3-pro-preview',
		'openai/gpt-5.2-codex',
		'openai/gpt-5',
		'moonshotai/kimi-k2-thinking',
		'anthropic/claude-sonnet-4.5',
		'anthropic/claude-opus-4.5',
		'anthropic/claude-3.5-sonnet',
		'anthropic/claude-haiku-4.5',
		'z-ai/glm-4.7',
		'openai/gpt-oss-120b',
		'deepseek/deepseek-v3.2',
		'deepseek/deepseek-r1-0528',
		'deepseek/deepseek-v3.1-terminus',
		'meta-llama/llama-3.3-70b-instruct',
		'meta-llama/llama-4-scout',
		'mistralai/mistral-nemo',
		'moonshotai/kimi-k2-0905',
		'openai/gpt-5-codex',
		'openai/gpt-5-mini',
		'openai/gpt-5-nano',
		'openai/gpt-4.1-mini',
		'openai/gpt-4o-mini',
		'openai/gpt-4o',
		'google/gemma-3-12b-it',
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

		option.addEventListener('click', function () {
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

function selectModel(modelId) {
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

	if (availableModels.length === 0) {
		currentModelName.textContent = 'Loading models...';
		return;
	}

	const model = availableModels.find(m => m.id === selectedModel);
	currentModelName.textContent = model ? model.name : selectedModel;
}

function getSelectedModel() {
	return selectedModel;
}

function extractContextUrlsFromBackend(data) {
	try {
		const urls = [];

		const pushMaybeUrl = (v) => {
			if (!v) return;
			if (typeof v === 'string') {
				urls.push(v);
				return;
			}
			if (typeof v === 'object') {
				const u = v.url || v.href || v.link;
				if (typeof u === 'string') urls.push(u);
			}
		};

		if (Array.isArray(data?.contexturls)) data.contexturls.forEach(pushMaybeUrl);
		if (Array.isArray(data?.contextUrls)) data.contextUrls.forEach(pushMaybeUrl);

		if (Array.isArray(data?.context?.urls)) data.context.urls.forEach(pushMaybeUrl);
		if (Array.isArray(data?.context?.links)) data.context.links.forEach(pushMaybeUrl);

		if (Array.isArray(data?.tags)) {
			for (const tag of data.tags) {
				if (typeof tag !== 'string') continue;
				const str = tag.trim();
				if (!str) continue;

				const re = /<url>\s*([\s\S]*?)\s*<\/url>/gi;
				let m;
				while ((m = re.exec(str)) !== null) {
					const u = String(m[1] || '').trim();
					if (u) urls.push(u);
				}

				if (!str.includes('<url>') && /^https?:\/\//i.test(str)) {
					urls.push(str);
				}
			}
		}

		// Extract from OpenRouter annotations
		if (Array.isArray(data?.choices?.[0]?.message?.annotations)) {
			for (const annotation of data.choices[0].message.annotations) {
				if (annotation.type === 'url_citation' && annotation.url_citation?.url) {
					urls.push(annotation.url_citation.url);
				}
			}
		}

		return normalizeContextUrls(urls);
	} catch {
		return [];
	}
}

function normalizeContextUrls(input) {
	const arr = Array.isArray(input) ? input : (input ? [input] : []);
	const out = [];
	for (const item of arr) {
		if (typeof item !== 'string') continue;
		let u = item.trim();
		if (!u) continue;

		u = u.replace(/^<url>\s*/i, '').replace(/\s*<\/url>$/i, '').trim();
		u = u.replace(/^['"\(\[]+/, '').replace(/['"\)\]]+$/, '').trim();
		u = u.replace(/[\s\]\)\}\>"'.,;:!?]+$/g, '').trim();
		if (!/^https?:\/\//i.test(u)) continue;

		try {
			const parsed = new URL(u);
			if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
				out.push(u);
			}
		} catch {
		}
	}
	return Array.from(new Set(out));
}

async function generateMindmap(mindmapTopic, isRegenerate = false) {
	if (generationInProgress) {
		return;
	}

	if (window.MMW_DISABLE_AI_FEATURES) {
		createManualMindMap();
		return;
	}

	if (!mindmapTopic) {
		console.error('Mindmap generation stopped: missing topic.');
		return;
	}

	generationInProgress = true;

	if (!isRegenerate) {
		document.getElementById('header').style.display = 'none';
		document.getElementById('ai-content-disclaimer').style.display = 'block';
		document.getElementById('mindmap').style.display = 'none';
	}
	const loadingAnim = document.getElementById('loading-animation');
	if (loadingAnim) loadingAnim.style.display = 'flex';

	if (isRegenerate) {
		const regenerateBtn = document.getElementById('regenerate-button');
		regenerateBtn?.classList.add('rotating');
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

		const useWebSearch = typeof window.MMW_USE_WEB_SEARCH === 'boolean' ? window.MMW_USE_WEB_SEARCH : true;
		const searchInstruction = useWebSearch
			? '- Use web search for current, factual information about the topic (up to 3 sources)'
			: '- Use only your internal knowledge (no web search)';

		const requestPayload = {
			model: getSelectedModel(),
			messages: [
				{
					role: 'user',
					content: `Create a comprehensive, fact-rich mind map about ${mindmapTopic.trim()} using the following structure:

# Matching Mind Map Title
## Branch 1
### Sub Branch A
### Sub Branch B
## Branch 2

- Each text element must be aligned to a specific hierarchical level using a new line plus the appropriate number of # symbols
- Aim for 2-3 levels of depth to keep the mind map scannable and not overwhelming but keep lenght relative to input depth.
- For large enumerations (6+ items), combine related items into comma-separated lists within a single branch rather than creating excessive sub-branches

- Include **specific, concrete details and facts**, not just category labels
  - Bad: "## Education" 
  - Good: "## Education: PhD in Physics from MIT (2015)"
- Avoid generic structural sections like "Overview," "Introduction," or "Conclusion" this is a mind map, not an essay
- If the topic contains extensive information, prioritize breadth over depth and consolidate where necessary
- Focus on the most relevant and interesting information that creates a useful knowledge structure
- Make the branches have different lengths for making the mind map visually more interesting.
- The mind map should be in the language of the user input.
- The title should be as short as possible.
- The mind map should have at least 3 branches going out of the title node.
- Research Instruction: ${searchInstruction}

**Output Format:**
Structure your response exactly like this:
{
	"markdown": "# Main Topic\\n\\n## Subtopic 1\\n- Point A\\n- Point B\\n\\n## Subtopic 2\\n- Point C\\n- Point D"
}  
`
				}
			],
			max_tokens: 2000,
			temperature: 0.7,
			plugins: useWebSearch ? [{ id: 'web', max_results: 3 }] : [],
			reasoning: { exclude: true }
		};

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
			const jsonMatch = content.match(/\{[^]*"markdown"[^]*\}/);

			if (jsonMatch) {
				let jsonContent = jsonMatch[0];
				try {
					parsedContent = JSON.parse(jsonContent);
				} catch (jsonError) {
					const markdownMatch = jsonContent.match(/"markdown"\s*:\s*"([^]*?)"\s*\}/);
					if (markdownMatch) {
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
			raw: sanitizedMarkdown
		};

		const { topic: finalTopic, markdown: finalMarkdown } = formatMarkdown(responseData);
		const contextUrls = useWebSearch ? extractContextUrlsFromBackend(data) : [];

		if (finalMarkdown) {
			await window.renderMindmap(finalMarkdown, contextUrls.length ? { contextUrls } : {});
			try {
				await fetch(
				'https://stats.mindmapwizard.com/hit/mmw-os/mind-map-generated', {
				method: 'GET',
				});
			} catch (trackingError) {
				console.error('Tracking Error:', trackingError);
			}
			let mmjsonStr = '';
			try {
				const ed = document.getElementById('json-editor');
				mmjsonStr = ed?.value || localStorage.getItem('json-mindmap-content') || '';
			} catch { }

			if (!mmjsonStr || !mmjsonStr.trim().startsWith('{')) {
				const fallback = {
					"mm-settings": { "spacing": 30, "border-radius": 4 },
					"mm-node": { "content": finalTopic || mindmapTopic, "children": [] }
				};
				mmjsonStr = JSON.stringify(fallback);
			}

			let mindmapId;
			if (!isRegenerate) {
				mindmapId = saveMindmapToHistory(mmjsonStr);
			} else {
				const urlObj = new URL(window.location);
				const existingId = urlObj.searchParams.get('id');
				if (existingId) {
					const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
					const idx = history.findIndex(it => String(it.id) === String(existingId));
					if (idx >= 0) {
						history[idx].mindmap = mmjsonStr;
						history[idx].timestamp = new Date().toISOString();
						localStorage.setItem('mindmap-history', JSON.stringify(history));
						if (typeof loadMindmapsLeftSidebar === 'function') { loadMindmapsLeftSidebar(); }
						mindmapId = history[idx].id;
					} else {
						mindmapId = saveMindmapToHistory(mmjsonStr);
					}
				} else {
					mindmapId = saveMindmapToHistory(mmjsonStr);
				}
			}

			const navLinks = document.querySelector('.nav-links');
			if (navLinks) {
				navLinks.classList.add('padding-right');
			}

			currentMindmapTitle = (function () {
				try {
					const o = JSON.parse(mmjsonStr);
					const r = o['mm-node'] || o.mmNode || o;
					const t = String(r?.content || '').trim();
					return t || (finalTopic || mindmapTopic);
				} catch { return finalTopic || mindmapTopic; }
			})();

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

		if (loadingAnim) loadingAnim.style.display = 'none';
		document.getElementById('button-container').style.display = 'flex';

		if (isRegenerate) {
			const regenerateBtn = document.getElementById('regenerate-button');
			regenerateBtn?.classList.remove('rotating');
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

		if (loadingAnim) loadingAnim.style.display = 'none';

		if (isRegenerate) {
			const regenerateBtn = document.getElementById('regenerate-button');
			regenerateBtn?.classList.remove('rotating');
		}

	} finally {
		generationInProgress = false;
		hideHeader();
	}
}


async function expandMindMapNodeCore() {
	if (!window.currentNodeElement) return;
	if (window.MMW_DISABLE_AI_FEATURES) return;

	try {
		const apiKey = getStoredApiKey();
		if (!apiKey) {
			console.error('OpenRouter API key required to expand a node');
			showApiKeyPopup();
			return;
		}

		const contextMenus = document.querySelectorAll('.context-menu');
		contextMenus.forEach(menu => menu.remove());

		const nodeEl = window.currentNodeElement;
		const nodeId = nodeEl.getAttribute('data-node-id');
		const textElement = nodeEl.querySelector('text');
		const nodeText = textElement ? textElement.textContent : '';

		if (!nodeId || !nodeText) return;

		const loader = document.getElementById('node-expand-loader');
		if (loader) loader.classList.add('active');
		const ratingPopup = document.getElementById('ratingPopup');
		if (ratingPopup) {
			ratingPopup.classList.remove('show');
		}

		let branchContext = '';
		if (window.getBranchContext) {
			branchContext = window.getBranchContext(nodeId);
		}

		try {
			const systemPrompt = `You are a helpful assistant that expands specific topics within a mind map. 
The user will provide the relevant Context (the path leading to the current node to expand).

Your task is to generate detailed child branches for the provided node based on the context.

Rules:
1. Output MUST be valid Markdown.
2. The "Target Node" string must be the Root of your response (Level 1 Header '#') and you can rename it if you want.
3. The new children must be Level 2 Headers ('##') which can have Level 3 children ('###').
4. You should not generate more than 5 new mind map elements (children across all levels).
5. Provide detailed, factual, and concrete sub-branches.
6. The generated content should be in the same language as the context.
Context: ${branchContext}`;

			const requestPayload = {
				model: getSelectedModel(),
				messages: [
					{ role: 'system', content: systemPrompt },
					{
						role: 'user',
						content: `Target Node: ${nodeText}\n\nContext:\n${branchContext}`
					}
				],
				max_tokens: 1200,
				temperature: 0.5,
				reasoning: { exclude: true }
			};

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
				throw new Error(errorData.error || errorData.message || `Backend error with status: ${response.status}`);
			}

			const data = await response.json();

			if (!data.choices || !data.choices[0] || !data.choices[0].message) {
				throw new Error('Invalid response from OpenRouter API');
			}

			let parsedContent;
			try {
				const content = data.choices[0].message.content.trim();
				const jsonMatch = content.match(/\{[^]*"markdown"[^]*\}/);

				if (jsonMatch) {
					let jsonContent = jsonMatch[0];
					try {
						parsedContent = JSON.parse(jsonContent);
					} catch (jsonError) {
						const markdownMatch = jsonContent.match(/"markdown"\s*:\s*"([^]*?)"\s*\}/);
						if (markdownMatch) {
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
					parsedContent = { markdown: content };
				}
			} catch (parseError) {
				console.error('Failed to parse API response as JSON:', parseError);
				console.error('Raw content:', data.choices[0].message.content);
				throw new Error('Invalid response format from API');
			}

			const markdown = parsedContent?.markdown;

			if (markdown && window.replaceNodeChildren) {
				const oldChildren = window.replaceNodeChildren(nodeId, markdown);
				if (loader) loader.classList.remove('active');
				window.expandNodeChildren(nodeId);

				try {
					await fetch(
					'https://stats.mindmapwizard.com/hit/mmw-os/mind-map-expanded', {
					method: 'GET',
					});
				} catch (trackingError) {
					console.error('Tracking Error:', trackingError);
				}

				if (oldChildren) {
					const existingRevertContainer = document.getElementById('revert-changes-container');

					if (existingRevertContainer) {
						const revertContainer = existingRevertContainer.cloneNode(true);
						existingRevertContainer.parentNode.replaceChild(revertContainer, existingRevertContainer);

						const revertTimer = revertContainer.querySelector('#revert-timer');

						revertContainer.classList.add('active');
						let timeLeft = 10;
						if (revertTimer) revertTimer.textContent = timeLeft;

						const timerInterval = setInterval(() => {
							timeLeft--;
							if (revertTimer) revertTimer.textContent = timeLeft;
							if (timeLeft <= 0) {
								clearInterval(timerInterval);
								revertContainer.classList.remove('active');
							}
						}, 1000);

						revertContainer.onclick = () => {
							clearInterval(timerInterval);
							revertContainer.classList.remove('active');
							if (window.restoreNodeChildren) {
								window.restoreNodeChildren(nodeId, oldChildren);
							}
						};
					}
				}
			} else {
				throw new Error('Invalid response from expansion service');
			}

		} catch (error) {
			console.error('Failed to expand node:', error);
			if (loader) loader.classList.remove('active');
			showInfoSnackbar('Failed to expand node: ' + error.message);
		}

	} catch (error) {
		console.error('Error in expandMindMapNode:', error);
		const loader = document.getElementById('node-expand-loader');
		if (loader) loader.classList.remove('active');
	}
}

function initiateGenerationProcess(providedTopic) {
	if (generationInProgress) {
		return;
	}

	const mindmapTopic = providedTopic || document.getElementById('prompt')?.value.trim();
	if (!mindmapTopic) {
		return;
	}

	const headerLines = mindmapTopic.split('\n').filter(line => line.trim().startsWith('#'));
	if (headerLines.length > 10) {
		createLocalMindMapFromMarkdown(mindmapTopic)
			.catch(error => {
				console.error('Error during local mindmap generation:', error);
			});
		return;
	}

	if (window.MMW_DISABLE_AI_FEATURES) {
		createManualMindMap();
		return;
	}

	currentMindmapTopic = mindmapTopic;

	document.getElementById('header').style.display = 'none';
	generateMindmap(mindmapTopic, false);
}

function initializeMainButtons() {
	if (window.mainButtonsInitialized) {
		return;
	}
	window.mainButtonsInitialized = true;

	const prompt = document.getElementById('prompt');
	const generateBtn = document.getElementById('generate-mindmap-btn');
	const regenerateBtn = document.getElementById('regenerate-button');

	generateBtn?.addEventListener('click', (e) => {
		if (e) e.preventDefault();
		initiateGenerationProcess();
	});

	regenerateBtn?.addEventListener('click', function (e) {
		if (e) e.preventDefault();
		if (window.MMW_DISABLE_AI_FEATURES) {
			createManualMindMap();
			return;
		}
		const promptValue = document.getElementById('prompt')?.value?.trim();
		if (promptValue) {
			generateMindmap(promptValue, true);
		} else if (currentMindmapTitle) {
			generateMindmap(currentMindmapTitle, true);
		} else {
			initiateGenerationProcess();
		}
	});

	const shadowPrompt = document.createElement('textarea');
	shadowPrompt.style.position = 'absolute';
	shadowPrompt.style.top = '-9999px';
	shadowPrompt.style.left = '-9999px';
	shadowPrompt.style.visibility = 'hidden';
	shadowPrompt.style.height = 'auto';
	shadowPrompt.style.overflow = 'hidden';
	shadowPrompt.setAttribute('rows', '1');
	document.body.appendChild(shadowPrompt);

	const syncShadowStyles = () => {
		const styles = window.getComputedStyle(prompt);
		shadowPrompt.style.width = styles.width;
		shadowPrompt.style.fontFamily = styles.fontFamily;
		shadowPrompt.style.fontSize = styles.fontSize;
		shadowPrompt.style.lineHeight = styles.lineHeight;
		shadowPrompt.style.padding = styles.padding;
		shadowPrompt.style.boxSizing = styles.boxSizing;
		shadowPrompt.style.border = styles.border;
	};

	const adjustHeight = () => {
		syncShadowStyles();
		shadowPrompt.value = prompt.value;

		shadowPrompt.style.height = 'auto';
		const newHeight = shadowPrompt.scrollHeight;

		prompt.style.height = newHeight + 'px';

		if (newHeight > 160) {
			prompt.style.overflowY = 'auto';
		} else {
			prompt.style.overflowY = 'hidden';
		}
	};

	prompt?.addEventListener('input', adjustHeight);
	window.addEventListener('resize', adjustHeight);

	if (prompt) {
		setTimeout(() => {
			adjustHeight();
		}, 0);
	}

	prompt?.addEventListener('keydown', function (event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			initiateGenerationProcess();
			if (prompt) {
				prompt.value = '';
				adjustHeight();
			}
		}
	});
}


function closeLeftSidebar() {
	try {
		const leftSidebar = document.getElementById('leftSidebar');
		const app = document.getElementById('app');
		const mindmap = document.getElementById('mindmap');
		const menubar = document.getElementById('menubar');
		const undoRedoContainer = document.getElementById('undo-redo-container');

		if (leftSidebar) leftSidebar.classList.remove('open');
		if (app) app.classList.remove('left-sidebar-open');
		if (mindmap) mindmap.classList.remove('left-sidebar-open');
		if (menubar) menubar.classList.remove('sidebar-open');
		document.documentElement.classList.remove('left-sidebar-open');
		if (undoRedoContainer) undoRedoContainer.classList.remove('left-sidebar-open');
		localStorage.setItem('left-sidebar-state', 'closed');
	} catch (e) {
		console.warn('closeLeftSidebar failed:', e);
	}
}

function showHeader() {
	const buttonContainer = document.getElementById('button-container');
	if (buttonContainer) {
		buttonContainer.style.display = 'none';
	}

	const inAppErrorMessage = document.getElementById('inAppErrorMessage');
	if (inAppErrorMessage) {
		inAppErrorMessage.style.display = 'none';
	}

	const app = document.getElementById('app');
	if (app) {
		app.style.display = 'block';
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

	if (window.innerWidth > 770) {
		document.getElementById('prompt')?.focus();
	}

	if (window.innerWidth < 770) {
		closeLeftSidebar();
	}

	const zoomControls = document.getElementById('zoom-controls');
	if (zoomControls) {
		zoomControls.classList.remove('show');
	}

	const undoRedoContainer = document.getElementById('undo-redo-container');
	if (undoRedoContainer) {
		undoRedoContainer.style.display = 'none';
	}

	closeNotesDrawer();
	removeUrlParameter('id');

	document.querySelectorAll('.mindmap-item').forEach((item) => {
		item.classList.remove('active');
	});
}

window.addEventListener("resize", updateSignUpButton);
function updateSignUpButton() {
	const signUpButton = document.querySelector(".sign-up-button");
	if (!signUpButton) return;
	if (window.innerWidth <= 435) {
		signUpButton.textContent = "Sign Up";
	} else {
		signUpButton.textContent = "Sign Up";
	}
}

(function () {
	let __mmwEnginePromise = null;

	function __mmwLoadScript(src) {
		return new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = src;
			s.async = true;
			s.onload = () => resolve();
			s.onerror = (e) => reject(new Error('Failed to load ' + src));
			document.head.appendChild(s);
		});
	}

	function __mmwDefaultSettings() {
		return {
			"spacing": 30,
			"border-radius": 4
		};
	}

	function __mmwEnsureEngineDom() {
		const mindmap = document.getElementById('mindmap');
		if (!mindmap) return;

		let svgOut = document.getElementById('svg-output');
		if (!svgOut) {
			svgOut = document.createElement('div');
			svgOut.id = 'svg-output';
			svgOut.style.width = '100%';
			svgOut.style.height = '100%';
			mindmap.innerHTML = '';
			mindmap.appendChild(svgOut);
		}

		let editor = document.getElementById('json-editor');
		if (!editor) {
			editor = document.createElement('textarea');
			editor.id = 'json-editor';
			editor.style.display = 'none';
			document.body.appendChild(editor);
		}

		const stubDefs = [
			{ id: 'slider', tag: 'div' },
			{ id: 'editor-container', tag: 'div' },
			{ id: 'app-container', tag: 'div' },
			{ id: 'zoom-in-btn', tag: 'button' },
			{ id: 'zoom-out-btn', tag: 'button' },
			{ id: 'fit-screen-btn', tag: 'button' },
			{ id: 'edit-json-btn', tag: 'button' }
		];
		stubDefs.forEach(({ id, tag }) => {
			if (!document.getElementById(id)) {
				const el = document.createElement(tag);
				el.id = id;
				el.style.display = 'none';
				document.body.appendChild(el);
			}
		});
	}

	function __mmwDebounce(fn, ms) {
		let t = null;
		return function () {
			const self = this;
			const args = arguments;
			clearTimeout(t);
			t = setTimeout(() => fn.apply(self, args), ms);
		};
	}
	function __mmwAutoSave() {
		try {
			const ed = document.getElementById('json-editor');
			if (!ed) return;
			const jsonStr = ed.value || '';

			window.currentMarkdown = jsonStr;

			let derivedTopic = 'Mind Map';
			try {
				const parsed = JSON.parse(jsonStr || '{}');
				const root = parsed['mm-node'] || parsed.mmNode || null;
				const rootContent = root ? String(root.content || '').trim() : '';
				if (rootContent) derivedTopic = rootContent;
			} catch { }

			const nowIso = new Date().toISOString();

			const url = new URL(location.href);
			const id = url.searchParams.get('id');

			if (!id) {
				return;
			}

			let history = [];
			try { history = JSON.parse(localStorage.getItem('mindmap-history') || '[]'); } catch { history = []; }

			const idx = history.findIndex(it => String(it.id) === String(id));
			if (idx >= 0) {
				if (history[idx].mindmap !== jsonStr) {
					history[idx].mindmap = jsonStr;
					history[idx].timestamp = nowIso;
					localStorage.setItem('mindmap-history', JSON.stringify(history));
					if (typeof loadMindmapsLeftSidebar === 'function') {
						loadMindmapsLeftSidebar();
					}
				}
				return;
			}
			try {
				const pgRaw = localStorage.getItem('mindmap-playground');
				if (!pgRaw) return;
				const pg = JSON.parse(pgRaw);
				if (pg && typeof pg === 'object' && String(pg.id) === String(id)) {
					if (pg.mindmap !== jsonStr) {
						pg.mindmap = jsonStr;
						pg.timestamp = nowIso;
						localStorage.setItem('mindmap-playground', JSON.stringify(pg));
					}
				}
			} catch { }
		} catch (e) {
			console.warn('Auto-save failed:', e);
		}
	}
	const __mmwAutoSaveDebounced = __mmwDebounce(__mmwAutoSave, 400);


	function __mmwMarkdownToJson(md) {
		const lines = String(md || '').split(/\r?\n/);

		let rootContent = 'Mind Map Wizard';
		let firstHeadingLevel = null;
		let firstHeadingIndex = -1;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const m = line.match(/^(#{1,6})\s+(.*)$/);
			if (m) {
				rootContent = m[2].trim();
				firstHeadingLevel = m[1].length;
				firstHeadingIndex = i;
				break;
			}
		}

		const root = { content: rootContent, children: [] };
		const stack = [{ level: 1, node: root }];

		lines.forEach((raw, index) => {
			const line = raw.trim();
			if (!line) return;

			if (index === firstHeadingIndex) return;

			const m = line.match(/^(#{1,6})\s+(.*)$/);
			if (m) {
				const lvl = m[1].length;
				const text = m[2].trim();
				const node = { content: text, children: [] };
				while (stack.length && stack[stack.length - 1].level >= lvl) stack.pop();
				const parent = stack[stack.length - 1]?.node || root;
				parent.children.push(node);
				stack.push({ level: lvl, node });
				return;
			}

			const b = line.match(/^([-*+]|\d+\.)\s+(.*)$/);
			if (b) {
				const text = b[2].trim();
				const node = { content: text, children: [] };
				while (stack.length > 1 && stack[stack.length - 1].isBullet) {
					stack.pop();
				}
				const parent = stack[stack.length - 1]?.node || root;
				parent.children.push(node);
				return;
			}

			const node = { content: line, children: [] };
			const parent = stack[stack.length - 1]?.node || root;
			parent.children.push(node);
		});

		return {
			"mm-settings": __mmwDefaultSettings(),
			"mm-node": root
		};
	}

	function __mmwInitEngine() {
		if (__mmwEnginePromise) return __mmwEnginePromise;
		__mmwEnsureEngineDom();

		__mmwEnginePromise = __mmwLoadScript('/scripts/mm-rendering/renderer.js')
			.then(() => __mmwLoadScript('/scripts/mm-rendering/interaction.js'))
			.then(() => {
				try {
					if (!window.__mmwEngineBooted) {
						window.__mmwEngineBooted = true;
						if (document.readyState !== 'loading') {
							document.dispatchEvent(new Event('DOMContentLoaded'));
						}
					}
				} catch { }

				try {
					const ed = document.getElementById('json-editor');
					if (ed) ed.addEventListener('input', __mmwAutoSaveDebounced);
				} catch { }

				try {
					let __mmwLastSavedJson = null;
					setInterval(() => {
						try {
							const ed = document.getElementById('json-editor');
							if (!ed) return;
							const val = ed.value || '';
							if (val && val !== __mmwLastSavedJson) {
								__mmwLastSavedJson = val;
								__mmwAutoSaveDebounced();
							}
						} catch { }
					}, 1000);
				} catch { }
			})
			.catch((e) => {
				console.error('Failed to initialize MMW rendering engine:', e);
				throw e;
			});

		return __mmwEnginePromise;
	}

	window.__mmwInitEngine = __mmwInitEngine;
	window.renderMindmap = async function (input, options = {}) {
		try {
			await __mmwInitEngine();

			let dataObj = null;
			if (typeof input === 'string' && input.trim().startsWith('{')) {
				try { dataObj = JSON.parse(input); } catch { dataObj = null; }
			}
			if (!dataObj) {
				const md = typeof input === 'string' ? input : String(input ?? '');
				dataObj = __mmwMarkdownToJson(md);
			}

			if (!dataObj['mm-settings']) {
				dataObj['mm-settings'] = __mmwDefaultSettings();
			}

			const hasOptContext =
				options && (Object.prototype.hasOwnProperty.call(options, 'contextUrls') || Object.prototype.hasOwnProperty.call(options, 'contexturls'));
			if (hasOptContext) {
				const optContext = Object.prototype.hasOwnProperty.call(options, 'contextUrls')
					? options.contextUrls
					: options.contexturls;
				dataObj['mm-settings'] = dataObj['mm-settings'] || __mmwDefaultSettings();
				dataObj['mm-settings'].contextUrls = normalizeContextUrls(optContext);
			}

			const jsonStr = JSON.stringify(dataObj, null, 2);
			try { localStorage.setItem('json-mindmap-content', jsonStr); } catch { }

			const editor = document.getElementById('json-editor');
			if (editor) {
				editor.value = jsonStr;
				editor.dispatchEvent(new Event('input', { bubbles: true }));
			}

			const mindmapEl = document.getElementById('mindmap');
			const svgOut = document.getElementById('svg-output');
			if (mindmapEl && svgOut && svgOut.parentNode !== mindmapEl) {
				mindmapEl.innerHTML = '';
				mindmapEl.appendChild(svgOut);
			}
			if (mindmapEl) {
				mindmapEl.style.display = 'block';
			}

			if (window.updateZoomControlsVisibility) {
				window.updateZoomControlsVisibility();
			} else {
				const zoomControls = document.getElementById('zoom-controls');
				if (zoomControls) zoomControls.classList.add('show');
			}

			window.currentMarkdown = jsonStr;

			try {
				const bc = document.getElementById('button-container');
				if (bc) bc.style.display = 'flex';
			} catch { }

			try {
			} catch { }
		} catch (e) {
			console.error('MMW engine render error:', e);
			const container = document.getElementById('mindmap');
			if (container) {
				container.innerHTML = '';
				try {
					renderErrorMessage(container, e, typeof input === 'string' ? input : '');
				} catch { }
			}
		}
	};
})();

document.addEventListener('DOMContentLoaded', function () {
	if (window.__mmwNewJsInitDone) { return; }
	window.__mmwNewJsInitDone = true;

	initializeEditMode();
	initializePopupElements();
	addMindmapActionStyles();
	initLeftSidebar();
	initializeMainButtons();
	initializeHelpPopup();
	initializePdfUpload();
	initializeWebSearchToggle();


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

	try {
		const manualLinks = document.querySelectorAll('a.manual-btn, .page-links a');
		manualLinks.forEach((el) => {
			el.addEventListener('click', (e) => {
				e.preventDefault();
				if (typeof window.createManualMindMap === 'function') {
					window.createManualMindMap();
				}
			}, { passive: false });
		});
	} catch (e) {
		console.warn('Manual create handler setup failed:', e);
	}
});

function initializeWebSearchToggle() {
	const toggleContainer = document.getElementById('web-search-toggle');
	const checkbox = document.getElementById('web-search-checkbox');
	if (!toggleContainer || !checkbox) return;

	const stored = localStorage.getItem('mmw-web-search-enabled');
	const isEnabled = stored === null ? true : stored === 'true';
	checkbox.checked = isEnabled;
	window.MMW_USE_WEB_SEARCH = isEnabled;

	checkbox.addEventListener('change', () => {
		const enabled = checkbox.checked;
		window.MMW_USE_WEB_SEARCH = enabled;
		localStorage.setItem('mmw-web-search-enabled', String(enabled));
	});
}

function initializePdfUpload() {
	const uploadButton = document.querySelector('.upload-pdf-button');
	if (!uploadButton) return;

	let fileInput = document.getElementById('pdf-file-input');
	if (!fileInput) {
		fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = 'application/pdf,.pdf';
		fileInput.id = 'pdf-file-input';
		fileInput.style.display = 'none';
		document.body.appendChild(fileInput);
	}

	ensureDragDropOverlay();

	uploadButton.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		fileInput.click();
	});

	fileInput.addEventListener('change', (e) => {
		const file = e.target.files && e.target.files[0];
		if (!file) return;
		if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
			showErrorPopup('Please select a PDF file.', '');
			fileInput.value = '';
			return;
		}
		handlePdfUpload(file);
		fileInput.value = '';
	});

	const headerElement = document.getElementById('header');
	if (!headerElement) return;

	const preventDefaults = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const highlight = () => {
		headerElement.classList.add('drag-over');
	};

	const unhighlight = () => {
		headerElement.classList.remove('drag-over');
	};

	let dragCounter = 0;
	let isDraggingOverHeader = false;

	headerElement.addEventListener('dragenter', (e) => {
		preventDefaults(e);
		dragCounter++;
		if (!isDraggingOverHeader) {
			isDraggingOverHeader = true;
			highlight();
			showDragDropOverlay();
		}
	}, false);

	headerElement.addEventListener('dragleave', (e) => {
		preventDefaults(e);
		dragCounter--;
		setTimeout(() => {
			const rect = headerElement.getBoundingClientRect();
			const isMouseOverHeader = e.clientX >= rect.left && e.clientX <= rect.right &&
				e.clientY >= rect.top && e.clientY <= rect.bottom;
			if (!isMouseOverHeader && isDraggingOverHeader) {
				isDraggingOverHeader = false;
				unhighlight();
				hideDragDropOverlay();
			}
		}, 10);
	}, false);

	['dragenter', 'dragover', 'dragleave'].forEach((eventName) => {
		headerElement.addEventListener(eventName, preventDefaults, false);
	});

	headerElement.addEventListener('dragover', () => {
		highlight();
	}, false);

	const overlay = document.getElementById('drag-drop-overlay');
	if (overlay) {
		overlay.addEventListener('drop', (e) => {
			preventDefaults(e);
			const dt = e.dataTransfer;
			const files = dt?.files || [];
			unhighlight();
			if (files.length > 0) {
				const file = files[0];
				if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
					handlePdfUpload(file);
				} else {
					showErrorPopup('Please drop a PDF file.', '');
				}
			}
			hideDragDropOverlay();
		}, false);

		overlay.addEventListener('dragover', preventDefaults, false);
	}

	document.addEventListener('dragover', preventDefaults, false);
	document.addEventListener('dragleave', (e) => {
		preventDefaults(e);
		if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
			isDraggingOverHeader = false;
			hideDragDropOverlay();
		}
	}, false);

	document.addEventListener('drop', (e) => {
		preventDefaults(e);
		isDraggingOverHeader = false;
		hideDragDropOverlay();
	}, false);
}

function ensureDragDropOverlay() {
	let overlay = document.getElementById('drag-drop-overlay');
	if (overlay) return overlay;

	overlay = document.createElement('div');
	overlay.id = 'drag-drop-overlay';
	overlay.className = 'drag-drop-overlay';
	overlay.innerHTML = `
		<div class="drag-drop-content">
			<div class="drag-drop-icon">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 12v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"></path>
					<polyline points="16 6 12 2 8 6"></polyline>
					<line x1="12" x2="12" y1="2" y2="12"></line>
				</svg>
			</div>
			<h2>Drop your PDF file here</h2>
			<p>Release to upload and generate a mind map</p>
		</div>
	`;

	document.body.appendChild(overlay);
	return overlay;
}

function showDragDropOverlay() {
	const overlay = document.getElementById('drag-drop-overlay');
	if (overlay) {
		overlay.classList.add('active');
	}
}

function hideDragDropOverlay() {
	const overlay = document.getElementById('drag-drop-overlay');
	if (overlay) {
		overlay.classList.remove('active');
	}
}

function readFileAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
		reader.readAsDataURL(file);
	});
}

async function handlePdfUpload(file) {
	if (!file) return;
	if (generationInProgress) return;

	const maxSizeBytes = 15 * 1024 * 1024;
	if (file.size > maxSizeBytes) {
		showErrorPopup('The PDF file is too large. Please upload a file under 15 MB.', '');
		return;
	}

	generationInProgress = true;
	try {
		const loadingAnim = document.getElementById('loading-animation');
		if (loadingAnim) loadingAnim.style.display = 'flex';
		const aiDisclaimer = document.getElementById('ai-content-disclaimer');
		if (aiDisclaimer) aiDisclaimer.style.display = 'block';

		let apiKey = getStoredApiKey();
		if (!apiKey) {
			const apiKeyInput = document.getElementById('openrouter-api-key');
			apiKey = apiKeyInput?.value?.trim();
		}
		if (!apiKey) {
			showApiKeyPopup();
			return;
		}

		const dataUrl = await readFileAsDataUrl(file);
		const systemPrompt = 'You are a mind map generator. Return only valid JSON that matches the provided schema.';

		const requestBody = {
			model: getSelectedModel(),
			plugins: [{ id: 'file-parser', pdf: { engine: 'pdf-text' } }],
			messages: [
				{ role: 'system', content: systemPrompt },
				{
					role: 'user',
					content: [
						{ type: 'text', text: `Generate a mind map from the document: ${file.name} in its content language` },
						{ type: 'file', file: { filename: file.name, file_data: dataUrl } }
					]
				}
			],
			max_tokens: 2200,
			reasoning: { enabled: false },
			temperature: 0.7,
			response_format: {
				type: 'json_schema',
				json_schema: {
					name: 'mind_map_response',
					strict: true,
					schema: {
						type: 'object',
						properties: {
							title: { type: 'string', description: 'A concise, descriptive title for the mind map. Should not contain: Mind Map' },
							markdown: { type: 'string', description: 'The complete mind map in markdown format' }
						},
						required: ['title', 'markdown'],
						additionalProperties: false
					}
				}
			}
		};

		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': window.location.origin,
				'X-Title': 'Mind Map Wizard'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorText = await response.text();
			if (response.status === 400 && errorText.includes('File is too large')) throw new Error('FILE_TOO_LARGE');
			if (response.status === 503 && errorText.includes('Cloudflare')) throw new Error('FILE_TOO_LARGE');
			throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
		}

		const data = await response.json();
		const message = data?.choices?.[0]?.message?.content;
		if (!message) throw new Error('Invalid response from OpenRouter API');

		let parsed = null;
		if (typeof message === 'string') {
			try {
				parsed = JSON.parse(message);
			} catch {
				const jsonMatch = message.match(/\{[\s\S]*\}/);
				if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
			}
		} else if (typeof message === 'object') {
			parsed = message;
		}

		if (!parsed || !parsed.markdown) {
			throw new Error('Invalid response from API: missing required markdown field');
		}

		const responseData = {
			topic: parsed.title || file.name.replace(/\.pdf$/i, ''),
			raw: String(parsed.markdown || '').trim()
		};

		const { topic: finalTopic, markdown: finalMarkdown } = formatMarkdown(responseData);
		if (!finalMarkdown) throw new Error('Generated markdown content is empty or invalid after processing.');
		hideHeader();
		await window.renderMindmap(finalMarkdown);
		try {
			await fetch(
			'https://stats.mindmapwizard.com/hit/mmw-os/mind-map-generated-pdf', {
			method: 'GET',
			});
		} catch (trackingError) {
			console.error('Tracking Error:', trackingError);
		}
		let mmjsonStr = '';
		try {
			const ed = document.getElementById('json-editor');
			mmjsonStr = ed?.value || localStorage.getItem('json-mindmap-content') || '';
		} catch { }

		if (!mmjsonStr || !mmjsonStr.trim().startsWith('{')) {
			const fallback = {
				"mm-settings": { "spacing": 30, "border-radius": 4 },
				"mm-node": { "content": finalTopic, "children": [] }
			};
			mmjsonStr = JSON.stringify(fallback);
		}

		const newId = saveMindmapToHistory(mmjsonStr);
		currentMindmapTitle = finalTopic;

		const url = new URL(window.location);
		if (url.searchParams.has('q')) {
			url.searchParams.delete('q');
		}
		if (newId) {
			url.searchParams.set('id', newId);
		}
		window.history.replaceState({}, '', url.toString());

		showMindMapElements();
	} catch (error) {
		console.error('PDF upload error:', error);
		if (error.message === 'FILE_TOO_LARGE') {
			showErrorPopup('The PDF file is too large for processing. Please try a smaller file.', '');
		} else {
			showErrorPopup(error.message || 'An error occurred while generating the mind map.', '');
		}
	} finally {
		generationInProgress = false;
		const loadingAnim = document.getElementById('loading-animation');
		if (loadingAnim) loadingAnim.style.display = 'none';
	}
}



function removeUrlParameter(param) {
	const url = new URL(window.location.href);
	if (url.searchParams.has(param)) {
		url.searchParams.delete(param);
		window.history.replaceState({}, document.title, url.toString());
	}
}

function initLeftSidebar() {
	loadMindmapsLeftSidebar();
	const leftSidebar = document.getElementById('leftSidebar');
	let toggle = document.getElementById('leftSidebarToggle');
	const app = document.getElementById('app');
	const mindmap = document.getElementById('mindmap');
	const menubar = document.getElementById('menubar');
	const undoRedoContainer = document.getElementById('undo-redo-container');

	if (toggle) {
		const fresh = toggle.cloneNode(true);
		toggle.parentNode.replaceChild(fresh, toggle);
		toggle = fresh;
	}

	if (!leftSidebar || !toggle) {
		console.error('Left sidebar elements not found');
		return;
	}

	if (toggle && leftSidebar) {
		if (toggle.__leftSidebarBound) {
		} else {
			toggle.__leftSidebarBound = true;
			toggle.addEventListener('click', function () {
				leftSidebar.classList.toggle('open');

				if (app) app.classList.toggle('left-sidebar-open');
				if (mindmap) mindmap.classList.toggle('left-sidebar-open');
				if (undoRedoContainer) undoRedoContainer.classList.toggle('left-sidebar-open');

				const isOpen = leftSidebar.classList.contains('open');

				document.documentElement.classList.toggle('left-sidebar-open', isOpen);

				if (menubar) {
					menubar.classList.toggle('sidebar-open', isOpen);
				}

				localStorage.setItem('left-sidebar-state', isOpen ? 'open' : 'closed');

				try {
				} catch (e) {
					console.warn('Sidebar debug read failed:', e);
				}
			});
		}
	} else {
		console.error('Navbar toggle elements missing:', { toggle, leftSidebar });
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
		if (undoRedoContainer) undoRedoContainer.classList.add('left-sidebar-open');

		document.documentElement.classList.add('left-sidebar-open');

		if (menubar) {
			menubar.classList.add('sidebar-open');
		}
	}

	try {
		const lsTransformInit = window.getComputedStyle(leftSidebar).transform;
		const mmDisplayInit = mindmap ? window.getComputedStyle(mindmap).display : null;
		const mmMarginLeftInit = mindmap ? window.getComputedStyle(mindmap).marginLeft : null;
		const appDisplayInit = app ? window.getComputedStyle(app).display : null;
		const appMarginLeftInit = app ? window.getComputedStyle(app).marginLeft : null;
		const rootHasInit = document.documentElement.classList.contains('left-sidebar-open');
	} catch (e) {
		console.warn('Sidebar init debug failed:', e);
	}
}

function initializeEditMode() {
	const editModeButton = document.getElementById('customize-mode-button');
	const cancelEditButton = document.getElementById('cancel-edit');
	const saveEditButton = document.getElementById('save-edit');

	editModeButton?.addEventListener('click', () => toggleEditMode(true));
	cancelEditButton?.addEventListener('click', () => toggleEditMode(false));
	saveEditButton?.addEventListener('click', updateMindmapFromEdit);
	try {
		const balancedBtn = document.getElementById('align-balanced');
		const rightBtn = document.getElementById('align-right');
		if (balancedBtn && rightBtn) {
			const setActive = (activeBtn, inactiveBtn) => {
				activeBtn.style.background = 'var(--text-color)';
				activeBtn.style.color = 'var(--white)';
				activeBtn.style.borderColor = 'var(--text-color)';
				inactiveBtn.style.background = 'var(--mindmap-item-hover-bg)';
				inactiveBtn.style.color = 'var(--text-color)';
				inactiveBtn.style.borderColor = 'var(--light-grey)';
			};
			balancedBtn.onclick = (e) => {
				e.preventDefault();
				balancedBtn.dataset.selected = 'true';
				rightBtn.dataset.selected = 'false';
				setActive(balancedBtn, rightBtn);
			};
			rightBtn.onclick = (e) => {
				e.preventDefault();
				balancedBtn.dataset.selected = 'false';
				rightBtn.dataset.selected = 'true';
				setActive(rightBtn, balancedBtn);
			};
		}
	} catch { }
}

function saveMindmapToHistory(mindmapJsonStr, idOverride = null) {
	const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
	const timestamp = new Date().toISOString();
	const newId = idOverride || Date.now();

	history.push({
		mindmap: mindmapJsonStr,
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

	return newId;
}

function updateCurrentMindmap() {
	const mindmapElement = document.getElementById('mindmap');
	let markdown = '';
	if (mindmapElement) {
		markdown = mindmapElement.getAttribute('data-markdown') || '';
	}
	if (!markdown && typeof window.currentMarkdown === 'string') {
		markdown = window.currentMarkdown;
	}
	if (typeof markdown === 'string' && markdown.trim().startsWith('{')) {
		try {
			const obj = JSON.parse(markdown);
			const root = obj['mm-node'] || obj.mmNode || obj;
			const lines = [];
			const maxHeading = 6;
			(function walk(node, level) {
				if (!node || typeof node !== 'object') return;
				const text = String(node.content ?? '').trim();
				if (text) {
					if (level <= maxHeading) {
						lines.push(`${'#'.repeat(level)} ${text}`.trim());
					} else {
						lines.push(`- ${text}`.trim());
					}
				}
				if (Array.isArray(node.children)) {
					for (const child of node.children) walk(child, level + 1);
				}
			})(root, 1);
			markdown = lines.join('\n');
		} catch { }
	}
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
	errorDetails.style.background = 'var(--background-color)';
	errorDetails.style.color = 'var(--text-color)';
	errorDetails.style.border = '1px solid var(--border-color)';
	errorDetails.style.borderRadius = '4px';
	errorDetails.style.overflow = 'auto';
	container.appendChild(errorDetails);
}

function toggleEditMode(show) {
	const mindmapElement = document.getElementById('mindmap');
	const editorElement = document.getElementById('mmCustomizationPanel');
	const editorOverlay = document.getElementById('editor-overlay');

	if (show) {
		try {
			const ed = document.getElementById('json-editor');
			const jsonStr = ed?.value || localStorage.getItem('json-mindmap-content') || '';
			let obj = {};
			try { obj = JSON.parse(jsonStr || '{}'); } catch { obj = {}; }
			const settings = obj['mm-settings'] || {};

			const roundingRange = document.getElementById('roundingRange');
			const spacingRange = document.getElementById('spacingRange');
			const branchWidthRange = document.getElementById('branchWidthRange');
			const fontSelect = document.getElementById('fontSelect');
			const balancedBtn = document.getElementById('align-balanced');
			const rightBtn = document.getElementById('align-right');
			const nodeBackgroundsToggle = document.getElementById('nodeBackgroundsToggle');

			const curRadius = Number.isFinite(settings['border-radius']) ? Number(settings['border-radius']) : 4;
			const curSpacing = Number.isFinite(settings['spacing']) ? Number(settings['spacing']) : 30;
			const curWidth = Number.isFinite(settings['mm-link-width']) ? Number(settings['mm-link-width']) : 2.5;
			const curAlign = typeof settings['branch-alignment'] === 'string' ? settings['branch-alignment'] : 'balanced';
			const curFont = (settings['font-family'] && typeof settings['font-family'] === 'string') ? settings['font-family'] : 'standard';

			if (roundingRange) roundingRange.value = String(curRadius);
			if (spacingRange) spacingRange.value = String(curSpacing);
			if (branchWidthRange) branchWidthRange.value = String(curWidth);

			if (nodeBackgroundsToggle) {
				nodeBackgroundsToggle.checked = (settings['style'] !== "2");
			}

			const setActive = (activeBtn, inactiveBtn) => {
				if (!activeBtn || !inactiveBtn) return;
				activeBtn.style.background = 'var(--text-color)';
				activeBtn.style.color = 'var(--white)';
				activeBtn.style.borderColor = 'var(--text-color)';
				inactiveBtn.style.background = 'var(--mindmap-item-hover-bg)';
				inactiveBtn.style.color = 'var(--text-color)';
				inactiveBtn.style.borderColor = 'var(--light-grey)';
			};
			if (curAlign === 'right') {
				if (balancedBtn && rightBtn) {
					balancedBtn.dataset.selected = 'false';
					rightBtn.dataset.selected = 'true';
					setActive(rightBtn, balancedBtn);
				}
			} else {
				if (balancedBtn && rightBtn) {
					balancedBtn.dataset.selected = 'true';
					rightBtn.dataset.selected = 'false';
					setActive(balancedBtn, rightBtn);
				}
			}

			if (fontSelect) {
				const allowed = ['standard', 'Roboto Mono', 'PT Serif', 'Bebas Neue', 'Indie Flower', 'Open Runde'];
				fontSelect.value = allowed.includes(curFont) ? curFont : 'standard';
			}

			updatePreview();

			const inputs = [roundingRange, spacingRange, branchWidthRange, fontSelect, nodeBackgroundsToggle];
			inputs.forEach(input => {
				if (input) {
					input.oninput = updatePreview;
					input.onchange = updatePreview;
				}
			});

		} catch (e) {
			console.warn('Prefill customization UI failed:', e);
		}

		editorElement.classList.add('show');
		editorOverlay.classList.add('show');
	} else {
		editorElement.classList.remove('show');
		editorOverlay.classList.remove('show');
		if (mindmapElement) mindmapElement.style.display = 'block';
	}
}

function updatePreview() {
	const roundingRange = document.getElementById('roundingRange');
	const spacingRange = document.getElementById('spacingRange');
	const branchWidthRange = document.getElementById('branchWidthRange');
	const fontSelect = document.getElementById('fontSelect');
	const nodeBackgroundsToggle = document.getElementById('nodeBackgroundsToggle');

	if (!roundingRange || !spacingRange || !branchWidthRange || !fontSelect) return;

	const radius = roundingRange.value;
	const spacing = parseInt(spacingRange.value, 10);
	const width = branchWidthRange.value;
	const font = fontSelect.value;

	const rects = document.querySelectorAll('#preview-svg rect');
	rects.forEach(rect => {
		rect.setAttribute('rx', radius);
		rect.setAttribute('ry', radius);
	});

	const links = document.querySelectorAll('#preview-svg .mm-link');
	links.forEach(link => {
		link.setAttribute('stroke-width', width);
	});

	const style = document.getElementById('preview-style');
	if (style) {
		const fontFamily = font === 'standard' ? 'sans-serif' : font;
		style.textContent = `.mm-preview-node text{font-family:${fontFamily}, system-ui, sans-serif;}`;
	}

	const rootCenterY = 53;
	const nodeHeight = 38;
	const rootX = 239;
	const levelSpacing = spacing;
	const branchX = rootX + levelSpacing;
	const offset = spacing / 2 + nodeHeight / 2;
	const branch0Y = rootCenterY - offset - (nodeHeight / 2);
	const branch1Y = rootCenterY + offset - (nodeHeight / 2);

	const branch0 = document.getElementById('preview-node-0');
	const branch1 = document.getElementById('preview-node-1');

	if (branch0) branch0.setAttribute('transform', `translate(${branchX}, ${branch0Y})`);
	if (branch1) branch1.setAttribute('transform', `translate(${branchX}, ${branch1Y})`);

	const link0 = document.getElementById('preview-link-0');
	const link1 = document.getElementById('preview-link-1');

	const branch0CenterY = branch0Y + nodeHeight / 2;
	const branch1CenterY = branch1Y + nodeHeight / 2;

	const curve = levelSpacing * 0.5;
	const cp1X = rootX + curve;
	const cp2X = branchX - curve;

	if (link0) {
		const d0 = `M ${rootX},53 C ${cp1X},53 ${cp2X},${branch0CenterY} ${branchX},${branch0CenterY}`;
		link0.setAttribute('d', d0);
	}

	if (link1) {
		const d1 = `M ${rootX},53 C ${cp1X},53 ${cp2X},${branch1CenterY} ${branchX},${branch1CenterY}`;
		link1.setAttribute('d', d1);
	}

	if (nodeBackgroundsToggle) {
		const showBackgrounds = nodeBackgroundsToggle.checked;
		const colorRects = document.querySelectorAll('#preview-svg rect[fill-opacity]');
		colorRects.forEach(rect => {
			rect.style.display = showBackgrounds ? 'block' : 'none';
		});
	}
}

function handleUrlParameters() {
	const params = new URLSearchParams(location.search);
	const id = params.get('id');
	const q = params.get('q');
	const manual = params.get('manual');

	if (id) {
		loadMindMapById(id);
	} else if (q) {
		const headerLines = q.split('\n').filter(line => line.trim().startsWith('#'));
		if (headerLines.length > 10) {
			createLocalMindMapFromMarkdown(q);
		} else {
			initiateGenerationProcess(q);
		}
		removeUrlParameter('q');
	} else if (manual === 'true') {
		createManualMindMap();
		removeUrlParameter('manual');
	}
}

function createManualMindMap() {
	if (window.__mmwManualCreateInProgress) return;
	window.__mmwManualCreateInProgress = true;

	try {
		const defaultMM = {
			"mm-settings": {
				"spacing": 30,
				"border-radius": 4,
				"branch-alignment": "right"
			},
			"mm-node": {
				"content": "New Mind Map",
				"children": [
					{
						"content": "Double click to enter text",
						"children": []
					},
					{
						"content": "Right-click on a node for options",
						"children": []
					}
				]
			}
		};

		try { currentMindmapTitle = defaultMM["mm-node"]?.content || 'Mind Map'; } catch (e) { }

		try { hideInitialElements(); } catch (e) { }

		const mmjsonStr = JSON.stringify(defaultMM);

		const newId = Date.now();
		saveMindmapToHistory(mmjsonStr, newId);
		updateUrlWithId(String(newId));

		renderMindmap(mmjsonStr);
		showMindMapElements();
		hideHeader();
	} catch (e) {
		console.error('Failed to create manual mind map:', e);
	} finally {
		setTimeout(() => {
			window.__mmwManualCreateInProgress = false;
		}, 50);
	}
}

window.createManualMindMap = createManualMindMap;

function updateMindmapFromEdit() {
	try {
		const ed = document.getElementById('json-editor');
		let mmjsonStr = ed?.value || localStorage.getItem('json-mindmap-content') || '';
		if (!mmjsonStr || !mmjsonStr.trim().startsWith('{')) {
			console.warn('No mind map JSON found to customize.');
			toggleEditMode(false);
			return;
		}
		let obj = {};
		try { obj = JSON.parse(mmjsonStr); } catch { obj = {}; }

		const roundingRange = document.getElementById('roundingRange');
		const spacingRange = document.getElementById('spacingRange');
		const branchWidthRange = document.getElementById('branchWidthRange');
		const fontSelect = document.getElementById('fontSelect');
		const balancedBtn = document.getElementById('align-balanced');
		const rightBtn = document.getElementById('align-right');
		const nodeBackgroundsToggle = document.getElementById('nodeBackgroundsToggle');

		obj['mm-settings'] = obj['mm-settings'] || {};
		const settings = obj['mm-settings'];

		if (spacingRange) settings['spacing'] = Number(spacingRange.value || 30);
		if (branchWidthRange) settings['mm-link-width'] = Number(branchWidthRange.value || 2.5);
		if (roundingRange) settings['border-radius'] = Number(roundingRange.value || 4);

		if (nodeBackgroundsToggle) {
			if (!nodeBackgroundsToggle.checked) {
				settings['style'] = "2";
			} else {
				if (settings['style'] === "2") {
					delete settings['style'];
				}
			}
		}

		let align = 'balanced';
		if (rightBtn?.dataset.selected === 'true') align = 'right';
		if (balancedBtn?.dataset.selected === 'true') align = 'balanced';
		settings['branch-alignment'] = align;

		const selFont = (fontSelect?.value || 'standard').trim();
		if (selFont === 'standard') {
			delete settings['font-family'];
			delete settings.fontFamily;
			delete settings.fonts;
		} else {
			settings['font-family'] = selFont;
		}

		const updatedStr = JSON.stringify(obj, null, 2);
		if (ed) ed.value = updatedStr;
		try { localStorage.setItem('json-mindmap-content', updatedStr); } catch { }
		renderMindmap(updatedStr);

		try {
			const url = new URL(location.href);
			const id = url.searchParams.get('id');
			if (id) {
				const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
				const idx = history.findIndex((item) => String(item.id) === String(id));
				if (idx >= 0) {
					history[idx].mindmap = updatedStr;
					history[idx].timestamp = new Date().toISOString();
					localStorage.setItem('mindmap-history', JSON.stringify(history));
					if (typeof loadMindmapsLeftSidebar === 'function') loadMindmapsLeftSidebar();
				}
			}
		} catch (e) {
			console.warn('Failed to update history after customization:', e);
		}
	} catch (e) {
		console.error('Failed to apply customization:', e);
	} finally {
		toggleEditMode(false);
	}
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

	const deletePopup = document.createElement('div');
	deletePopup.className = 'custom-popup';
	deletePopup.id = 'deletePopup';
	deletePopup.innerHTML = `
        <div class="popup-header">
            <h3>
                Delete Mind Map
            </h3>
        </div>
        <div class="popup-content">
            <div class="popup-message">Are you sure you want to delete this mind map? This action cannot be undone.</div>
            <div class="popup-buttons">
                <button class="popup-btn popup-btn-cancel" id="deleteCancelBtn">Cancel</button>
                <button class="popup-btn popup-btn-delete" id="deleteConfirmBtn">Delete</button>
            </div>
        </div>
    `;

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

	const handwrittenUpgradeTip = document.getElementById('handwrittenUpgradeTip');
	if (handwrittenUpgradeTip) {
		handwrittenUpgradeTip.style.display = 'none';
	}

	const app = document.getElementById('app');
	if (app) {
		app.style.display = 'none';
	}
}

function hideInitialElements() {
	try {
		const app = document.getElementById('app');
		const headerElement = document.getElementById('header');
		const mindmap = document.getElementById('mindmap');
		const toolbar = document.querySelector('.mm-toolbar');

		if (headerElement) {
			headerElement.classList.remove('active');
			headerElement.classList.add('header-hidden');
		}
		if (app) app.style.display = 'none';
		if (mindmap) mindmap.style.display = 'block';
		if (toolbar) toolbar.style.display = 'flex';
	} catch (e) {
		console.warn('hideInitialElements failed:', e);
	}
}

function showMindMapElements() {
	const mindmapElement = document.getElementById('mindmap');
	const buttonContainer = document.getElementById('button-container');
	const undoRedoContainer = document.getElementById('undo-redo-container');
	const zoomControls = document.getElementById('zoom-controls');

	if (mindmapElement) {
		mindmapElement.style.display = 'block';
	}

	if (buttonContainer) {
		buttonContainer.style.display = 'block';
	}

	if (undoRedoContainer) {
		undoRedoContainer.style.display = 'flex';
	}

	if (zoomControls) {
		zoomControls.classList.add('show');
	}

	if (window.innerWidth < 770) {
		closeLeftSidebar();
	}
	closeNotesDrawer();
}

window.__mmwResetSvgContainer = function (hard = false) {
	try {
		const mindmap = document.getElementById('mindmap');
		const svgOut = document.getElementById('svg-output');
		if (svgOut && svgOut.parentNode) {
			if (hard) {
				const fresh = svgOut.cloneNode(false);
				fresh.id = 'svg-output';
				svgOut.parentNode.replaceChild(fresh, svgOut);
			} else {
				svgOut.innerHTML = '';
			}
		} else if (mindmap) {
			const oldSvgs = mindmap.querySelectorAll('svg');
			oldSvgs.forEach(n => n.remove());
		}
	} catch (e) {
		console.warn('SVG reset failed:', e);
	}
};


function loadMindMapById(id) {
	if (!id) {
		console.error('No mind map ID provided');
		showErrorMessage('No mind map ID provided');
		return;
	}

	const selectedItem = document.querySelector(`.mindmap-item[data-id="${id}"]`);
	if (selectedItem) {
		selectedItem.classList.add('active');
	}
	if (window.innerWidth < 770) {
		closeLeftSidebar();
	}

	const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
	const stringId = String(id);

	let mindMap = history.find((item) => String(item.id) === stringId);

	if (!mindMap) {
		const playgroundData = localStorage.getItem('mindmap-playground');

		if (playgroundData) {
			try {
				const playground = JSON.parse(playgroundData);

				if (playground && typeof playground === 'object' && String(playground.id) === stringId) {
					mindMap = playground;
				}
			} catch (parseError) {
				console.error('Error parsing playground data:', parseError);
			}
		}

		if (!mindMap) {
			showHeader();
			return
		}
	}

	updateUrlWithId(stringId);
	hideInitialElements();
	showMindmapElements();
	closeNotesDrawer();
    resetMindMapHistory();

	if (typeof window.__mmwResetSvgContainer === 'function') { window.__mmwResetSvgContainer(); }

	let mmjsonStr = '';
	let markdown = '';

	if (mindMap.mindmap) {
		mmjsonStr = typeof mindMap.mindmap === 'string' ? mindMap.mindmap : JSON.stringify(mindMap.mindmap);
	} else if (mindMap.mmjson) {
		mmjsonStr = typeof mindMap.mmjson === 'string' ? mindMap.mmjson : JSON.stringify(mindMap.mmjson);
	} else if (mindMap.markdown) {
		markdown = String(mindMap.markdown);
	}
	if (mmjsonStr) {
		currentMarkdown = mmjsonStr;
		try {
			const o = JSON.parse(mmjsonStr);
			const r = o['mm-node'] || o.mmNode || o;
			const t = String(r?.content || '').trim();
			currentMindmapTitle = t.replace(/\*|~~/g, '') || 'Mind Map';
		} catch {
			currentMindmapTitle = 'Mind Map';
		}
		renderMindmap(mmjsonStr);
		currentMindmap = mindMap;
		document.title = `${currentMindmapTitle} - Mind Map Wizard`;
	} else if (markdown) {
		try {
			let derivedTitle = 'Mind Map';
			const m = markdown.match(/^#{1,6}\s+(.*)$/m);
			if (m) {
				derivedTitle = m[1].trim().replace(/\*|~~/g, '');
			}
			currentMindmapTitle = derivedTitle;
		} catch {
			const rawTopic = mindMap.topic || 'Mind Map';
			currentMindmapTitle = rawTopic.replace(/\*|~~/g, '');
		}
		renderMindmap(markdown);
		document.title = `${currentMindmapTitle} - Mind Map Wizard`;
	} else {
		console.error('Mind map has no content');
		showErrorMessage('The mind map content is empty or corrupted.');
		return;
	}

	const navLinks = document.querySelector('.nav-links');
	if (navLinks) {
		navLinks.classList.add('padding-right');
	}

	hideHeader();
	generationInProgress = false;
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
                <button onclick="showHeader()" style="margin-top: 20px; padding: 8px 25px; background: var(--text-color); color: var(--white); border: none; border-radius: 40px; cursor: pointer; font-size: 0.9rem; font-family: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "Avenir", "Montserrat", "Corbel", "URW Gothic", "Source Sans Pro", sans-serif;">Close</button>
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
	if (playground) {
		const duplicateById = history.some((item) => String(item.id) === String(playground.id));
		const pgMindmapStr = (typeof playground.mindmap === 'string' ? playground.mindmap : '').trim();
		const duplicateByContent = pgMindmapStr
			? history.some((item) => (typeof item.mindmap === 'string' ? item.mindmap : '').trim() === pgMindmapStr)
			: false;
		if (!duplicateById && !duplicateByContent) {
			allMindmaps.push(playground);
		}
	}

	const sampleMarkdown = "# Mind Map\n\n## Branch\n## Branch";

	const filteredMindmaps = allMindmaps.filter(item => item.markdown !== sampleMarkdown);

	if (filteredMindmaps.length === 0) {
		list.innerHTML = `
		<div class="no-mindmaps">
			<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--dark-grey)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
				<path d="M2 10h20"/>
			</svg>
			<h3>No mind maps yet</h3>
		</div>
        `;
		return;
	}

	const sortedMindmaps = filteredMindmaps.sort((a, b) => {
		const dateA = new Date(a.timestamp);
		const dateB = new Date(b.timestamp);
		return dateB - dateA;
	});

	const deriveTopic = (entry) => {
		try {
			const s = entry.mindmap || entry.mmjson || '';
			if (s && typeof s === 'string' && s.trim().startsWith('{')) {
				const obj = JSON.parse(s);
				const root = obj['mm-node'] || obj.mmNode || obj;
				const t = String(root?.content || '').trim();
				return t.replace(/\*|~~/g, '') || 'Mind Map';
			}

			if (entry.markdown) {
				const m = String(entry.markdown).match(/^#{1,6}\s+(.*)$/m);
				if (m) {
					return m[1].trim().replace(/\*|~~/g, '');
				}
			}
		} catch { }
		return 'Mind Map';
	};

	list.innerHTML = sortedMindmaps
		.map(
			(item) => {
				const title = deriveTopic(item);
				return `
        <div class="mindmap-item" data-id="${item.id}">
            <div class="mindmap-info">
                <div class="mindmap-title">${escapeHtmlLeftSidebar(title)}</div>
                <div class="mindmap-date">${formatDateLeftSidebar(item.timestamp)}</div>
            </div>
            <div class="mindmap-actions">
                <div class="fade-overlay"></div>
                <button class="delete-btn" onclick="deleteMindmap('${item.id}')" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            </div>
        </div>
        `;
			}
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

	resetMindMapHistory();

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
			showHeader();

			const url = new URL(window.location.href);
			url.searchParams.delete('id');
			window.history.pushState({ path: url.href }, '', url.href);
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
	const renameCancelBtn = document.getElementById('renameCancelBtn');
	const deleteCancelBtn = document.getElementById('deleteCancelBtn');
	const popupOverlay = document.getElementById('popupOverlay');

	if (renamePopupClose) renamePopupClose.addEventListener('click', closeRenamePopup);
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
window.shareMindmap = shareMindmap;
window.clearHistory = clearHistory;

async function shareMindmap() {
	if (document.querySelector('.share-dialog')) {
		return;
	}

	const shareButton = document.querySelector('.share-button');
	if (shareButton) {
		shareButton.disabled = true;
		shareButton.style.opacity = '0.5';
	}

	const shareOverlay = document.createElement('div');
	shareOverlay.className = 'share-overlay';

	const dialog = document.createElement('div');
	dialog.className = 'share-dialog';
	dialog.innerHTML = `
		  <h3>Share Mind Map</h3>
		  <p>Generating share link...</p>
		  <div class="loading-spinner"></div>
	  `;

	document.body.appendChild(shareOverlay);
	document.body.appendChild(dialog);

	setTimeout(() => {
		shareOverlay.classList.add('show');
		dialog.classList.add('show');
	}, 10);

	window.closeShareDialog = function () {
		shareOverlay.classList.remove('show');
		dialog.classList.remove('show');

		setTimeout(() => {
			if (shareOverlay.parentNode) {
				document.body.removeChild(shareOverlay);
			}
			if (dialog.parentNode) {
				document.body.removeChild(dialog);
			}
			if (shareButton) {
				shareButton.disabled = false;
				shareButton.style.opacity = '1';
			}
		}, 300);
	}

	window.copyShareLink = function () {
		const input = document.querySelector('.share-link');
		if (input) {
			input.select();
			input.setSelectionRange(0, 99999);
			navigator.clipboard.writeText(input.value);

			const copyButton = document.querySelector('.dialog-button.confirm');
			if (copyButton) {
				copyButton.textContent = 'Copied!';
				setTimeout(() => { copyButton.textContent = 'Copy Link'; }, 2000);
			}
		}
	}


	shareOverlay.addEventListener('click', window.closeShareDialog);

	function loadQRCodeLibrary() {
		return new Promise((resolve, reject) => {
			if (typeof QRCode !== 'undefined') {
				resolve();
				return;
			}

			const existingScript = document.querySelector('script[src="/scripts/libraries/qrcode.min.js"]');
			if (existingScript) {
				existingScript.onload = resolve;
				existingScript.onerror = reject;
				return;
			}

			const script = document.createElement('script');
			script.src = '/scripts/libraries/qrcode.min.js';
			script.onload = resolve;
			script.onerror = () => reject(new Error('Failed to load QR code library'));
			document.head.appendChild(script);
		});
	}

	try {
		updateCurrentMindmap();
		const topic = currentMindmap.topic || currentMindmapTitle || 'Mind Map';
		let mmjsonStr = '';
		try {
			if (typeof window.currentMarkdown === 'string' && window.currentMarkdown.trim().startsWith('{')) {
				mmjsonStr = window.currentMarkdown;
			}
		} catch { }
		if (!mmjsonStr) {
			try {
				const stored = localStorage.getItem('json-mindmap-content') || '';
				if (stored.trim().startsWith('{')) mmjsonStr = stored;
			} catch { }
		}
		if (!mmjsonStr || !mmjsonStr.trim()) {
			throw new Error('No JSON mind map available to share');
		}
		let mmjsonPayload;
		try {
			mmjsonPayload = JSON.parse(mmjsonStr);
		} catch {
			mmjsonPayload = mmjsonStr;
		}


		let headers = {
			'Content-Type': 'application/json',
		};

		if (typeof Clerk !== 'undefined' && Clerk.session && Clerk.session.id) {
			try {
				const token = await Clerk.session.getToken();
				if (token) {
					headers['Authorization'] = `Bearer ${token}`;
				} else {
				}
			} catch (authError) {
				console.warn(
					'Error retrieving Clerk token, proceeding without authentication.',
					authError,
				);
			}
		} else {
		}


		const response = await fetch('https://share.mindmapwizard.com/', {
			method: 'POST',
			headers: headers,
			body: JSON.stringify({
				mmjson: mmjsonPayload
			}),
		});
		if (!response.ok) {
			let errorData = {
				message: `Failed to share mindmap. Status: ${response.status}`,
			};
			try {
				errorData = await response.json();
			} catch (e) {
				console.error('Failed to parse error response JSON:', e);
			}
			throw new Error(
				errorData.message || `Failed to share mindmap. Status: ${response.status}`,
			);
		}

		const data = await response.json();

		const shareUrl = `https://mindmapwizard.com/view.html?id=${data.id}`;

		dialog.innerHTML = `
			  <div id="dialog-qr-code-container" style="margin: 20px auto; width: 144px; height: 144px;" class="qr-code-container"></div>
			  <hr style="border: 1px solid; border-color: var(--light-grey); border-radius: 5px; margin: 10px 0 10px 0;" class="qr-code-container-hr">
			  <h3>Share Mind Map</h3>
			  <p>Scan the qr code or copy this link to share your mind map.</p>
			  <input type="text" class="share-link" value="${shareUrl}" readonly>
			  <div class="dialog-buttons">
				  <button class="dialog-button cancel" onclick="closeShareDialog()">Close</button>
				  <button class="dialog-button confirm" onclick="copyShareLink()">Copy Link</button>
			  </div>
		  `;

		const qrCodeContainerInDialog = dialog.querySelector(
			'#dialog-qr-code-container',
		);

		if (qrCodeContainerInDialog) {
			try {
				await loadQRCodeLibrary();

				new QRCode(qrCodeContainerInDialog, {
					text: shareUrl,
					width: 128,
					height: 128,
					colorDark: '#000000',
					colorLight: '#ffffff',
					correctLevel: QRCode.CorrectLevel.H,
				});
			} catch (qrError) {
				console.error('Error loading QR code library or generating QR code:', qrError);
				qrCodeContainerInDialog.innerHTML = '<p style="color: red; text-align: center; font-size: 12px;">QR code unavailable</p>';
			}
		} else {
			console.error(
				"QR code container '#dialog-qr-code-container' not found in dialog.",
			);
			dialog.innerHTML +=
				'<p style="color: red; text-align: center;">Error: Could not display QR code.</p>';
		}
	} catch (error) {
		console.error('Error sharing mindmap:', error);
		dialog.innerHTML = `
			  <h3>Share Mindmap</h3>
			  <p style="color: red;">${error.message || 'Failed to share mindmap. Please try again.'}</p>
			  <div class="dialog-buttons">
				  <button class="dialog-button cancel" onclick="closeShareDialog()">Close</button>
			  </div>
		  `;

	} finally {
		if (shareButton) {
			shareButton.disabled = false;
			shareButton.style.opacity = '1';
		}
	}
}

const texts = [
	'Generate Mind Maps with AI',
	'Generate Mind Maps with AI',
	'Generate Mind Maps with AI',
	'Generate Mind Maps with AI',
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


function highlightMatch(text, term) {
	if (!term || !text) return escapeHtmlLeftSidebar(text || "");
	const termRegex = term.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
	const regex = new RegExp(`(${termRegex})`, 'gi');
	return text.split(regex).map(part =>
		regex.test(part) ? `<mark class="search-highlight">${escapeHtmlLeftSidebar(part)}</mark>` : escapeHtmlLeftSidebar(part)
	).join('');
}

function getSearchableMarkdown(item) {
	let content = item.markdown || item.mindmap || item.mmjson || "";
	if (content && typeof content === 'string' && content.trim().startsWith('{')) {
		try {
			return window.mmJsonToMarkdown(content);
		} catch (e) {
			console.warn('Failed to convert JSON to Markdown for search', e);
		}
	}
	return content;
}

function getContentSnippet(markdown, term) {
	if (!term || !markdown) return "";
	const lines = markdown.split(/\r?\n/);
	const lowerTerm = term.toLowerCase();

	for (let line of lines) {
		const trimmedLine = line.trim();
		if (!trimmedLine) continue;
		if (trimmedLine.toLowerCase().includes(lowerTerm)) {
			return trimmedLine
				.replace(/^#+\s*/, "")
				.replace(/^[-*+]\s+/, "")
				.replace(/^\d+\.\s+/, "")
				.trim();
		}
	}
	return "";
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

	const deriveTopic = (entry) => {
		try {
			const s = entry.mindmap || entry.mmjson || '';
			if (s && typeof s === 'string' && s.trim().startsWith('{')) {
				const obj = JSON.parse(s);
				const root = obj['mm-node'] || obj.mmNode || obj;
				const t = String(root?.content || '').trim();
				return t || 'Mind Map';
			}
			if (entry.markdown) {
				const m = String(entry.markdown).match(/^#{1,6}\s+(.*)$/m);
				if (m) return m[1].trim();
			}
		} catch { }
		return 'Mind Map';
	};

	const searchTerm = searchInput?.value.trim() || "";

	resultsList.innerHTML = mindmapsToDisplay
		.map(
			(item) => {
				const markdown = getSearchableMarkdown(item);
				const title = deriveTopic(item);
				const highlightedTitle = highlightMatch(title, searchTerm);
				const snippet = getContentSnippet(markdown, searchTerm);

				const showSnippet = searchTerm && snippet && !title.toLowerCase().includes(searchTerm.toLowerCase());

				return `
        <div class="mindmap-item" data-id="${item.id}">
            <div class="mindmap-info">
                <div class="mindmap-title">${highlightedTitle}</div>
                ${showSnippet ? `<div class="search-content-snippet">${highlightMatch(snippet, searchTerm)}</div>` : ''}
                <div class="mindmap-date">${formatDateLeftSidebar(item.timestamp)}</div>
            </div>
        </div>
        `;
			}
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

	const deriveTopic = (entry) => {
		try {
			const s = entry.mindmap || entry.mmjson || '';
			if (s && typeof s === 'string' && s.trim().startsWith('{')) {
				const obj = JSON.parse(s);
				const root = obj['mm-node'] || obj.mmNode || obj;
				const t = String(root?.content || '').trim();
				return t || 'Mind Map';
			}
			if (entry.markdown) {
				const m = String(entry.markdown).match(/^#{1,6}\s+(.*)$/m);
				if (m) return m[1].trim();
			}
		} catch { }
		return 'Mind Map';
	};

	const filteredMindmaps = lowerCaseSearchTerm ?
		allMindmapHistory.filter((item) => {
			const markdown = getSearchableMarkdown(item);
			const title = deriveTopic(item).toLowerCase();
			return title.includes(lowerCaseSearchTerm) || markdown.toLowerCase().includes(lowerCaseSearchTerm);
		}) :
		allMindmapHistory;

	renderSearchMindmapResults(filteredMindmaps);
}


function openMindmapFromSearchPopup(id) {
	closeSearchMindmapsPopup();
	openMindmapLeftSidebar(id);
}

function saveMindmapToHistory(mindmapJsonStr, idOverride = null) {
	const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
	const timestamp = new Date().toISOString();
	const newId = idOverride || Date.now();

	history.push({
		mindmap: mindmapJsonStr,
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

	return newId;
}

window.openSearchMindmapsPopup = openSearchMindmapsPopup;
window.closeSearchMindmapsPopup = closeSearchMindmapsPopup;
window.openMindmapFromSearchPopup = openMindmapFromSearchPopup;

window.fitMindmapSvg = function () {
	try {
		const svg = document.querySelector('#svg-output > svg') || document.getElementById('mindmap')?.querySelector('svg');
		if (!svg) return;

		svg.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

		svg.style.transformOrigin = '0 0';
		svg.style.transform = 'scale(1) translate(0px, 0px)';

		setTimeout(() => {
			svg.style.transition = '';
		}, 500);
	} catch (e) {
		console.warn('Failed to reset SVG transform:', e);
	}
};


function initializeDownloadFeatures() {
	if (window.downloadFeaturesInitialized) return;
	window.downloadFeaturesInitialized = true;

	const downloadBtn = document.getElementById('download-mindmap-btn');
	const popup = document.getElementById('download-options-popup');
	const closeBtn = document.getElementById('close-download-options-popup');
	const formatSelect = document.getElementById('download-format');
	const downloadFormatBtn = document.getElementById('download-btn');

	if (!downloadBtn || !popup) return;

	downloadBtn.addEventListener('click', function () {
		popup.style.display = 'flex';
		popup.classList.add('show');
	});

	closeBtn?.addEventListener('click', function () {
		popup.classList.remove('show');
		setTimeout(() => {
			popup.style.display = 'none';
		}, 300);
	});

	popup.addEventListener('click', function (event) {
		if (event.target === popup) {
			popup.classList.remove('show');
			setTimeout(() => {
				popup.style.display = 'none';
			}, 300);
		}
	});

	downloadFormatBtn?.addEventListener('click', function () {
		const format = formatSelect?.value || 'jpg';
		downloadMindmap(format);
		popup.classList.remove('show');
		setTimeout(() => {
			popup.style.display = 'none';
		}, 300);
	});

	document.getElementById('print-btn')?.addEventListener('click', function () {
		printMindmap();
		popup.classList.remove('show');
		setTimeout(() => {
			popup.style.display = 'none';
		}, 300);
	});
}

function initializeHelpPopup() {
	const helpBtn = document.getElementById('help-btn');
	const helpPopup = document.getElementById('help-popup');
	const closeHelpBtn = document.getElementById('close-help-popup');
	const closeHelpBtnAction = document.getElementById('close-help-btn-action');

	if (!helpBtn || !helpPopup) return;

	const openPopup = () => {
		helpPopup.style.display = 'flex';
		setTimeout(() => {
			helpPopup.classList.add('show');
		}, 10);
	};

	helpBtn.addEventListener('click', openPopup);

	const closePopup = () => {
		helpPopup.classList.remove('show');
		setTimeout(() => {
			helpPopup.style.display = 'none';
		}, 300);

		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('show')) {
			urlParams.delete('show');
			const newUrl = urlParams.toString()
				? `${window.location.pathname}?${urlParams.toString()}`
				: window.location.pathname;
			window.history.replaceState({}, '', newUrl);
		}
	};

	closeHelpBtn?.addEventListener('click', closePopup);
	closeHelpBtnAction?.addEventListener('click', closePopup);

	helpPopup.addEventListener('click', function (event) {
		if (event.target === helpPopup) {
			closePopup();
		}
	});

	const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.has('show') && urlParams.get('show') === 'helppopup') {
		openPopup();
	}
}

document.getElementById('mm-fit')?.addEventListener('click', function (e) {
	e.preventDefault();
	e.stopPropagation();
	try {
		if (typeof window.fitMindmapSvg === 'function') {
			window.fitMindmapSvg();
		} else {
			const btn = document.getElementById('fit-screen-btn');
			if (btn) btn.click();
		}
	} catch (err) {
		console.warn('Fit-to-screen failed:', err);
	}
});

const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomControls = document.getElementById('zoom-controls');

if (zoomInBtn && zoomOutBtn) {
	zoomInBtn.addEventListener('click', function (e) {
		e.preventDefault();
		e.stopPropagation();
		if (window.zoomMindMap) {
			const svg = preview.querySelector('svg');
			if (!svg) return;
			closeContextMenus();

			svg.style.transition = 'transform 0.3s ease';

			window.zoomMindMap(1.2);

			setTimeout(() => {
				svg.style.transition = '';
			}, 500);
		}
	});

	zoomOutBtn.addEventListener('click', function (e) {
		e.preventDefault();
		e.stopPropagation();
		if (window.zoomMindMap) {
			const svg = preview.querySelector('svg');
			if (!svg) return;
			closeContextMenus();

			svg.style.transition = 'transform 0.3s ease';

			window.zoomMindMap(0.8);

			setTimeout(() => {
				svg.style.transition = '';
			}, 500);
		}
	});
}

function updateZoomControlsVisibility() {
	const mindmapContainer = document.getElementById('mindmap');
	const svg = mindmapContainer?.querySelector('svg');
	if (zoomControls) {
		if (svg && mindmapContainer.children.length > 0) {
			zoomControls.classList.add('show');
		} else {
			zoomControls.classList.remove('show');
		}
	}
}

window.updateZoomControlsVisibility = updateZoomControlsVisibility;



function printMindmap() {
	try {
		const mindmapContainer = document.getElementById('mindmap');
		const svg = mindmapContainer?.querySelector('svg');

		if (!svg) {
			throw new Error('No mind map available to print.');
		}

		const printWindow = window.open('', '_blank', 'width=800,height=600');
		if (!printWindow) {
			throw new Error('Failed to open print window. Please allow popups for this site.');
		}

		const bbox = svg.getBBox();
		const padding = 40;
		const width = bbox.width + padding * 2;
		const height = bbox.height + padding * 2;

		const svgCopy = svg.cloneNode(true);
		svgCopy.setAttribute('width', width);
		svgCopy.setAttribute('height', height);
		svgCopy.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);

		const printContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>${currentMindmapTitle || 'Mind Map'} - Print</title>
				<style>
					@media print {
						@page {
							size: auto;
						}
						body {
							margin: 0;
						}
						.print-container {
							width: 100%;
							max-width: none !important;
							height: auto;
							display: flex;
							justify-content: center;
							align-items: center;
						}
						.mindmap-svg {
							max-width: 100%;
							height: auto;
							page-break-inside: avoid;
						}
					}
					body {
						margin: 0;
						padding: 10px;
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					}
					.print-container {
						width: 100%;
						display: flex;
						justify-content: center;
						align-items: center;
					}
					.mindmap-svg {
						max-width: 100%;
						height: auto;
					}
				</style>
			</head>
			<body>
				<div class="print-container">
					<div class="mindmap-svg">
						${new XMLSerializer().serializeToString(svgCopy)}
					</div>
				</div>
			</body>
			</html>
		`;

		printWindow.document.write(printContent);
		printWindow.document.close();

		printWindow.onload = function () {
			printWindow.focus();
			printWindow.print();

			printWindow.onafterprint = function () {
				printWindow.close();
			};
		};


	} catch (error) {
		console.error('Print error:', error);
		alert('Error preparing mind map for printing: ' + error.message);
	}
}

function trackEvent(eventName, params = {}) {
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

	async regenerateSVGForDownload() {
		const jsonStr = window.currentMarkdown;
		if (!jsonStr || typeof jsonStr !== 'string') {
			window.location.reload();
			return; 
		}

		let dataObj;
		try {
			dataObj = JSON.parse(jsonStr);
		} catch {
			throw new Error('Invalid mind map data.');
		}

		if (!dataObj['mm-settings']) {
			dataObj['mm-settings'] = {};
		}

		dataObj['mm-settings']['font-family'] = 'system-ui';

		const modifiedJsonStr = JSON.stringify(dataObj);
		if (typeof window.__mmwInitEngine === 'function') {
			await window.__mmwInitEngine();
		}

		if (typeof window.generateSVG !== 'function') {
			throw new Error('Rendering engine not available. Please ensure the mind map is loaded first.');
		}

		const svgString = window.generateSVG(modifiedJsonStr);

		const parser = new DOMParser();
		const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
		const svgElement = svgDoc.documentElement;

		return svgElement;
	},

	getSVGData(svg, padding = 24, forceSystemFont = false) {
		const svgCopy = svg.cloneNode(true);
		try {
			if (svgCopy.style) {
				svgCopy.style.removeProperty('transform');
				svgCopy.style.removeProperty('transform-origin');
			}
		} catch { }

		let baseW = 0;
		let baseH = 0;
		const viewBox = svg.getAttribute('viewBox');
		if (viewBox) {
			const vb = viewBox.split(/\s+|,/).map(Number);
			if (vb.length === 4 && isFinite(vb[2]) && isFinite(vb[3])) {
				baseW = vb[2];
				baseH = vb[3];
			}
		}
		if (!(baseW > 0 && baseH > 0)) {
			baseW = parseFloat(svg.getAttribute('width')) || svg.clientWidth || 0;
			baseH = parseFloat(svg.getAttribute('height')) || svg.clientHeight || 0;
		}

		baseW = Math.max(1, Math.round(baseW));
		baseH = Math.max(1, Math.round(baseH));

		const outW = baseW + padding * 2;
		const outH = baseH + padding * 2;

		svgCopy.removeAttribute('width');
		svgCopy.removeAttribute('height');
		svgCopy.setAttribute('viewBox', `${-padding} ${-padding} ${baseW + padding * 2} ${baseH + padding * 2}`);
		svgCopy.style.fontFamily = 'system-ui';

		if (forceSystemFont) {
			const allText = svgCopy.querySelectorAll('text, tspan');
			allText.forEach(t => {
				t.style.fontFamily = 'system-ui';
				t.setAttribute('font-family', 'system-ui');
			});
		}

		const svgContent = new XMLSerializer().serializeToString(svgCopy);
		return { svgContent, width: outW, height: outH };
	},

	async loadWatermarkSVG() {
		try {
			const response = await fetch('/img/mmw-watermark.svg');
			if (!response.ok) {
				throw new Error('Failed to load watermark');
			}
			return await response.text();
		} catch (error) {
			console.warn('Could not load watermark:', error);
			return null;
		}
	},

	addWatermarkToSVG(svgContent, watermarkSVG, width, height) {
		if (!watermarkSVG) return svgContent;

		const parser = new DOMParser();
		const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
		const watermarkDoc = parser.parseFromString(watermarkSVG, 'image/svg+xml');

		const mainSvg = svgDoc.documentElement;
		const watermarkElem = watermarkDoc.documentElement;

		const viewBox = mainSvg.getAttribute('viewBox');
		let viewBoxValues = [0, 0, width, height];
		if (viewBox) {
			viewBoxValues = viewBox.split(/\s+|,/).map(Number);
		}
		const [viewX, viewY, viewWidth, viewHeight] = viewBoxValues;

		const wViewBoxAttr = watermarkElem.getAttribute('viewBox');
		let wW, wH;
		let wViewBoxStr = wViewBoxAttr;

		if (wViewBoxAttr) {
			const wViewBox = wViewBoxAttr.split(/\s+|,/).map(Number);
			wW = wViewBox[2];
			wH = wViewBox[3];
		} else {
			wW = parseFloat(watermarkElem.getAttribute('width')) || 100;
			wH = parseFloat(watermarkElem.getAttribute('height')) || 100;
			wViewBoxStr = `0 0 ${wW} ${wH}`;
		}

		const minDimension = Math.min(viewWidth, viewHeight);
		let targetWidth = minDimension * 0.2;

		targetWidth = Math.max(200, Math.min(viewWidth * 0.1, targetWidth));

		const aspectRatio = wW / wH;
		const targetHeight = targetWidth / aspectRatio;

		const padding = 10;

		const nestedSvg = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'svg');

		if (wViewBoxStr) nestedSvg.setAttribute('viewBox', wViewBoxStr);

		const xPos = viewX + padding;
		const yPos = (viewY + viewHeight) - targetHeight - padding;

		nestedSvg.setAttribute('x', xPos);
		nestedSvg.setAttribute('y', yPos);
		nestedSvg.setAttribute('width', targetWidth);
		nestedSvg.setAttribute('height', targetHeight);
		nestedSvg.setAttribute('opacity', '0.8');

		Array.from(watermarkElem.children).forEach(child => {
			nestedSvg.appendChild(child.cloneNode(true));
		});

		mainSvg.appendChild(nestedSvg);

		return new XMLSerializer().serializeToString(mainSvg);
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
		let content = typeof currentMarkdown === 'string' ? currentMarkdown : '';
		if (content.trim().startsWith('{')) {
			try {
				const obj = JSON.parse(content);
				const root = obj['mm-node'] || obj.mmNode || obj;
				const lines = [];
				const maxHeading = 6;
				(function walk(node, level) {
					if (!node || typeof node !== 'object') return;
					const text = String(node.content ?? '').trim();
					if (text) {
						if (level <= maxHeading) {
							lines.push(`${'#'.repeat(level)} ${text}`.trim());
						} else {
							lines.push(`- ${text}`.trim());
						}
					}
					if (Array.isArray(node.children)) {
						for (const child of node.children) walk(child, level + 1);
					}
				})(root, 1);
				content = lines.join('\n');
			} catch { }
		}
		const blob = new Blob([content], { type: 'text/markdown' });
		this.triggerDownload(blob, `${topic}.md`);
	},

	async downloadSVG(svgContent, width, height, topic) {
		const watermarkSVG = await this.loadWatermarkSVG();
		const watermarkedSVG = this.addWatermarkToSVG(svgContent, watermarkSVG, width, height);

		const blob = new Blob([watermarkedSVG], {
			type: 'image/svg+xml;charset=utf-8'
		});
		this.triggerDownload(blob, `${topic}.svg`);
	},

	async downloadPDF(svgContent, width, height, topic) {
		const watermarkSVG = await this.loadWatermarkSVG();
		const watermarkedSVG = this.addWatermarkToSVG(svgContent, watermarkSVG, width, height);

		const container = document.createElement('div');
		container.innerHTML = watermarkedSVG;
		const svgEl = container.firstElementChild;
		const svgData = new XMLSerializer().serializeToString(svgEl);

		const img = new Image();
		img.crossOrigin = 'Anonymous';

		img.onload = () => {
			const pdf = new jsPDF({
				orientation: width > height ? 'landscape' : 'portrait',
				unit: 'pt',
				format: 'letter',
			});

			const pdfW = pdf.internal.pageSize.getWidth();
			const pdfH = pdf.internal.pageSize.getHeight();

			const margin = 36;
			const maxW = pdfW - margin * 2;
			const maxH = pdfH - margin * 2;
			const aspect = width / height;

			let renderW = maxW;
			let renderH = renderW / aspect;
			if (renderH > maxH) {
				renderH = maxH;
				renderW = renderH * aspect;
			}

			const targetPxW = Math.min(Math.round(renderW) * 2, 4000);
			const scale = targetPxW / width;
			const targetPxH = Math.max(1, Math.round(height * scale));

			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, targetPxW);
			canvas.height = targetPxH;
			const ctx = canvas.getContext('2d');

			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			const x = (pdfW - renderW) / 2;
			const y = (pdfH - renderH) / 2;

			pdf.addImage(
				canvas.toDataURL('image/jpeg', 0.92),
				'JPEG',
				x,
				y,
				renderW,
				renderH
			);

			pdf.save(`${topic}.pdf`);
			canvas.remove();

			trackEvent('mm_downloaded', {
				download_format: 'pdf',
				watermark_inserted: 'false'
			});
		};

		img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
	},

	async downloadJPG(svg, topic) {
		const { svgContent, width, height } = this.getSVGData(svg, 24, true);

		const watermarkSVG = await this.loadWatermarkSVG();
		const watermarkedSVG = this.addWatermarkToSVG(svgContent, watermarkSVG, width, height);

		const tempSvg = document.createElement('div');
		tempSvg.innerHTML = watermarkedSVG;
		const svgElement = tempSvg.firstElementChild;
		const svgData = new XMLSerializer().serializeToString(svgElement);

		const img = new Image();
		img.crossOrigin = 'Anonymous';

		img.onload = () => {
			const maxSide = 3000;
			const aspect = width / height;
			let outW = width;
			let outH = height;
			if (Math.max(width, height) > maxSide) {
				if (width >= height) {
					outW = maxSide;
					outH = Math.round(maxSide / aspect);
				} else {
					outH = maxSide;
					outW = Math.round(maxSide * aspect);
				}
			}

			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, outW);
			canvas.height = Math.max(1, outH);
			const ctx = canvas.getContext('2d');

			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			this.triggerDownload(
				this.dataURLToBlob(canvas.toDataURL('image/jpeg', 0.92)),
				`${topic}.jpg`,
			);
			canvas.remove();
		};

		img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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
			topic
		} = DownloadHandler.getMindmapElements();


		if (format === 'markdown') {
			DownloadHandler.downloadMarkdown(topic);
			return;
		}


		const svgWithSystemFont = await DownloadHandler.regenerateSVGForDownload();

		const {
			svgContent,
			width,
			height
		} = DownloadHandler.getSVGData(svgWithSystemFont, 24, true);

		switch (format) {
			case 'svg':
				await DownloadHandler.downloadSVG(svgContent, width, height, topic);
				break;
			case 'pdf':
				await DownloadHandler.downloadPDF(svgContent, width, height, topic);
				break;
			case 'jpg':
				await DownloadHandler.downloadJPG(svgWithSystemFont, topic);
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

		const svgWithSystemFont = await DownloadHandler.regenerateSVGForDownload();

		const { svgContent, width, height } = DownloadHandler.getSVGData(svgWithSystemFont, 24, true);

		const watermarkSVG = await DownloadHandler.loadWatermarkSVG();
		const watermarkedSVG = DownloadHandler.addWatermarkToSVG(svgContent, watermarkSVG, width, height);

		const img = new Image();
		img.crossOrigin = 'Anonymous';
		img.onload = function () {
			const maxSide = 3000;
			const aspect = width / height;
			let outW = width;
			let outH = height;
			if (Math.max(width, height) > maxSide) {
				if (width >= height) {
					outW = maxSide;
					outH = Math.round(maxSide / aspect);
				} else {
					outH = maxSide;
					outW = Math.round(maxSide * aspect);
				}
			}

			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, outW);
			canvas.height = Math.max(1, outH);

			const ctx = canvas.getContext('2d');

			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			const url = canvas.toDataURL('image/png');
			const a = document.createElement('a');
			a.href = url;
			a.download = 'mindmap.png';
			a.click();

			trackEvent('mm_downloaded', {
				download_format: format,
				watermark_inserted: 'false'
			});
		};

		const svgBase64 = btoa(unescape(encodeURIComponent(watermarkedSVG)));
		img.src = `data:image/svg+xml;base64,${svgBase64}`;

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
		const existingHistoryJSON = localStorage.getItem(historyKey);

		if (existingHistoryJSON) {
			let history = [];
			try { history = JSON.parse(existingHistoryJSON) || []; } catch { history = []; }
			let changed = false;

			const md2json = (md, fallbackTitle = 'Mind Map') => {
				try {
					const lines = String(md || '').split(/\r?\n/);
					let rootContent = fallbackTitle;
					let firstHeadingIndex = -1;
					for (let i = 0; i < lines.length; i++) {
						const m = lines[i].trim().match(/^(#{1,6})\s+(.*)$/);
						if (m) { rootContent = m[2].trim(); firstHeadingIndex = i; break; }
					}
					const root = { content: rootContent, children: [] };
					const stack = [{ level: 1, node: root }];

					lines.forEach((raw, index) => {
						const line = raw.trim();
						if (!line) return;
						if (index === firstHeadingIndex) return;

						const hm = line.match(/^(#{1,6})\s+(.*)$/);
						if (hm) {
							const lvl = hm[1].length;
							const text = hm[2].trim();
							const node = { content: text, children: [] };
							while (stack.length && stack[stack.length - 1].level >= lvl) stack.pop();
							const parent = stack[stack.length - 1]?.node || root;
							parent.children.push(node);
							stack.push({ level: lvl, node });
							return;
						}
						const bm = line.match(/^[-*+]\s+(.*)$/);
						if (bm) {
							const text = bm[1].trim();
							const node = { content: text, children: [] };
							const parent = stack[stack.length - 1]?.node || root;
							parent.children.push(node);
							stack.push({ level: stack[stack.length - 1].level, node, isBullet: true });
							return;
						}
						const node = { content: line, children: [] };
						const parent = stack[stack.length - 1]?.node || root;
						parent.children.push(node);
					});

					return JSON.stringify({
						"mm-settings": { "spacing": 30, "mm-link-width": 4, "border-radius": 4 },
						"mm-node": root
					}, null, 2);
				} catch {
					return JSON.stringify({
						"mm-settings": { "spacing": 30, "mm-link-width": 4, "border-radius": 4 },
						"mm-node": { "content": fallbackTitle, "children": [] }
					}, null, 2);
				}
			};

			const migrated = history.map((it) => {
				let mindmapStr = null;
				if (it && typeof it === 'object') {
					if (it.mindmap) {
						mindmapStr = typeof it.mindmap === 'string' ? it.mindmap : JSON.stringify(it.mindmap);
					} else if (it.mmjson) {
						mindmapStr = typeof it.mmjson === 'string' ? it.mmjson : JSON.stringify(it.mmjson);
						changed = true;
					} else if (it.markdown) {
						mindmapStr = md2json(it.markdown, (it.topic || 'Mind Map'));
						changed = true;
					} else if (it.topic) {
						mindmapStr = md2json(`# ${it.topic}`, it.topic);
						changed = true;
					}
				}
				const id = it.id ?? Date.now();
				const timestamp = it.timestamp || new Date().toISOString();
				return mindmapStr ? { id, timestamp, mindmap: mindmapStr } : { id, timestamp, mindmap: JSON.stringify({ "mm-settings": { "spacing": 30, "mm-link-width": 2.5, "border-radius": 4 }, "mm-node": { "content": "Mind Map", "children": [] } }, null, 2) };
			});

			if (changed) {
				localStorage.setItem(historyKey, JSON.stringify(migrated));
			}
		}

		try {
			const pgRaw = localStorage.getItem('mindmap-playground');
			if (pgRaw) {
				const pg = JSON.parse(pgRaw);
				let mindmapStr = null;
				if (pg.mindmap) mindmapStr = typeof pg.mindmap === 'string' ? pg.mindmap : JSON.stringify(pg.mindmap);
				else if (pg.mmjson) mindmapStr = typeof pg.mmjson === 'string' ? pg.mmjson : JSON.stringify(pg.mmjson);
				else if (pg.markdown) mindmapStr = md2json(pg.markdown, (pg.topic || 'Mind Map'));
				else if (pg.topic) mindmapStr = md2json(`# ${pg.topic}`, pg.topic);
				if (mindmapStr) {
					const cleaned = { id: pg.id || Date.now(), timestamp: pg.timestamp || new Date().toISOString(), mindmap: mindmapStr };
					localStorage.setItem('mindmap-playground', JSON.stringify(cleaned));
				}
			}
		} catch { }


		try {
			const sampleMarkdown = "# Mind Map\n\n## Branch\n## Branch";
			const existingHistoryJSON2 = localStorage.getItem(historyKey);
			if (existingHistoryJSON2) {
				let history2 = JSON.parse(existingHistoryJSON2) || [];
				const cleaned = history2.filter(item => item.markdown !== sampleMarkdown);
				if (cleaned.length !== history2.length) {
					localStorage.setItem(historyKey, JSON.stringify(cleaned));
				}
			}
		} catch { }
	} catch (error) {
		trackErrorEvent(`History migration failed. Reason: ${error.message}`);
		console.error('Error migrating mind maps to new schema:', error);
	}
});

async function createLocalMindMapFromMarkdown(markdownInput) {
	try {
		hideHeader();
		const app = document.getElementById('app');
		if (app) app.style.display = 'none';

		document.getElementById('loading-animation').style.display = 'flex';

		const mmjson = window.markdownToMmJson(markdownInput);
		const mmjsonStr = JSON.stringify(mmjson, null, 2);

		let title = "Mind Map";
		const firstHeader = markdownInput.split('\n').find(line => line.trim().startsWith('#'));
		if (firstHeader) {
			title = firstHeader.replace(/^#+\s*/, '').trim();
		}

		const newId = saveMindmapToHistory(mmjsonStr);

		window.currentMindmap = {
			id: newId,
			title: title,
			markdown: mmjsonStr
		};
		window.currentMindmapTitle = title;

		const url = new URL(window.location);
		if (url.searchParams.has('q')) {
			url.searchParams.delete('q');
		}
		url.searchParams.set('id', newId);
		window.history.replaceState({}, '', url.toString());

		await renderMindmap(markdownInput);

		document.getElementById('loading-animation').style.display = 'none';
		document.getElementById('button-container').style.display = 'flex';
		document.getElementById('mindmap').style.display = 'block';

		if (typeof loadMindmapsLeftSidebar === 'function') {
			await loadMindmapsLeftSidebar(true);
		}

	} catch (error) {
		console.error('Failed to create local mind map:', error);
		document.getElementById('loading-animation').style.display = 'none';
		showErrorPopup(error.message, "Error");
		throw error;
	}
}

function expandMindMapNode() {
	return expandMindMapNodeCore();
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

function showLicensePopup() {
  const licensePopup = document.getElementById('licensePopup');
  const infoMenu = document.querySelector('.info-menu');
  
  if (licensePopup) {
    licensePopup.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  
  if (infoMenu) {
    infoMenu.classList.remove('show');
  }
}

function closeLicensePopup() {
  const licensePopup = document.getElementById('licensePopup');
  
  if (licensePopup) {
    licensePopup.classList.remove('show');
    document.body.style.overflow = '';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const closeLicenseBtn = document.getElementById('closeLicensePopup');
  const licensePopup = document.getElementById('licensePopup');
  
  if (closeLicenseBtn) {
    closeLicenseBtn.addEventListener('click', closeLicensePopup);
  }
  
  if (licensePopup) {
    licensePopup.addEventListener('click', function(e) {
      if (e.target === licensePopup) {
        closeLicensePopup();
      }
    });
  }
});

window.showLicensePopup = showLicensePopup;
window.closeLicensePopup = closeLicensePopup;
