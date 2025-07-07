// src/core/json-migrator.ts
export class JSONMigrator {
    static migrateToSystematic(originalJSON) {
        if (originalJSON.items) {
            originalJSON.items = this.traverseAndMerge(originalJSON.items);
        }
        if (originalJSON.layoutContainer && originalJSON.layoutContainer.items) {
            originalJSON.layoutContainer.items = this.traverseAndMerge(originalJSON.layoutContainer.items);
        }
        return originalJSON;
    }
    static generateMigrationPreview(originalJSON) {
        // This is a placeholder for the real migration preview logic
        return {
            action: "No migration needed",
            details: "JSON is already in the correct format"
        };
    }
    static traverseAndMerge(items) {
        if (!items) {
            return [];
        }
        let newItems = this.mergeConsecutiveTabs(items);
        newItems = newItems.map(item => {
            if (item.items) {
                item.items = this.traverseAndMerge(item.items);
            }
            if (item.layoutContainer && item.layoutContainer.items) {
                item.layoutContainer.items = this.traverseAndMerge(item.layoutContainer.items);
            }
            return item;
        });
        return newItems;
    }
    static mergeConsecutiveTabs(items) {
        if (!items || items.length === 0) {
            return [];
        }
        const newItems = [];
        let i = 0;
        while (i < items.length) {
            const currentItem = items[i];
            if (currentItem.type === 'tab' && (i + 1) < items.length && items[i + 1].type === 'tab') {
                const tabGroup = [currentItem];
                let j = i + 1;
                while (j < items.length && items[j].type === 'tab') {
                    tabGroup.push(items[j]);
                    j++;
                }
                const newTab = Object.assign(Object.assign({}, tabGroup[0]), { properties: Object.assign(Object.assign({}, tabGroup[0].properties), { Label: tabGroup.map(tab => tab.properties.Label) }) });
                newItems.push(newTab);
                i = j;
            }
            else {
                newItems.push(currentItem);
                i++;
            }
        }
        return newItems;
    }
}
