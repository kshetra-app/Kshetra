#!/usr/bin/env node
/**
 * Fix the Rajya Sabha JSON:
 * - name field = serial no (wrong) → actual name is in 'state' field
 * - party field = correct
 * - state field = actual name (wrong) → we need to look up their actual state
 *
 * Also: generate final mp-profiles.ts with corrected RS data
 */

const fs = require('fs');
const path = require('path');

const RS_FILE   = path.resolve(__dirname, 'output/sansad/rajya-sabha-members.json');
const RS_FIXED  = path.resolve(__dirname, 'output/sansad/rajya-sabha-fixed.json');

const raw = JSON.parse(fs.readFileSync(RS_FILE, 'utf8'));

// Filter to entries that have:
// - name that looks like a serial number (integer)
// - party that looks like a party abbreviation
// - state that looks like a person's name
const realMembers = raw.filter(d => {
  if (!d.name || !d.party) return false;
  // name should be a number (serial)
  const sno = parseInt(d.name, 10);
  if (isNaN(sno)) return false;
  // state should be a name in "Surname, Title Firstname" format
  if (!d.state || d.state.length < 5) return false;
  // party should be a known abbreviation or reasonable string
  if (d.party.length > 30) return false;
  return true;
});

console.log(`Found ${realMembers.length} real RS members`);

// Fix the structure: name = state field (parsed), party = party field
function parseName(nameStr) {
  if (!nameStr) return '';
  // Format is "Surname, Shri/Smt. Firstname Middlename" or "Surname, Shri Firstname"
  // Convert to "Firstname Surname" format
  const parts = nameStr.split(',');
  if (parts.length === 1) return nameStr.trim();
  const surname = parts[0].trim();
  const rest = parts[1].trim();
  // Remove honorific (Shri, Smt., Dr., Prof., Ms., Mr., Ch.)
  const cleaned = rest.replace(/^(Shri|Smt\.|Dr\.|Prof\.|Ms\.|Mr\.|Ch\.|Maj\.|Gen\.|Adv\.|Er\.)\s+/i, '').trim();
  return `${cleaned} ${surname}`.trim();
}

const fixed = realMembers.map((d, i) => ({
  id: `RS_${String(i + 1).padStart(3, '0')}`,
  name: parseName(d.state),
  party: d.party,
  state: d.stateName || '',      // state name from scraper
  photoUrl: d.photoUrl || '',
  rawName: d.state,   // keep original for debugging
  source: 'sansad.in/rajya-sabha/members',
}));

console.log(`\nSample fixed RS members:`);
fixed.slice(0, 10).forEach(d => console.log(`  ${d.id} | ${d.name} | ${d.party}`));

fs.writeFileSync(RS_FIXED, JSON.stringify(fixed, null, 2));
console.log(`\n💾 Saved ${fixed.length} fixed RS members → ${RS_FIXED}`);
