const ImageHandler = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_DIMENSION: 2500,
    MAX_LOCAL_IMAGES: 3,
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    DB_NAME: 'mmw-images-db',
    DB_VERSION: 1,
    STORE_NAME: 'images',
    
    API_BASE_URL: 'https://data.mindmapwizard.com',
    
    db: null,
    cache: {},          
    _pendingRequests: {},   
    _localizationCache: {},    
    _pendingLocalizations: {},  
    initialized: false,
    _readyPromise: null,

    _trackEvent: function(eventName, eventData = {}) {
        if (window.dataLayer) {
            window.dataLayer.push({
                'event': eventName,
                ...eventData
            });
        } else {
        }
        if (window.rybbit) {
            window.rybbit.event(eventName, eventData);
        }
    },

    _trackError: function(errorMessage, additionalData = {}) {
        console.log('[ImageHandler] Tracking error:', errorMessage, additionalData);
        const errorData = {
            'error_message': errorMessage,
            ...additionalData
        };
        
        if (window.dataLayer) {
            window.dataLayer.push({
                'event': 'error_occurred',
                ...errorData
            });
        } else {
            console.warn('[ImageHandler] dataLayer not found. Google Analytics event not sent.');
        }
        if (window.rybbit) {
            window.rybbit.event("error_occurred", errorData);
        }
    },

    _trackImageUpload: async function(imageRef) {
        console.log('[ImageHandler] Tracking image upload:', imageRef);
        try {
            const response = await fetch(
                'https://stats.mindmapwizard.com/hit/mmw/image-uploaded', {
                method: 'GET',
            });
            console.log('[ImageHandler] Stats hit response:', response.status);
        } catch (trackingError) {
            console.error('[ImageHandler] Tracking Error:', trackingError);
        }
    },

    ready: function() {
        if (this.initialized) {
            return Promise.resolve();
        }
        if (!this._readyPromise) {
            this._readyPromise = this._init().then(() => {});
        }
        return this._readyPromise;
    },
    
    isImageRef: function(str) {
        return typeof str === 'string' && (str.startsWith('local:') || str.startsWith('remote:'));
    },
    
    /**
     * Check if a string is a local image reference
     * @param {string} str - String to check
     * @returns {boolean}
     */
    isLocalImageRef: function(str) {
        return typeof str === 'string' && str.startsWith('local:');
    },
    
    /**
     * Check if a string is a remote image reference
     * @param {string} str - String to check
     * @returns {boolean}
     */
    isRemoteImageRef: function(str) {
        return typeof str === 'string' && str.startsWith('remote:');
    },
    
    /**
     * Save an image - automatically routes based on authentication
     * @param {string} dataUrl - Base64 data URL of the image
     * @param {string} [customId] - Optional custom ID for the image
     * @returns {Promise<string|null>} Promise resolving to image reference (local:ID or remote:ID)
     */
    saveImage: async function(dataUrl, customId) {
        const isAuthenticated = await this._isAuthenticated();
        
        if (isAuthenticated) {
            return await this._saveRemoteImage(dataUrl, customId);
        } else {
            return await this._saveLocalImage(dataUrl, customId);
        }
    },
    
    /**
     * Load an image from cache (synchronous)
     * @param {string} ref - Image reference (local:ID or remote:ID)
     * @returns {string|null} Image URL/data URL or null if not cached
     */
    loadImage: function(ref) {
        if (this.isLocalImageRef(ref)) {
            return this._loadLocalImage(ref);
        } else if (this.isRemoteImageRef(ref)) {
            return this._loadRemoteImage(ref);
        }
        return null;
    },
    
    /**
     * Load an image asynchronously with retry logic
     * @param {string} ref - Image reference (local:ID or remote:ID)
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} retryDelay - Delay between retries in ms
     * @returns {Promise<string|null>}
     */
    loadImageAsync: async function(ref, maxRetries = 5, retryDelay = 200) {
        if (this.isLocalImageRef(ref)) {
            return await this._loadLocalImageAsync(ref, maxRetries, retryDelay);
        } else if (this.isRemoteImageRef(ref)) {
            return await this._loadRemoteImageAsync(ref, maxRetries, retryDelay);
        }
        return null;
    },
    
    /**
     * Delete an image
     * @param {string} ref - Image reference (local:ID or remote:ID)
     * @returns {Promise<boolean>}
     */
    deleteImage: async function(ref) {
        if (this.isLocalImageRef(ref)) {
            return await this._deleteLocalImage(ref);
        } else if (this.isRemoteImageRef(ref)) {
            return await this._deleteRemoteImage(ref);
        }
        return false;
    },
    
    /**
     * Check if image limit is reached (only applies to local/unauthenticated)
     * @returns {Promise<boolean>}
     */
    isImageLimitReached: async function() {
        const isAuthenticated = await this._isAuthenticated();
        if (isAuthenticated) {
            return false;
        }
        return Object.keys(this.cache).filter(id => !id.startsWith('remote-')).length >= this.MAX_LOCAL_IMAGES;
    },
    
    getRemainingImageSlots: async function() {
        const isAuthenticated = await this._isAuthenticated();
        if (isAuthenticated) {
            return 999; 
        }
        const localCount = Object.keys(this.cache).filter(id => !id.startsWith('remote-')).length;
        return Math.max(0, this.MAX_LOCAL_IMAGES - localCount);
    },
    
    getImageIndex: function() {
        return Object.keys(this.cache).map(id => {
            if (id.startsWith('remote-')) {
                return 'remote:' + id.substring(7);
            }
            return 'local:' + id;
        });
    },
    
    getTotalSize: function() {
        let totalSize = 0;
        Object.entries(this.cache).forEach(([id, dataUrl]) => {
            if (!id.startsWith('remote-') && dataUrl) {
                totalSize += dataUrl.length;
            }
        });
        return totalSize;
    },

    fileToDataUrl: function(file) {
        return new Promise((resolve, reject) => {
            let mimeType = file.type.toLowerCase();
            if (mimeType === 'image/jpg') {
                mimeType = 'image/jpeg';
            }
            
            if (!this.SUPPORTED_FORMATS.includes(mimeType)) {
                const errorMsg = `Unsupported image format. Supported formats: JPG, PNG, WebP, GIF`;
                this._trackError(errorMsg, { mime_type: mimeType, file_name: file.name });
                reject(new Error(errorMsg));
                return;
            }
            
            if (file.size > this.MAX_FILE_SIZE) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                const maxMB = (this.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
                const errorMsg = `Image is too large (${sizeMB}MB). Maximum allowed size is ${maxMB}MB.`;
                this._trackError(errorMsg, { file_size: file.size, max_size: this.MAX_FILE_SIZE });
                reject(new Error(errorMsg));
                return;
            }


            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    const dimensions = this._calculateResizedDimensions(img.width, img.height, this.MAX_DIMENSION);
                    const width = dimensions.width;
                    const height = dimensions.height;
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const hasTransparency = this._hasTransparency(ctx, width, height);
                    const isAnimated = mimeType === 'image/gif';
                    
                    let outputMimeType;
                    let quality;
                    
                    if (isAnimated) {
                        if (this._isWebPSupported() && hasTransparency) {
                            outputMimeType = 'image/webp';
                            quality = 0.95;
                        } else if (hasTransparency) {
                            outputMimeType = 'image/png';
                            quality = undefined;
                        } else {
                            outputMimeType = this._isWebPSupported() ? 'image/webp' : 'image/jpeg';
                            quality = outputMimeType === 'image/webp' ? 0.95 : 0.92;
                        }
                    } else if (mimeType === 'image/png' && hasTransparency) {
                        outputMimeType = this._isWebPSupported() ? 'image/webp' : 'image/png';
                        quality = this._isWebPSupported() ? 0.98 : undefined;
                    } else if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
                        outputMimeType = this._isWebPSupported() ? 'image/webp' : 'image/jpeg';
                        quality = this._isWebPSupported() ? 0.95 : 0.92;
                    } else if (mimeType === 'image/png') {
                        outputMimeType = this._isWebPSupported() ? 'image/webp' : 'image/png';
                        quality = this._isWebPSupported() ? 0.98 : undefined;
                    } else {
                        outputMimeType = 'image/png';
                        quality = undefined;
                    }
                    
                    const dataUrl = canvas.toDataURL(outputMimeType, quality);
                    resolve(dataUrl);
                };
                
                img.onerror = () => {
                    const errorMsg = 'Failed to load image. The file may be corrupted.';
                    this._trackError(errorMsg, { file_name: file.name });
                    reject(new Error(errorMsg));
                };
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                const errorMsg = 'Failed to read file';
                this._trackError(errorMsg, { file_name: file.name });
                reject(new Error(errorMsg));
            };
            reader.readAsDataURL(file);
        });
    },
    
    getImageDimensionsFromDataUrl: function(dataUrl) {
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
        
        try {
            const base64 = dataUrl.split(',')[1];
            const binary = atob(base64);
            
            if (binary.charCodeAt(0) === 0x89 && binary.charCodeAt(1) === 0x50 && 
                binary.charCodeAt(2) === 0x4E && binary.charCodeAt(3) === 0x47) {
                const width = (binary.charCodeAt(16) << 24) | (binary.charCodeAt(17) << 16) | 
                              (binary.charCodeAt(18) << 8) | binary.charCodeAt(19);
                const height = (binary.charCodeAt(20) << 24) | (binary.charCodeAt(21) << 16) | 
                               (binary.charCodeAt(22) << 8) | binary.charCodeAt(23);
                return { width, height };
            }
            
            if (binary.charCodeAt(0) === 0xFF && binary.charCodeAt(1) === 0xD8) {
                let i = 2;
                while (i < binary.length) {
                    const marker = binary.charCodeAt(i);
                    if (marker !== 0xFF) { i++; continue; }
                    
                    const type = binary.charCodeAt(i + 1);
                    i += 2;
                    
                    if (type === 0xD9) break;
                    if (type === 0x01 || (type >= 0xD0 && type <= 0xD7)) continue;
                    
                    const length = (binary.charCodeAt(i) << 8) | binary.charCodeAt(i + 1);
                    
                    if (type === 0xC0 || type === 0xC2) {
                        const height = (binary.charCodeAt(i + 3) << 8) | binary.charCodeAt(i + 4);
                        const width = (binary.charCodeAt(i + 5) << 8) | binary.charCodeAt(i + 6);
                        return { width, height };
                    }
                    
                    i += length;
                }
            }
            
            return null;
        } catch (e) {
            console.error('Failed to extract dimensions:', e);
            return null;
        }
    },
    
    /**
     * Make all images for a mind map public (for sharing)
     * @param {string} mindMapId - The mind map ID
     * @returns {Promise<boolean>}
     */
    makeMindMapImagesPublic: async function(mindMapId) {
        try {
            const token = await this._getAuthToken();
            if (!token) return false;
            
            const response = await fetch(
                `${this.API_BASE_URL}/images?mindMapId=${encodeURIComponent(mindMapId)}&limit=100`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            if (!response.ok) return false;
            
            const result = await response.json();
            if (!result.success || !result.data) return false;
            
            const promises = result.data.map(img => this._setRemoteImageAccessLevel(img.id, 'public'));
            await Promise.all(promises);
            return true;
        } catch (e) {
            console.error('Failed to make mind map images public:', e);
            return false;
        }
    },
    
    cleanupOldImages: async function() {
        try {
            const db = await this._getDB();
            
            const images = await new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.getAll();
                request.onsuccess = (e) => resolve(e.target.result || []);
                request.onerror = () => resolve([]);
            });
            
            if (images.length === 0) return;
            
            images.sort((a, b) => a.timestamp - b.timestamp);
            const toRemove = Math.ceil(images.length * 0.25);
            
            for (let i = 0; i < toRemove; i++) {
                await this._deleteLocalImage('local:' + images[i].id);
            }
        } catch (e) {
            console.error('Failed to cleanup old images:', e);
        }
    },
    
    saveRemoteImageLocally: async function(remoteId, imageUrl) {
        if (this._localizationCache[remoteId]) {
            return this._localizationCache[remoteId];
        }

        if (this._pendingLocalizations[remoteId]) {
            return this._pendingLocalizations[remoteId];
        }

        this._pendingLocalizations[remoteId] = (async () => {
            try {
                let dataUrl = this.cache[remoteId];
                if (!dataUrl || !dataUrl.startsWith('data:')) {
                    dataUrl = await this._downloadImageAsDataUrl(imageUrl);
                }
                if (!dataUrl) return null;

                const newLocalId = this._generateId();
                const localRef = await this._saveLocalImageBypassLimit(dataUrl, newLocalId);
                if (localRef) {
                    this._localizationCache[remoteId] = localRef;
                }
                return localRef;
            } catch (e) {
                console.error('Failed to save remote image locally:', e);
                return null;
            } finally {
                delete this._pendingLocalizations[remoteId];
            }
        })();

        return this._pendingLocalizations[remoteId];
    },
    
    
    _init: async function() {
        await this._initDB();
        
        const mindMapId = window.currentMindmap?.id || window.currentMindmapId;
        if (mindMapId && await this._isAuthenticated()) {
            await this._preloadMindMapImages(mindMapId);
        }
        
        this.initialized = true;
    },
    
    _initDB: function() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }
            
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = (e) => {
                console.error('IndexedDB error:', e.target.error);
                reject(e.target.error);
            };
            
            request.onsuccess = (e) => {
                this.db = e.target.result;
                this._preloadLocalCache().then(resolve).catch(() => resolve(this.db));
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },
    
    _getDB: function() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }
            
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onerror = (e) => reject(e.target.error);
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },
    
    _preloadLocalCache: async function() {
        try {
            const db = await this._getDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.getAll();
                
                request.onsuccess = (e) => {
                    const images = e.target.result || [];
                    images.forEach(img => {
                        this.cache[img.id] = img.dataUrl;
                    });
                    resolve();
                };
                
                request.onerror = () => resolve();
            });
        } catch (e) {
            console.error('Failed to preload local cache:', e);
        }
    },
    
    _isAuthenticated: async function() {
        try {
            const clerk = (typeof Clerk !== 'undefined') ? Clerk : window.Clerk;
            if (!clerk) return false;
            await clerk.load();
            return !!(clerk.user && clerk.session);
        } catch (e) {
            return false;
        }
    },
    
    _getAuthToken: async function() {
        try {
            const clerk = (typeof Clerk !== 'undefined') ? Clerk : window.Clerk;
            if (!clerk) return null;
            await clerk.load();
            return await clerk.session?.getToken() || null;
        } catch (e) {
            console.error('Failed to get auth token:', e);
            return null;
        }
    },
    

    _saveLocalImage: async function(dataUrl, customId) {
        const isLimitReached = await this.isImageLimitReached();
        if (isLimitReached && !customId) {
            console.error('Maximum number of local images reached');
            this._trackError('Maximum number of local images reached', { limit: this.MAX_LOCAL_IMAGES });
            return null;
        }
        
        const id = customId || this._generateId();
        
        try {
            const db = await this._getDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                
                const imageData = {
                    id: id,
                    dataUrl: dataUrl,
                    timestamp: Date.now()
                };
                
                const request = store.put(imageData);
                
                request.onsuccess = () => {
                    this.cache[id] = dataUrl;
                    this._trackImageUpload(`local:${id}`);
                    this._trackEvent('image_uploaded', { image_id: id, storage_type: 'local' });
                    resolve('local:' + id);
                };
                
                request.onerror = (e) => {
                    console.error('Failed to save image to IndexedDB:', e.target.error);
                    this._trackError('Failed to save image to IndexedDB', { error: e.target.error?.message });
                    resolve(null);
                };
            });
        } catch (e) {
            console.error('Failed to save local image:', e);
            this._trackError('Failed to save local image', { error: e.message });
            return null;
        }
    },
    
    _saveLocalImageBypassLimit: async function(dataUrl, customId) {
        const id = customId || this._generateId();
        
        try {
            const db = await this._getDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                
                const imageData = {
                    id: id,
                    dataUrl: dataUrl,
                    timestamp: Date.now()
                };
                
                const request = store.put(imageData);
                
                request.onsuccess = () => {
                    this.cache[id] = dataUrl;
                    resolve('local:' + id);
                };
                
                request.onerror = (e) => {
                    console.error('Failed to save image to IndexedDB:', e.target.error);
                    resolve(null);
                };
            });
        } catch (e) {
            console.error('Failed to save local image:', e);
            return null;
        }
    },
    
    _loadLocalImage: function(ref) {
        const cleanId = ref.startsWith('local:') ? ref.substring(6) : ref;
        
        if (this.cache[cleanId]) {
            return this.cache[cleanId];
        }
        
        this._loadLocalImageAsync(cleanId);
        return null;
    },
    
    _loadLocalImageAsync: async function(ref, maxRetries = 5, retryDelay = 200) {
        const cleanId = ref.startsWith('local:') ? ref.substring(6) : ref;
        
        if (this.cache[cleanId]) {
            return this.cache[cleanId];
        }
        
        try {
            await this.ready();
        } catch (e) {
            console.error('ImageHandler not ready:', e);
        }
        
        if (this.cache[cleanId]) {
            return this.cache[cleanId];
        }
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const result = await this._loadLocalFromDB(cleanId);
                if (result) return result;
                
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            } catch (e) {
                console.error(`Load attempt ${attempt + 1} failed for image ${cleanId}:`, e);
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }
        
        return null;
    },
    
    _loadLocalFromDB: async function(id) {
        try {
            const db = await this._getDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.get(id);
                
                request.onsuccess = (e) => {
                    const result = e.target.result;
                    if (result && result.dataUrl) {
                        this.cache[id] = result.dataUrl;
                        resolve(result.dataUrl);
                    } else {
                        resolve(null);
                    }
                };
                
                request.onerror = (e) => {
                    console.error('Failed to load image from IndexedDB:', e.target.error);
                    resolve(null);
                };
            });
        } catch (e) {
            console.error('Failed to load local image:', e);
            return null;
        }
    },
    
    _deleteLocalImage: async function(ref) {
        const cleanId = ref.startsWith('local:') ? ref.substring(6) : ref;
        
        delete this.cache[cleanId];
        
        try {
            const db = await this._getDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                const request = store.delete(cleanId);
                
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => {
                    console.error('Failed to delete image:', e.target.error);
                    resolve(false);
                };
            });
        } catch (e) {
            console.error('Failed to delete local image:', e);
            return false;
        }
    },
    
    _saveRemoteImage: async function(dataUrl, customId) {
        try {
            const token = await this._getAuthToken();
            if (!token) {
                console.error('Authentication required to save images');
                return null;
            }
            
            const mindMapId = window.currentMindmap?.id || window.currentMindmapId;
            if (!mindMapId) {
                console.error('No mind map ID available for image upload');
                return null;
            }
            
            const isSvg = dataUrl.startsWith('data:image/svg+xml');
            const ext = isSvg ? 'svg' : 'png';
            const file = this._dataUrlToFile(dataUrl, `image-${Date.now()}.${ext}`);
            
            if (file.size > this.MAX_FILE_SIZE) {
                console.error(`Image size exceeds limit (${file.size} > ${this.MAX_FILE_SIZE})`);
                return null;
            }
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('mindMapId', String(mindMapId));
            
            const response = await fetch(`${this.API_BASE_URL}/images/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Failed to upload image:', errorData);
                if (errorData.error === 'LIMIT_ERROR') {
                    if (errorData.details?.plan === 'pro') {
                        if (typeof window.showProImageUploadLimitPopup === 'function') {
                            window.showProImageUploadLimitPopup(true);
                        }
                    } else {
                        if (typeof window.showFreeLimitPopup === 'function') {
                            window.showFreeLimitPopup(true, 'imageUpload');
                        }
                    }
                }
                return null;
            }
            
            const result = await response.json();
            
            if (result.success && result.imageId) {
                this._trackImageUpload(`remote:${result.imageId}`);
                this._trackEvent('image_uploaded', { image_id: result.imageId, storage_type: 'remote' });
                
                if (result.url) {
                    try {
                        const dataUrl = await this._downloadImageAsDataUrl(result.url);
                        if (dataUrl) {
                            this.cache[result.imageId] = dataUrl;
                        } else {
                            this.cache[result.imageId] = result.url;
                        }
                    } catch (e) {
                        this.cache[result.imageId] = result.url;
                    }
                }
                return `remote:${result.imageId}`;
            }
            
            return null;
        } catch (e) {
            console.error('Failed to save remote image:', e);
            this._trackError('Failed to save remote image', { error: e.message });
            return null;
        }
    },
    
    _loadRemoteImage: function(ref) {
        const cleanId = ref.startsWith('remote:') ? ref.substring(7) : ref;
        
        if (this.cache[cleanId]) {
            return this.cache[cleanId];
        }
        
        this._loadRemoteImageAsync(cleanId);
        return null;
    },
    
    _loadRemoteImageAsync: async function(ref, maxRetries = 3, retryDelay = 200) {
        const cleanId = ref.startsWith('remote:') ? ref.substring(7) : ref;

        if (this.cache[cleanId]) {
            return this.cache[cleanId];
        }

        if (this._pendingRequests[cleanId]) {
            return this._pendingRequests[cleanId];
        }

        this._pendingRequests[cleanId] = (async () => {
            try {
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        const result = await this._loadRemoteFromAPI(cleanId);
                        if (result) return result;

                        if (attempt < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                        }
                    } catch (e) {
                        console.error(`Load attempt ${attempt + 1} failed for remote image ${cleanId}:`, e);
                        if (attempt < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                        }
                    }
                }
                return null;
            } finally {
                delete this._pendingRequests[cleanId];
            }
        })();

        return this._pendingRequests[cleanId];
    },
    
    _loadRemoteFromAPI: async function(id) {
        try {
            if (this.cache[id]) return this.cache[id];

            const token = await this._getAuthToken();
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.API_BASE_URL}/images/${encodeURIComponent(id)}`, { headers });

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Remote image not found: ${id}`);
                }
                return null;
            }

            const contentType = response.headers.get('Content-Type') || '';

            if (contentType.startsWith('image/')) {
                const blob = await response.blob();
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });
                if (dataUrl) {
                    this.cache[id] = dataUrl;
                    return dataUrl;
                }
                return null;
            }

            const result = await response.json();

            if (result.success && result.image && result.image.url) {
                const imageUrl = result.image.url;

                try {
                    const dataUrl = await this._downloadImageAsDataUrl(imageUrl);
                    if (dataUrl) {
                        this.cache[id] = dataUrl;
                        return dataUrl;
                    }
                } catch (downloadError) {
                    console.warn('Could not convert image to data URL, caching URL instead:', downloadError);
                }

                this.cache[id] = imageUrl;
                return imageUrl;
            }

            return null;
        } catch (e) {
            console.error('Failed to load remote image:', e);
            return null;
        }
    },
    
    _deleteRemoteImage: async function(ref) {
        const cleanId = ref.startsWith('remote:') ? ref.substring(7) : ref;
        
        delete this.cache[cleanId];
        
        try {
            const token = await this._getAuthToken();
            if (!token) {
                console.error('Authentication required to delete images');
                return false;
            }
            
            const response = await fetch(`${this.API_BASE_URL}/images/${encodeURIComponent(cleanId)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            return response.ok;
        } catch (e) {
            console.error('Failed to delete remote image:', e);
            return false;
        }
    },
    
    _setRemoteImageAccessLevel: async function(id, accessLevel) {
        try {
            const token = await this._getAuthToken();
            if (!token) return false;
            
            const response = await fetch(
                `${this.API_BASE_URL}/images/${encodeURIComponent(id)}/access`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ accessLevel })
                }
            );
            
            return response.ok;
        } catch (e) {
            console.error('Failed to set image access level:', e);
            return false;
        }
    },
    
    _preloadMindMapImages: async function(mindMapId) {
        try {
            const token = await this._getAuthToken();
            if (!token) return;
            
            const response = await fetch(
                `${this.API_BASE_URL}/images?mindMapId=${encodeURIComponent(mindMapId)}&limit=100`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            if (!response.ok) return;
            
            const result = await response.json();
            if (result.success && result.data) {
                const promises = result.data.map(async img => {
                    if (img.url && !this.cache[img.id]) {
                        try {
                            const dataUrl = await this._downloadImageAsDataUrl(img.url);
                            if (dataUrl) {
                                this.cache[img.id] = dataUrl;
                            } else {
                                this.cache[img.id] = img.url;
                            }
                        } catch (e) {
                            this.cache[img.id] = img.url;
                        }
                    }
                });
                await Promise.all(promises);
            }
        } catch (e) {
            console.error('Failed to preload mind map images:', e);
        }
    },
    
    _downloadImageAsDataUrl: async function(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) return null;
            
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error('Failed to download image:', e);
            return null;
        }
    },

    _generateId: function() {
        const timestamp = Date.now();
        const randomString = Array.from({ length: 16 }, () => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
        return `img-${timestamp}-${randomString}`;
    },
    
    _isWebPSupported: function() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').startsWith('data:image/webp');
    },
    
    _calculateResizedDimensions: function(width, height, maxDimension) {
        if (width <= maxDimension && height <= maxDimension) {
            return { width, height };
        }
        
        const aspectRatio = width / height;
        
        if (width > height) {
            return {
                width: maxDimension,
                height: Math.round(maxDimension / aspectRatio)
            };
        } else {
            return {
                width: Math.round(maxDimension * aspectRatio),
                height: maxDimension
            };
        }
    },
    
    _hasTransparency: function(ctx, width, height) {
        try {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] < 255) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    },
    
    _dataUrlToFile: function(dataUrl, fileName = 'image.png') {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], fileName, { type: mime });
    }
};

window.ImageHandler = ImageHandler;

window.ImageStorage = ImageHandler;
window.BackendImageStorage = ImageHandler;
window.UnifiedImageStorage = ImageHandler;

window.getImageStorage = function() {
    return ImageHandler;
};

window.isImageRef = function(str) {
    return ImageHandler.isImageRef(str);
};

window.deleteImageFromStorage = async function(imageRef) {
    return await ImageHandler.deleteImage(imageRef);
};

window.loadImageFromStorage = function(imageRef) {
    return ImageHandler.loadImage(imageRef);
};

window.loadImageFromStorageAsync = async function(imageRef) {
    return await ImageHandler.loadImageAsync(imageRef);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ImageHandler.ready().catch(err => {
            console.error('Failed to initialize ImageHandler:', err);
        });
    });
} else {
    ImageHandler.ready().catch(err => {
        console.error('Failed to initialize ImageHandler:', err);
    });
}
