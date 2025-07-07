// src/core/session-service.ts
// Session management service for AIDesigner plugin
export class SessionService {
    /**
     * Get current file information
     */
    static getCurrentFileInfo() {
        const fileKey = figma.fileKey || 'unknown';
        const fileName = figma.root.name || 'Untitled';
        return { fileId: fileKey, fileName };
    }
    /**
     * Save session data for current file
     */
    static async saveSession(sessionData) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        try {
            const { fileId, fileName } = this.getCurrentFileInfo();
            // Get existing session or create new one
            const existingSession = await this.getSession(fileId);
            const updatedSession = {
                fileId,
                fileName,
                designState: {
                    original: ((_a = sessionData.designState) === null || _a === void 0 ? void 0 : _a.original) || ((_b = existingSession === null || existingSession === void 0 ? void 0 : existingSession.designState) === null || _b === void 0 ? void 0 : _b.original) || null,
                    current: ((_c = sessionData.designState) === null || _c === void 0 ? void 0 : _c.current) || ((_d = existingSession === null || existingSession === void 0 ? void 0 : existingSession.designState) === null || _d === void 0 ? void 0 : _d.current) || null,
                    history: ((_e = sessionData.designState) === null || _e === void 0 ? void 0 : _e.history) || ((_f = existingSession === null || existingSession === void 0 ? void 0 : existingSession.designState) === null || _f === void 0 ? void 0 : _f.history) || [],
                    frameId: ((_g = sessionData.designState) === null || _g === void 0 ? void 0 : _g.frameId) || ((_h = existingSession === null || existingSession === void 0 ? void 0 : existingSession.designState) === null || _h === void 0 ? void 0 : _h.frameId) || null,
                    frameName: ((_j = sessionData.designState) === null || _j === void 0 ? void 0 : _j.frameName) || ((_k = existingSession === null || existingSession === void 0 ? void 0 : existingSession.designState) === null || _k === void 0 ? void 0 : _k.frameName) || 'Unknown Frame',
                    isIterating: ((_l = sessionData.designState) === null || _l === void 0 ? void 0 : _l.isIterating) || ((_m = existingSession === null || existingSession === void 0 ? void 0 : existingSession.designState) === null || _m === void 0 ? void 0 : _m.isIterating) || false
                },
                scanResults: sessionData.scanResults || (existingSession === null || existingSession === void 0 ? void 0 : existingSession.scanResults) || [],
                lastModified: Date.now(),
                currentTab: sessionData.currentTab || (existingSession === null || existingSession === void 0 ? void 0 : existingSession.currentTab) || 'design-system',
                currentPlatform: sessionData.currentPlatform || (existingSession === null || existingSession === void 0 ? void 0 : existingSession.currentPlatform) || 'mobile'
            };
            // Save to plugin storage
            const storageKey = this.STORAGE_PREFIX + fileId;
            await figma.clientStorage.setAsync(storageKey, updatedSession);
            // Update all sessions index
            await this.updateAllSessionsIndex(fileId, updatedSession);
            console.log('✅ Session saved for file:', fileName);
        }
        catch (error) {
            console.error('❌ Failed to save session:', error);
            throw error;
        }
    }
    /**
     * Get session data for specific file
     */
    static async getSession(fileId) {
        try {
            const targetFileId = fileId || this.getCurrentFileInfo().fileId;
            const storageKey = this.STORAGE_PREFIX + targetFileId;
            const sessionData = await figma.clientStorage.getAsync(storageKey);
            return sessionData || null;
        }
        catch (error) {
            console.error('❌ Failed to get session:', error);
            return null;
        }
    }
    /**
     * Get current file session data
     */
    static async getCurrentSession() {
        const { fileId } = this.getCurrentFileInfo();
        return await this.getSession(fileId);
    }
    /**
     * Check if current file has a session
     */
    static async hasCurrentSession() {
        const session = await this.getCurrentSession();
        return session !== null && (session.scanResults.length > 0 ||
            session.designState.history.length > 0 ||
            session.designState.current !== null);
    }
    /**
     * Clear session for current file
     */
    static async clearCurrentSession() {
        try {
            const { fileId } = this.getCurrentFileInfo();
            const storageKey = this.STORAGE_PREFIX + fileId;
            await figma.clientStorage.deleteAsync(storageKey);
            await this.removeFromAllSessionsIndex(fileId);
            console.log('✅ Session cleared for current file');
        }
        catch (error) {
            console.error('❌ Failed to clear session:', error);
            throw error;
        }
    }
    /**
     * Get all sessions across all files
     */
    static async getAllSessions() {
        try {
            const allSessionsIndex = await figma.clientStorage.getAsync(this.ALL_SESSIONS_KEY) || {};
            const sessions = [];
            for (const fileId of Object.keys(allSessionsIndex)) {
                const session = await this.getSession(fileId);
                if (session) {
                    sessions.push(session);
                }
            }
            // Sort by last modified (newest first)
            return sessions.sort((a, b) => b.lastModified - a.lastModified);
        }
        catch (error) {
            console.error('❌ Failed to get all sessions:', error);
            return [];
        }
    }
    /**
     * Delete specific session
     */
    static async deleteSession(fileId) {
        try {
            const storageKey = this.STORAGE_PREFIX + fileId;
            await figma.clientStorage.deleteAsync(storageKey);
            await this.removeFromAllSessionsIndex(fileId);
            console.log('✅ Session deleted for file:', fileId);
        }
        catch (error) {
            console.error('❌ Failed to delete session:', error);
            throw error;
        }
    }
    /**
     * Clear all sessions (used by "Clear All Data" function)
     */
    static async clearAllSessions() {
        try {
            const allSessions = await this.getAllSessions();
            for (const session of allSessions) {
                const storageKey = this.STORAGE_PREFIX + session.fileId;
                await figma.clientStorage.deleteAsync(storageKey);
            }
            await figma.clientStorage.deleteAsync(this.ALL_SESSIONS_KEY);
            console.log('✅ All sessions cleared');
        }
        catch (error) {
            console.error('❌ Failed to clear all sessions:', error);
            throw error;
        }
    }
    /**
     * Update the index of all sessions
     */
    static async updateAllSessionsIndex(fileId, sessionData) {
        try {
            const allSessionsIndex = await figma.clientStorage.getAsync(this.ALL_SESSIONS_KEY) || {};
            allSessionsIndex[fileId] = {
                fileName: sessionData.fileName,
                lastModified: sessionData.lastModified
            };
            await figma.clientStorage.setAsync(this.ALL_SESSIONS_KEY, allSessionsIndex);
        }
        catch (error) {
            console.error('❌ Failed to update sessions index:', error);
        }
    }
    /**
     * Remove file from all sessions index
     */
    static async removeFromAllSessionsIndex(fileId) {
        try {
            const allSessionsIndex = await figma.clientStorage.getAsync(this.ALL_SESSIONS_KEY) || {};
            delete allSessionsIndex[fileId];
            await figma.clientStorage.setAsync(this.ALL_SESSIONS_KEY, allSessionsIndex);
        }
        catch (error) {
            console.error('❌ Failed to remove from sessions index:', error);
        }
    }
    /**
     * Format session data for UI display
     */
    static formatSessionForUI(session) {
        return {
            fileId: session.fileId,
            fileName: session.fileName,
            designState: session.designState,
            lastModified: session.lastModified,
            frameName: session.designState.frameName,
            historyCount: session.designState.history.length,
            componentCount: session.scanResults.length
        };
    }
}
SessionService.STORAGE_PREFIX = 'aidesigner_session_';
SessionService.ALL_SESSIONS_KEY = 'aidesigner_all_sessions';
