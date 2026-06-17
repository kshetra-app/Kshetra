import { readFileSync } from 'node:fs';
for (const f of ['SIKKIM_ASSEMBLY', 'ARUNACHAL_PRADESH_ASSEMBLY', 'MIZORAM_ASSEMBLY']) {
  const fc = JSON.parse(readFileSync(`C:/K/scripts/${f}.geojson`, 'utf8'));
  console.log(`\n=== ${f} | features ${fc.features.length} ===`);
  const p0 = fc.features[0].properties;
  console.log('prop keys:', Object.keys(p0).join(', '));
  const pick = (p, ks) => { for (const k of ks) if (p[k] != null && String(p[k]).trim() !== '') return p[k]; return null; };
  const rows = fc.features.map((ft) => {
    const p = ft.properties;
    return {
      ac: pick(p, ['AC_NO', 'ac_no', 'AC_CODE']),
      name: pick(p, ['AC_NAME', 'ac_name', 'assem_name', 'NAME', 'Name']),
      dist: pick(p, ['DIST_NAME', 'dist_name', 'DISTRICT', 'dtname11']),
    };
  }).sort((a, b) => a.ac - b.ac);
  console.log('samples:', rows.slice(0, 5).map((r) => `${r.ac}:${r.name}[${r.dist}]`).join(' | '));
  console.log('reservation suffixes present:', [...new Set(fc.features.map((ft) => { const n = String(pick(ft.properties, ['AC_NAME', 'ac_name', 'NAME']) || ''); const m = n.match(/\(([^)]+)\)\s*$/); return m ? m[1] : ''; }).filter(Boolean))].join(', ') || 'none');
  const acs = rows.map((r) => r.ac);
  console.log('unique AC_NO', new Set(acs).size, 'range', Math.min(...acs), '..', Math.max(...acs));
}
