/**
 * scripts/lib/ast_data_parser.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 088 (Workstreams B & C)
 * Structured Evidence Parsing, AST-Based Inspection & Electoral Event Reconciliation
 *
 * Replaces regex-based source extraction with TypeScript Compiler API AST parsing.
 * Evaluates source AST nodes safely without eval() or regex pattern assumptions.
 */

import ts from 'typescript';

/**
 * Safely evaluates a TypeScript AST expression node into a JavaScript value.
 * Handles literals (strings, numbers, booleans, null), unary expressions (-num),
 * array literals, and object literals with nested properties.
 */
export function evaluateAstNode(node, sourceFile) {
  if (!node) return undefined;

  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return node.text;

    case ts.SyntaxKind.NumericLiteral:
      return Number(node.text);

    case ts.SyntaxKind.TrueKeyword:
      return true;

    case ts.SyntaxKind.FalseKeyword:
      return false;

    case ts.SyntaxKind.NullKeyword:
      return null;

    case ts.SyntaxKind.PrefixUnaryExpression: {
      const operandVal = evaluateAstNode(node.operand, sourceFile);
      if (node.operator === ts.SyntaxKind.MinusToken && typeof operandVal === 'number') {
        return -operandVal;
      }
      if (node.operator === ts.SyntaxKind.PlusToken && typeof operandVal === 'number') {
        return +operandVal;
      }
      return operandVal;
    }

    case ts.SyntaxKind.ArrayLiteralExpression:
      return node.elements.map((element) => evaluateAstNode(element, sourceFile));

    case ts.SyntaxKind.ObjectLiteralExpression: {
      const obj = {};
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) {
          let key;
          if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) || ts.isNumericLiteral(prop.name)) {
            key = prop.name.text;
          } else {
            key = prop.name.getText(sourceFile);
          }
          obj[key] = evaluateAstNode(prop.initializer, sourceFile);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          const key = prop.name.text;
          obj[key] = undefined;
        }
      }
      return obj;
    }

    case ts.SyntaxKind.Identifier:
      if (node.text === 'undefined') return undefined;
      if (node.text === 'NaN') return NaN;
      if (node.text === 'Infinity') return Infinity;
      return node.text;

    case ts.SyntaxKind.AsExpression:
    case ts.SyntaxKind.TypeAssertionExpression:
      return evaluateAstNode(node.expression, sourceFile);

    case ts.SyntaxKind.ParenthesizedExpression:
      return evaluateAstNode(node.expression, sourceFile);

    default:
      return undefined;
  }
}

/**
 * Parses TypeScript source code into a ts.SourceFile.
 */
export function parseTsSource(sourceText, fileName = 'source.ts') {
  return ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/**
 * Finds all variable declarations in a TypeScript AST.
 * Returns an array of { name, node, initializer }.
 */
export function findVariableDeclarations(sourceFile) {
  const declarations = [];

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      declarations.push({
        name: node.name.text,
        node,
        initializer: node.initializer,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return declarations;
}

/**
 * WORKSTREAM B: Structural Affidavit Store Parser
 * Parses SEED_AFFIDAVITS from apps/mobile/stores/affidavits.ts using AST.
 */
export function inspectAffidavitsAst(sourceText, stateCode, statutorySeats, fileName = 'affidavits.ts') {
  const sourceFile = parseTsSource(sourceText, fileName);
  const vars = findVariableDeclarations(sourceFile);
  const seedAffVar = vars.find((v) => v.name === 'SEED_AFFIDAVITS');

  if (!seedAffVar || !seedAffVar.initializer || !ts.isArrayLiteralExpression(seedAffVar.initializer)) {
    return {
      total: 0,
      totalAffidavitsInStore: 0,
      presentInFileCount: 0,
      structurallyValidCount: 0,
      identityValidatedCount: 0,
      sourceProvenanceRecordedCount: 0,
      verified: 0,
      officiallyVerifiedCount: 0,
      canonicalDatabaseBacked: false,
      formallyAccepted: false,
      pending: 0,
      records: [],
      syntacticParseSuccess: true,
      parseErrors: ['SEED_AFFIDAVITS array declaration not found in AST'],
    };
  }

  const rawElements = seedAffVar.initializer.elements;
  const stateRecords = [];
  let presentInFileCount = 0;
  let structurallyValidCount = 0;
  let identityValidatedCount = 0;
  let sourceProvenanceRecordedCount = 0;
  const seenIds = new Set();
  const parseErrors = [];

  for (const element of rawElements) {
    if (!ts.isObjectLiteralExpression(element)) {
      parseErrors.push('Element in SEED_AFFIDAVITS is not an ObjectLiteral');
      continue;
    }

    const obj = evaluateAstNode(element, sourceFile);
    if (!obj || typeof obj !== 'object') continue;

    if (obj.stateCode !== stateCode) continue;

    presentInFileCount++;

    // Validate required fields and field types
    const hasValidId = typeof obj.id === 'string' && obj.id.trim().length > 0;
    const hasValidName = typeof obj.candidateName === 'string' && obj.candidateName.trim().length > 0;
    const hasValidAcNo = typeof obj.acNo === 'number' && Number.isInteger(obj.acNo);
    const hasValidCName = typeof obj.constituencyName === 'string' && obj.constituencyName.trim().length > 0;
    const hasValidSource = typeof obj.sourceUrl === 'string' && obj.sourceUrl.trim().length > 0;

    if (hasValidId && hasValidName && hasValidAcNo && hasValidCName && hasValidSource) {
      structurallyValidCount++;

      const isStatutory = obj.acNo >= 1 && obj.acNo <= statutorySeats;
      const isUnique = !seenIds.has(obj.id);

      if (isStatutory && isUnique) {
        identityValidatedCount++;
        seenIds.add(obj.id);

        const isHttpUrl = obj.sourceUrl.startsWith('http://') || obj.sourceUrl.startsWith('https://');
        if (isHttpUrl) {
          sourceProvenanceRecordedCount++;
        }

        stateRecords.push({
          id: obj.id,
          candidateName: obj.candidateName,
          acNo: obj.acNo,
          constituencyName: obj.constituencyName,
          sourceUrl: obj.sourceUrl,
          status: 'SOURCE_PROVENANCE_RECORDED_LOCAL_SEED',
        });
      }
    }
  }

  return {
    total: stateRecords.length,
    totalAffidavitsInStore: stateRecords.length,
    presentInFileCount,
    structurallyValidCount,
    identityValidatedCount,
    sourceProvenanceRecordedCount,
    verified: 0, // Zero affidavits in store have undergone live statutory ECI/DB verification
    officiallyVerifiedCount: 0,
    canonicalDatabaseBacked: false,
    formallyAccepted: false,
    pending: stateRecords.length,
    records: stateRecords,
    syntacticParseSuccess: true,
    parseErrors: parseErrors.slice(0, 5),
  };
}

/**
 * WORKSTREAM B: Structural MLA Profiles Parser
 * Parses data/seed/*-mla-profiles.ts using AST.
 */
export function inspectMlaProfilesAst(sourceText, statutorySeats, fileName = 'mla-profiles.ts') {
  const sourceFile = parseTsSource(sourceText, fileName);
  const vars = findVariableDeclarations(sourceFile);

  const arrayVars = vars.filter(
    (v) => v.initializer && ts.isArrayLiteralExpression(v.initializer) && !v.name.includes('Map')
  );

  const validRecords = [];
  const uniqueAcs = new Set();
  const duplicateAcs = [];
  let extraNonStatutory = 0;
  let malformedCount = 0;
  let totalEvaluated = 0;

  for (const arrayVar of arrayVars) {
    const rawElements = arrayVar.initializer.elements;
    for (const element of rawElements) {
      totalEvaluated++;
      if (!ts.isObjectLiteralExpression(element)) {
        malformedCount++;
        continue;
      }

      const obj = evaluateAstNode(element, sourceFile);
      if (!obj || typeof obj !== 'object') {
        malformedCount++;
        continue;
      }

      const acNo = obj.acNo;
      const name = obj.name;

      if (typeof acNo === 'number' && Number.isInteger(acNo) && typeof name === 'string' && name.trim().length > 0) {
        if (uniqueAcs.has(acNo)) {
          duplicateAcs.push(acNo);
        } else {
          uniqueAcs.add(acNo);
          if (acNo >= 1 && acNo <= statutorySeats) {
            validRecords.push({ acNo, name });
          } else {
            extraNonStatutory++;
          }
        }
      } else {
        malformedCount++;
      }
    }
  }

  return {
    uniqueProfilesCount: uniqueAcs.size,
    resolvedToStatutoryAcCount: validRecords.length,
    extraNonStatutoryProfiles: extraNonStatutory,
    duplicateProfilesCount: duplicateAcs.length,
    malformedProfilesCount: malformedCount,
    totalEvaluated,
  };
}

/**
 * WORKSTREAM C: Reconcile Historical Election Evidence
 * Extracts structured per-constituency election records from data/seed/*-historical-results.ts using AST.
 * Binds winner, runner-up, votes, margin, and election type to the same election event.
 * Preserves null when unevidenced. Never infers GENERAL from year alone.
 */
export function inspectHistoricalResultsAst(sourceText, statutorySeats, fileName = 'historical-results.ts') {
  const sourceFile = parseTsSource(sourceText, fileName);
  const vars = findVariableDeclarations(sourceFile);

  const arrayVars = vars.filter(
    (v) => v.initializer && ts.isArrayLiteralExpression(v.initializer) && !v.name.includes('Map')
  );

  const demonstrableYears = new Set();
  const reconciledEventsByYear = new Map();
  let malformedRecordCount = 0;

  for (const arrayVar of arrayVars) {
    const varName = arrayVar.name;
    // Discover potential year from array identifier if declared as a year-specific collection
    const yearMatch = varName.match(/(?:19|20)\d\d/);
    const collectionYear = yearMatch ? parseInt(yearMatch[0], 10) : null;

    const rawElements = arrayVar.initializer.elements;
    // Empty arrays cannot establish a historical year
    if (rawElements.length === 0) continue;

    const validRecordsInArray = [];

    for (const element of rawElements) {
      if (!ts.isObjectLiteralExpression(element)) {
        malformedRecordCount++;
        continue;
      }

      const obj = evaluateAstNode(element, sourceFile);
      if (!obj || typeof obj !== 'object') {
        malformedRecordCount++;
        continue;
      }

      // Check required fields for a historical election record: acNo, name, winner, party
      const hasAc = typeof obj.acNo === 'number' && Number.isInteger(obj.acNo);
      const hasName = typeof obj.name === 'string' && obj.name.trim().length > 0;
      const hasWinner = typeof obj.winner === 'string' && obj.winner.trim().length > 0;
      const hasParty = typeof obj.party === 'string' && obj.party.trim().length > 0;

      if (!hasAc || !hasName || !hasWinner || !hasParty) {
        malformedRecordCount++;
        continue;
      }

      // Record-level year takes precedence over collection-level year
      let eventYear = null;
      if (typeof obj.electionYear === 'number' && Number.isInteger(obj.electionYear)) {
        eventYear = obj.electionYear;
      } else if (typeof obj.year === 'number' && Number.isInteger(obj.year)) {
        eventYear = obj.year;
      } else if (collectionYear != null) {
        eventYear = collectionYear;
      }

      // If year is unknown, cannot establish historical election event
      if (eventYear == null || eventYear < 1947 || eventYear > 2030) {
        continue;
      }

      // Check statutory range
      if (obj.acNo < 1 || obj.acNo > statutorySeats) {
        continue;
      }

      // Reconcile election metrics and election type: strictly preserve null when unevidenced!
      const electionType =
        obj.electionType === 'BYPOLL' ? 'BYPOLL' : obj.electionType === 'GENERAL' ? 'GENERAL' : null;

      const runnerUp = typeof obj.runnerUp === 'string' ? obj.runnerUp : (typeof obj.runnerUpName === 'string' ? obj.runnerUpName : null);
      const votes = typeof obj.votes === 'number' ? obj.votes : (typeof obj.winnerVotes === 'number' ? obj.winnerVotes : null);
      const margin = typeof obj.margin === 'number' ? obj.margin : null; // Preserves numeric 0

      const reconciledRecord = {
        acNo: obj.acNo,
        constituencyName: obj.name,
        eventYear,
        electionType,
        winner: obj.party,
        winnerName: obj.winner,
        winnerVotes: votes,
        runnerUp,
        margin,
      };

      validRecordsInArray.push(reconciledRecord);
    }

    // Only count year if valid per-constituency records actually establish it
    if (validRecordsInArray.length > 0) {
      for (const rec of validRecordsInArray) {
        demonstrableYears.add(rec.eventYear);
        if (!reconciledEventsByYear.has(rec.eventYear)) {
          reconciledEventsByYear.set(rec.eventYear, []);
        }
        reconciledEventsByYear.get(rec.eventYear).push(rec);
      }
    }
  }

  const sortedYears = Array.from(demonstrableYears).sort((a, b) => b - a);

  return {
    demonstrablePerAcYears: sortedYears,
    totalHistoricalYears: sortedYears.length,
    eventsByYear: Object.fromEntries(reconciledEventsByYear),
    malformedRecordCount,
  };
}
