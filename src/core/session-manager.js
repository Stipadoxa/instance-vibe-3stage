// session-manager.ts
// Session state management for AIDesigner
export class SessionManager {
    // Зберегти поточний стан сесії
    static async saveSession(designState, scanData) {
        try {
            const fileId = figma.root.id;
            const fileName = figma.root.name;
            // Якщо немає активної ітерації, не зберігаємо
            if (!designState.isIterating)
                return;
            console.log(`💾 Збереження сесії для файлу: ${fileName}`);
            const storage = await this.getSessionStorage();
            const session = {
                fileId,
                fileName,
                lastModified: Date.now(),
                designState: {
                    original: designState.original,
                    current: designState.current,
                    history: [...designState.history],
                    frameId: designState.frameId,
                    frameName: designState.frameId ? await this.getFrameName(designState.frameId) : '',
                    isIterating: designState.isIterating
                },
                scanData
            };
            storage.sessions[fileId] = session;
            storage.lastActiveSession = fileId;
            await figma.clientStorage.setAsync(this.STORAGE_KEY, storage);
            console.log(`✅ Сесія збережена`);
        }
        catch (error) {
            console.error('❌ Помилка збереження сесії:', error);
        }
    }
    // Завантажити сесію для поточного файлу
    static async loadSession() {
        try {
            const fileId = figma.root.id;
            const storage = await this.getSessionStorage();
            const session = storage.sessions[fileId];
            if (!session)
                return null;
            // Перевірити, чи існує ще фрейм
            if (session.designState.frameId) {
                const frame = await figma.getNodeByIdAsync(session.designState.frameId);
                if (!frame || frame.removed) {
                    console.log('⚠️ Фрейм з попередньої сесії не знайдено, очищуємо сесію');
                    await this.clearSession(fileId);
                    return null;
                }
            }
            console.log(`✅ Сесія знайдена для файлу: ${session.fileName}`);
            return session;
        }
        catch (error) {
            console.error('❌ Помилка завантаження сесії:', error);
            return null;
        }
    }
    // Отримати всі активні сесії
    static async getAllSessions() {
        try {
            const storage = await this.getSessionStorage();
            const now = Date.now();
            const activeSessions = Object.values(storage.sessions)
                .filter(session => (now - session.lastModified) < this.MAX_SESSION_AGE)
                .sort((a, b) => b.lastModified - a.lastModified);
            return activeSessions;
        }
        catch (error) {
            console.error('❌ Помилка завантаження всіх сесій:', error);
            return [];
        }
    }
    // Очистити сесію для файлу
    static async clearSession(fileId) {
        try {
            const targetFileId = fileId || figma.root.id;
            const storage = await this.getSessionStorage();
            delete storage.sessions[targetFileId];
            if (storage.lastActiveSession === targetFileId) {
                delete storage.lastActiveSession;
            }
            await figma.clientStorage.setAsync(this.STORAGE_KEY, storage);
            console.log(`🗑️ Сесія очищена для файлу: ${targetFileId}`);
        }
        catch (error) {
            console.error('❌ Помилка очищення сесії:', error);
        }
    }
    // Очистити старі сесії
    static async cleanupOldSessions() {
        try {
            const storage = await this.getSessionStorage();
            const now = Date.now();
            let cleaned = 0;
            Object.entries(storage.sessions).forEach(([fileId, session]) => {
                if ((now - session.lastModified) > this.MAX_SESSION_AGE) {
                    delete storage.sessions[fileId];
                    cleaned++;
                }
            });
            if (cleaned > 0) {
                await figma.clientStorage.setAsync(this.STORAGE_KEY, storage);
                console.log(`🧹 Очищено ${cleaned} старих сесій`);
            }
        }
        catch (error) {
            console.error('❌ Помилка очищення старих сесій:', error);
        }
    }
    // Отримати storage з ініціалізацією
    static async getSessionStorage() {
        try {
            const storage = await figma.clientStorage.getAsync(this.STORAGE_KEY);
            if (!storage || storage.version !== this.SESSION_VERSION) {
                return {
                    sessions: {},
                    version: this.SESSION_VERSION
                };
            }
            return storage;
        }
        catch (error) {
            console.error('❌ Помилка отримання storage:', error);
            return {
                sessions: {},
                version: this.SESSION_VERSION
            };
        }
    }
    // Отримати назву фрейму за ID
    static async getFrameName(frameId) {
        try {
            const frame = await figma.getNodeByIdAsync(frameId);
            return (frame === null || frame === void 0 ? void 0 : frame.name) || 'Unknown Frame';
        }
        catch (_a) {
            return 'Unknown Frame';
        }
    }
    // Відновити сесію з даних
    static async restoreSessionData(sessionData) {
        try {
            // Перевірити, чи існує фрейм
            if (sessionData.designState.frameId) {
                const frame = await figma.getNodeByIdAsync(sessionData.designState.frameId);
                if (!frame || frame.removed) {
                    throw new Error('Фрейм не знайдено');
                }
                // Перейти до фрейму
                figma.currentPage.selection = [frame];
                figma.viewport.scrollAndZoomIntoView([frame]);
            }
            return true;
        }
        catch (error) {
            console.error('❌ Помилка відновлення сесії:', error);
            return false;
        }
    }
}
SessionManager.STORAGE_KEY = 'aidesigner-sessions';
SessionManager.SESSION_VERSION = '1.0';
SessionManager.MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 днів
