// Auto-generated module registry
// Generated at: 2025-06-29T09:57:06.685Z

export const MODULE_REGISTRY = [
  {
    "name": "ui-core",
    "file": "ui-core.js",
    "globalName": "UIFramework"
  },
  {
    "name": "ui-state",
    "file": "ui-state.js",
    "globalName": "StateManager"
  },
  {
    "name": "ui-tabs",
    "file": "ui-tabs.js",
    "globalName": "TabManager"
  },
  {
    "name": "ui-messages",
    "file": "ui-messages.js",
    "globalName": "MessageHandler"
  },
  {
    "name": "ui-design-system",
    "file": "ui-design-system.js",
    "globalName": "DesignSystemUI"
  },
  {
    "name": "ui-ai-generator",
    "file": "ui-ai-generator.js",
    "globalName": "AIGeneratorUI"
  },
  {
    "name": "ui-api-settings",
    "file": "ui-api-settings.js",
    "globalName": "APISettingsUI"
  }
];

export async function loadAllModules() {
    const modules = {};
    for (const mod of MODULE_REGISTRY) {
        try {
            const imported = await import(`./${mod.file}`);
            modules[mod.globalName] = imported.default || imported;
        } catch (error) {
            console.warn(`Failed to load module ${mod.name}:`, error);
        }
    }
    return modules;
}

export async function loadModule(name) {
    const module = MODULE_REGISTRY.find(m => m.name === name);
    if (!module) throw new Error(`Module ${name} not found`);
    
    try {
        const imported = await import(`./${module.file}`);
        return imported.default || imported;
    } catch (error) {
        console.error(`Failed to load module ${name}:`, error);
        throw error;
    }
}

console.log('📦 Module registry loaded with', MODULE_REGISTRY.length, 'modules');
