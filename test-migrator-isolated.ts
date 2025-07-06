// test-migrator-isolated.ts
import { JSONMigrator } from './src/core/json-migrator';

export function testMigratorIsolated() {
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
