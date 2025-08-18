console.log("🚨🚨🚨 HELLO FROM TEST PLUGIN 2024 🚨🚨🚨");
console.log("Current time:", new Date().toISOString());
figma.showUI(`<h1>NEW Test Plugin ${Date.now()}</h1>`, { width: 300, height: 200 });

figma.ui.onmessage = (msg) => {
  console.log("🚨 NEW TEST MESSAGE:", msg);
};

console.log("🚨🚨🚨 TEST PLUGIN SETUP COMPLETE 🚨🚨🚨");