// Bootstrap module for ESM app initialization
// Auto-generated at: 2025-06-29T09:57:06.686Z

import { loadAllModules, MODULE_REGISTRY } from './ui-registry.js';

class ESMBootstrap {
    constructor() {
        this.modules = {};
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return this.modules;
        
        console.log('🚀 Initializing ESM modules...');
        
        try {
            // Load all modules
            this.modules = await loadAllModules();
            
            // Make modules globally available for backward compatibility
            Object.entries(this.modules).forEach(([name, module]) => {
                if (typeof window !== 'undefined') {
                    window[name] = module;
                }
            });
            
            // Initialize modules that need setup
            await this.initializeModules();
            
            this.initialized = true;
            console.log('✅ ESM modules initialized successfully');
            
            return this.modules;
            
        } catch (error) {
            console.error('❌ ESM module initialization failed:', error);
            throw error;
        }
    }
    
    async initializeModules() {
        // Initialize individual modules for backward compatibility
        if (this.modules.DesignSystemUI) {
            window.designSystemUI = new this.modules.DesignSystemUI();
        }
        
        if (this.modules.TabManager) {
            window.tabManager = new this.modules.TabManager();
        }
        
        if (this.modules.AIGeneratorUI) {
            console.log('🔍 Creating AIGeneratorUI instance from ESM...');
            window.aiGeneratorUI = new this.modules.AIGeneratorUI();
            console.log('✅ AIGeneratorUI instance created from ESM');
        }
        
        // Make utility functions globally available
        if (this.modules.UIFramework) {
            const framework = this.modules.UIFramework;
            window.$ = framework.$;
            window.byId = framework.byId;
            window.showStatus = framework.showStatus;
            window.clearStatus = framework.clearStatus;
            window.switchTab = framework.switchTab;
            window.copyToClipboard = framework.copyToClipboard;
        }
    }
    
    getModule(name) {
        return this.modules[name];
    }
    
    isInitialized() {
        return this.initialized;
    }
}

// Create global bootstrap instance
const bootstrap = new ESMBootstrap();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            bootstrap.initialize().catch(console.error);
        });
    } else {
        bootstrap.initialize().catch(console.error);
    }
}

export default bootstrap;
export { ESMBootstrap };
