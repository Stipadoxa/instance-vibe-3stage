"use strict";
// src/core/json-migrator.ts
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONMigrator = void 0;
var JSONMigrator = /** @class */ (function () {
    function JSONMigrator() {
    }
    JSONMigrator.migrateToSystematic = function (originalJSON) {
        if (originalJSON.items) {
            originalJSON.items = this.traverseAndMerge(originalJSON.items);
        }
        if (originalJSON.layoutContainer && originalJSON.layoutContainer.items) {
            originalJSON.layoutContainer.items = this.traverseAndMerge(originalJSON.layoutContainer.items);
        }
        return originalJSON;
    };
    JSONMigrator.generateMigrationPreview = function (originalJSON) {
        // This is a placeholder for the real migration preview logic
        return {
            action: "No migration needed",
            details: "JSON is already in the correct format"
        };
    };
    JSONMigrator.traverseAndMerge = function (items) {
        var _this = this;
        if (!items) {
            return [];
        }
        var newItems = this.mergeConsecutiveTabs(items);
        newItems = newItems.map(function (item) {
            if (item.items) {
                item.items = _this.traverseAndMerge(item.items);
            }
            if (item.layoutContainer && item.layoutContainer.items) {
                item.layoutContainer.items = _this.traverseAndMerge(item.layoutContainer.items);
            }
            return item;
        });
        return newItems;
    };
    JSONMigrator.mergeConsecutiveTabs = function (items) {
        if (!items || items.length === 0) {
            return [];
        }
        var newItems = [];
        var i = 0;
        while (i < items.length) {
            var currentItem = items[i];
            if (currentItem.type === 'tab' && (i + 1) < items.length && items[i + 1].type === 'tab') {
                var tabGroup = [currentItem];
                var j = i + 1;
                while (j < items.length && items[j].type === 'tab') {
                    tabGroup.push(items[j]);
                    j++;
                }
                var newTab = __assign(__assign({}, tabGroup[0]), { properties: __assign(__assign({}, tabGroup[0].properties), { Label: tabGroup.map(function (tab) { return tab.properties.Label; }) }) });
                newItems.push(newTab);
                i = j;
            }
            else {
                newItems.push(currentItem);
                i++;
            }
        }
        return newItems;
    };
    return JSONMigrator;
}());
exports.JSONMigrator = JSONMigrator;
