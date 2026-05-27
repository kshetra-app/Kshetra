#!/usr/bin/env node
/**
 * Debug: Find the structure of constituency vs stateCode in the generated seed
 */
const fs = require('fs');
const content = fs.readFileSync('./data/seed/mp-profiles.ts', 'utf8');

// Find one example of an empty stateCode to understand structure
const emptyIdx = content.indexOf("stateCode: '',");
if (emptyIdx > -1) {
  console.log('Context around first empty stateCode:');
  console.log(content.substring(Math.max(0, emptyIdx - 300), emptyIdx + 200));
}
