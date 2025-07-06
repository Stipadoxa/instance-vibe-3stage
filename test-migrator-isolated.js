"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/core/json-migrator.ts
  var JSONMigrator = class {
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
      newItems = newItems.map((item) => {
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
        if (currentItem.type === "tab" && i + 1 < items.length && items[i + 1].type === "tab") {
          const tabGroup = [currentItem];
          let j = i + 1;
          while (j < items.length && items[j].type === "tab") {
            tabGroup.push(items[j]);
            j++;
          }
          const newTab = __spreadProps(__spreadValues({}, tabGroup[0]), {
            properties: __spreadProps(__spreadValues({}, tabGroup[0].properties), {
              Label: tabGroup.map((tab) => tab.properties.Label)
            })
          });
          newItems.push(newTab);
          i = j;
        } else {
          newItems.push(currentItem);
          i++;
        }
      }
      return newItems;
    }
  };

  // test-migrator-isolated.ts
  function testMigratorIsolated() {
    const testJSON = {
      "items": [
        {
          "type": "tab",
          "properties": {
            "Label": "electronics"
          }
        },
        {
          "type": "tab",
          "properties": {
            "Label": "home goods"
          }
        },
        {
          "type": "tab",
          "properties": {
            "Label": "vehicles"
          }
        }
      ]
    };
    console.log("Testing JSON Migrator in isolation...");
    const migratedJSON = JSONMigrator.migrateToSystematic(testJSON);
    console.log(JSON.stringify(migratedJSON, null, 2));
  }
  testMigratorIsolated();
})();
