/**
 * scripts/lib/ast_data_parser.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 089 (Workstreams A, B, C)
 * Evidence-Truth Closure: Fail-Closed AST Parsing, Canonical Evidence Taxonomy & Historical Reconciliation
 *
 * Replaces regex-based extraction with strict TypeScript Compiler API AST parsing.
 * Evaluates source AST nodes safely without eval(), arbitrary execution, or pattern guessing.
 * Fails closed on syntax errors, unsupported AST expressions, and unevidenced historical years.
 */

import ts from 'typescript';

/**
 * Safely evaluates a TypeScript AST expression node into a JavaScript value.
 * Strict literal subset supported:
 * - String literals and no-substitution template literals
 * - Numeric literals (with or without numeric separators like 12_00_000)
 * - Booleans (true / false keywords)
 * - Null (null keyword)
 * - Prefix unary expressions (+ / - on numeric operands)
 * - Array literals of supported elements
 * - Object literals of supported properties
 * - Type assertions (as T, <T>expr) and parenthesized expressions
 * - Specific identifiers: undefined, NaN, Infinity
 *
 * Fails closed with explicit diagnostics for:
 * - Computed property keys ([computedKey]: val)
 * - Shorthand property assignments ({ shorthand })
 * - Spread assignments and elements (...spread)
 * - Variable identifiers / identifier references (MY_CONST)
 * - Binary expressions, function calls, property accesses
 */
export function evaluateAstNode(node, sourceFile, diagnostics = []) {
  if (!node) return undefined;

  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return node.text;

    case ts.SyntaxKind.NumericLiteral: {
      const cleanText = node.text.replace(/_/g, '');
      const num = Number(cleanText);
      if (!Number.isFinite(num) || isNaN(num)) {
        diagnostics.push({
          type: 'NON_FINITE_NUMERIC_LITERAL',
          text: node.text,
          message: `Numeric literal "${node.text}" is not a finite number`,
        });
        return NaN;
      }
      return num;
    }

    case ts.SyntaxKind.TrueKeyword:
      return true;

    case ts.SyntaxKind.FalseKeyword:
      return false;

    case ts.SyntaxKind.NullKeyword:
      return null;

    case ts.SyntaxKind.PrefixUnaryExpression: {
      const operandVal = evaluateAstNode(node.operand, sourceFile, diagnostics);
      if (node.operator === ts.SyntaxKind.MinusToken && typeof operandVal === 'number') {
        return -operandVal;
      }
      if (node.operator === ts.SyntaxKind.PlusToken && typeof operandVal === 'number') {
        return +operandVal;
      }
      diagnostics.push({
        type: 'UNSUPPORTED_PREFIX_OPERATOR',
        operator: node.operator,
        message: `Prefix unary operator ${node.operator} not supported on non-numeric operand`,
      });
      return undefined;
    }

    case ts.SyntaxKind.ArrayLiteralExpression: {
      const arr = [];
      for (const element of node.elements) {
        if (ts.isSpreadElement(element)) {
          diagnostics.push({
            type: 'UNSUPPORTED_SPREAD_ELEMENT',
            message: `Array spread element "...${element.expression.getText(sourceFile)}" is unsupported in strict literal subset`,
          });
          arr.push(undefined);
        } else {
          arr.push(evaluateAstNode(element, sourceFile, diagnostics));
        }
      }
      return arr;
    }

    case ts.SyntaxKind.ObjectLiteralExpression: {
      const obj = {};
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop)) {
          let key;
          if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) || ts.isNumericLiteral(prop.name)) {
            key = prop.name.text;
          } else if (ts.isComputedPropertyName(prop.name)) {
            diagnostics.push({
              type: 'UNSUPPORTED_COMPUTED_KEY',
              keyExpression: prop.name.expression.getText(sourceFile),
              message: `Computed property key "[${prop.name.expression.getText(sourceFile)}]" is unsupported in strict literal subset`,
            });
            continue;
          } else {
            key = prop.name.getText(sourceFile);
          }
          obj[key] = evaluateAstNode(prop.initializer, sourceFile, diagnostics);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          diagnostics.push({
            type: 'UNSUPPORTED_SHORTHAND_PROPERTY',
            property: prop.name.text,
            message: `Shorthand property "{ ${prop.name.text} }" is an identifier reference and unsupported in strict literal subset`,
          });
          obj[prop.name.text] = undefined;
        } else if (ts.isSpreadAssignment(prop)) {
          diagnostics.push({
            type: 'UNSUPPORTED_SPREAD_ASSIGNMENT',
            expression: prop.expression.getText(sourceFile),
            message: `Object spread assignment "...${prop.expression.getText(sourceFile)}" is unsupported in strict literal subset`,
          });
        } else {
          diagnostics.push({
            type: 'UNSUPPORTED_OBJECT_MEMBER',
            memberKind: prop.kind,
            message: `Unsupported object member kind: ${prop.kind}`,
          });
        }
      }
      return obj;
    }

    case ts.SyntaxKind.Identifier:
      if (node.text === 'undefined') return undefined;
      if (node.text === 'NaN') return NaN;
      if (node.text === 'Infinity') return Infinity;
      diagnostics.push({
        type: 'UNSUPPORTED_IDENTIFIER_REFERENCE',
        name: node.text,
        message: `Identifier "${node.text}" is a variable reference, not a literal value; unsupported in strict literal subset`,
      });
      return undefined;

    case ts.SyntaxKind.AsExpression:
    case ts.SyntaxKind.TypeAssertionExpression:
    case ts.SyntaxKind.ParenthesizedExpression:
      return evaluateAstNode(node.expression, sourceFile, diagnostics);

    default:
      diagnostics.push({
        type: 'UNSUPPORTED_AST_EXPRESSION',
        kind: node.kind,
        text: node.getText(sourceFile),
        message: `AST SyntaxKind ${node.kind} ("${node.getText(sourceFile)}") is unsupported in strict literal subset`,
      });
      return undefined;
  }
}

/**
 * Parses TypeScript source code into a ts.SourceFile and exposes parse diagnostics.
 * Fails closed if syntax errors are present.
 */
export function parseTsSource(sourceText, fileName = 'source.ts') {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const parseDiagnostics = (sourceFile.parseDiagnostics || []).map((d) => {
    let line = 0;
    let character = 0;
    if (d.file && typeof d.start === 'number') {
      const pos = d.file.getLineAndCharacterOfPosition(d.start);
      line = pos.line + 1;
      character = pos.character + 1;
    }
    const message = typeof d.messageText === 'string' ? d.messageText : d.messageText?.messageText || 'Unknown syntax error';
    return {
      code: d.code,
      message,
      line,
      character,
    };
  });

  return {
    sourceFile,
    parseDiagnostics,
    syntacticParseSuccess: parseDiagnostics.length === 0,
  };
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
 * Validates whether a URL string has valid HTTP or HTTPS protocol and well-formed structure.
 */
export function isValidHttpUrl(string) {
  if (typeof string !== 'string' || string.trim().length === 0) return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * WORKSTREAM B: Structural Affidavit Store Parser
 * Parses SEED_AFFIDAVITS from apps/mobile/stores/affidavits.ts using AST.
 * Strictly separates:
 * - syntacticParseSuccess (SourceFile syntax check)
 * - presentInFileCount (physically declared records)
 * - requiredFieldsValidCount (all 5 required fields present)
 * - structurallyValidCount (fields have valid types & zero unsupported AST expressions)
 * - urlFormatValidCount (sourceUrl is well-formed http/https URL)
 * - seatNumberInRangeCount (acNo is within 1..statutorySeats)
 * - identityValidatedCount (acNo is within statutory range, unique, and matched to statutory constituency)
 * - sourceProvenanceRecordedCount (source URL is valid HTTP/HTTPS)
 * - officiallyVerifiedCount: strictly 0 (local fixtures are not live ECI database verifications)
 */
export function inspectAffidavitsAst(sourceText, stateCode, statutorySeats, canonicalConstituencies = null, fileName = 'affidavits.ts') {
  const { sourceFile, parseDiagnostics, syntacticParseSuccess } = parseTsSource(sourceText, fileName);

  if (!syntacticParseSuccess) {
    return {
      total: 0,
      totalAffidavitsInStore: 0,
      presentInFileCount: 0,
      requiredFieldsValidCount: 0,
      structurallyValidCount: 0,
      urlFormatValidCount: 0,
      seatNumberInRangeCount: 0,
      identityValidatedCount: 0,
      identityUnresolvedCount: 0,
      sourceProvenanceRecordedCount: 0,
      verified: 0,
      officiallyVerifiedCount: 0,
      authoritativeVerified: false,
      canonicalDatabaseBacked: false,
      formallyAccepted: false,
      pending: 0,
      records: [],
      syntacticParseSuccess: false,
      parseDiagnostics,
      parseErrors: parseDiagnostics.map((d) => `Line ${d.line}:${d.character} [TS${d.code}]: ${d.message}`),
    };
  }

  const vars = findVariableDeclarations(sourceFile);
  const seedAffVar = vars.find((v) => v.name === 'SEED_AFFIDAVITS');

  if (!seedAffVar || !seedAffVar.initializer || !ts.isArrayLiteralExpression(seedAffVar.initializer)) {
    return {
      total: 0,
      totalAffidavitsInStore: 0,
      presentInFileCount: 0,
      requiredFieldsValidCount: 0,
      structurallyValidCount: 0,
      urlFormatValidCount: 0,
      seatNumberInRangeCount: 0,
      identityValidatedCount: 0,
      identityUnresolvedCount: 0,
      sourceProvenanceRecordedCount: 0,
      verified: 0,
      officiallyVerifiedCount: 0,
      authoritativeVerified: false,
      canonicalDatabaseBacked: false,
      formallyAccepted: false,
      pending: 0,
      records: [],
      syntacticParseSuccess: true,
      parseDiagnostics: [],
      parseErrors: ['SEED_AFFIDAVITS array declaration not found in AST'],
    };
  }

  const rawElements = seedAffVar.initializer.elements;
  const stateRecords = [];
  let presentInFileCount = 0;
  let requiredFieldsValidCount = 0;
  let structurallyValidCount = 0;
  let urlFormatValidCount = 0;
  let seatNumberInRangeCount = 0;
  let identityValidatedCount = 0;
  let identityUnresolvedCount = 0;
  let sourceProvenanceRecordedCount = 0;
  const seenIds = new Set();
  const parseErrors = [];

  for (const element of rawElements) {
    if (!ts.isObjectLiteralExpression(element)) {
      parseErrors.push('Element in SEED_AFFIDAVITS is not an ObjectLiteral');
      continue;
    }

    const elementDiagnostics = [];
    const obj = evaluateAstNode(element, sourceFile, elementDiagnostics);
    if (!obj || typeof obj !== 'object') continue;

    if (elementDiagnostics.length > 0) {
      for (const d of elementDiagnostics) {
        parseErrors.push(d.message || d.type);
      }
    }

    if (obj.stateCode !== stateCode) continue;

    presentInFileCount++;

    // Validate required fields presence
    const hasId = typeof obj.id === 'string' && obj.id.trim().length > 0;
    const hasName = typeof obj.candidateName === 'string' && obj.candidateName.trim().length > 0;
    const hasAcNo = typeof obj.acNo === 'number' && Number.isInteger(obj.acNo);
    const hasCName = typeof obj.constituencyName === 'string' && obj.constituencyName.trim().length > 0;
    const hasSource = typeof obj.sourceUrl === 'string' && obj.sourceUrl.trim().length > 0;

    if (hasId && hasName && hasAcNo && hasCName && hasSource) {
      requiredFieldsValidCount++;
    }

    // Structural validity: required fields valid AND zero unsupported AST expressions
    const isStructurallyValid = hasId && hasName && hasAcNo && hasCName && hasSource && elementDiagnostics.length === 0;
    if (isStructurallyValid) {
      structurallyValidCount++;
    }

    // URL format validity: strictly HTTP or HTTPS well-formed URL
    const urlValid = isStructurallyValid && isValidHttpUrl(obj.sourceUrl);
    if (urlValid) {
      urlFormatValidCount++;
      sourceProvenanceRecordedCount++;
    }

    // Seat number in range check
    const seatInRange = isStructurallyValid && obj.acNo >= 1 && obj.acNo <= statutorySeats;
    if (seatInRange) {
      seatNumberInRangeCount++;
    }

    // Statutory identity validation: seat in range, unique record ID, and matched canonical constituency
    if (seatInRange) {
      const isUnique = !seenIds.has(obj.id);
      if (isUnique) {
        seenIds.add(obj.id);

        let identityMatch = true;
        if (canonicalConstituencies && typeof canonicalConstituencies.has === 'function') {
          if (!canonicalConstituencies.has(obj.acNo)) {
            identityMatch = false;
          }
        }

        if (identityMatch) {
          identityValidatedCount++;
        } else {
          identityUnresolvedCount++;
        }

        const provenanceStatus = urlValid ? 'SOURCE_PROVENANCE_RECORDED_LOCAL_SEED' : 'PROVENANCE_UNRECORDED_INVALID_URL';
        stateRecords.push({
          id: obj.id,
          candidateName: obj.candidateName,
          acNo: obj.acNo,
          constituencyName: obj.constituencyName,
          sourceUrl: obj.sourceUrl,
          urlFormatValid: urlValid,
          status: provenanceStatus,
          sourceProvenanceStatus: provenanceStatus,
        });
      } else {
        identityUnresolvedCount++;
      }
    } else {
      identityUnresolvedCount++;
    }
  }

  return {
    total: stateRecords.length,
    totalAffidavitsInStore: stateRecords.length,
    presentInFileCount,
    requiredFieldsValidCount,
    structurallyValidCount,
    urlFormatValidCount,
    seatNumberInRangeCount,
    identityValidatedCount,
    identityUnresolvedCount,
    sourceProvenanceRecordedCount,
    verified: 0, // Zero affidavits in store have undergone live statutory ECI/DB verification
    officiallyVerifiedCount: 0,
    authoritativeVerified: false,
    canonicalDatabaseBacked: false,
    formallyAccepted: false,
    pending: stateRecords.length,
    records: stateRecords,
    syntacticParseSuccess: true,
    parseDiagnostics: [],
    parseErrors: parseErrors.slice(0, 5),
  };
}

/**
 * WORKSTREAM B: Structural MLA Profiles Parser
 * Parses data/seed/*-mla-profiles.ts using AST.
 */
export function inspectMlaProfilesAst(sourceText, statutorySeats, fileName = 'mla-profiles.ts') {
  const { sourceFile, parseDiagnostics, syntacticParseSuccess } = parseTsSource(sourceText, fileName);

  if (!syntacticParseSuccess) {
    return {
      uniqueProfilesCount: 0,
      resolvedToStatutoryAcCount: 0,
      seatNumberInRangeCount: 0,
      extraNonStatutoryProfiles: 0,
      duplicateProfilesCount: 0,
      malformedProfilesCount: 0,
      unsupportedAstCount: 0,
      totalEvaluated: 0,
      syntacticParseSuccess: false,
      parseDiagnostics,
    };
  }

  const vars = findVariableDeclarations(sourceFile);
  const arrayVars = vars.filter(
    (v) => v.initializer && ts.isArrayLiteralExpression(v.initializer) && !v.name.includes('Map')
  );

  const validRecords = [];
  const uniqueAcs = new Set();
  const duplicateAcs = [];
  let extraNonStatutory = 0;
  let malformedCount = 0;
  let unsupportedAstCount = 0;
  let totalEvaluated = 0;

  for (const arrayVar of arrayVars) {
    const rawElements = arrayVar.initializer.elements;
    for (const element of rawElements) {
      totalEvaluated++;
      if (!ts.isObjectLiteralExpression(element)) {
        malformedCount++;
        continue;
      }

      const elementDiagnostics = [];
      const obj = evaluateAstNode(element, sourceFile, elementDiagnostics);
      if (elementDiagnostics.length > 0) {
        unsupportedAstCount++;
        malformedCount++;
        continue;
      }
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
    seatNumberInRangeCount: validRecords.length,
    extraNonStatutoryProfiles: extraNonStatutory,
    duplicateProfilesCount: duplicateAcs.length,
    malformedProfilesCount: malformedCount,
    unsupportedAstCount,
    totalEvaluated,
    syntacticParseSuccess: true,
  };
}

/**
 * WORKSTREAM C: Reconcile Historical Election Evidence
 * Extracts structured per-constituency election records from data/seed/*-historical-results.ts using AST.
 *
 * Precedence Rule:
 * 1. Explicit record-level `electionYear` (if integer in 1947..2030)
 * 2. Explicit record-level `year` (if integer in 1947..2030)
 * 3. NO fallback to collection or variable identifier! If neither is present, record is yearless and eventYear is null.
 *
 * Binds winner, runner-up, votes, margin, and election type to the same election event.
 * Preserves null when unevidenced. Never infers GENERAL from year alone.
 * Preserves explicit numeric 0 margin.
 */
export function inspectHistoricalResultsAst(sourceText, statutorySeats, fileName = 'historical-results.ts') {
  const { sourceFile, parseDiagnostics, syntacticParseSuccess } = parseTsSource(sourceText, fileName);

  if (!syntacticParseSuccess) {
    return {
      demonstrablePerAcYears: [],
      totalHistoricalYears: 0,
      eventsByYear: {},
      malformedRecordCount: 0,
      yearlessRecordCount: 0,
      syntacticParseSuccess: false,
      parseDiagnostics,
    };
  }

  const vars = findVariableDeclarations(sourceFile);
  const arrayVars = vars.filter(
    (v) => v.initializer && ts.isArrayLiteralExpression(v.initializer) && !v.name.includes('Map')
  );

  const demonstrableYears = new Set();
  const reconciledEventsByYear = new Map();
  let malformedRecordCount = 0;
  let yearlessRecordCount = 0;
  const parseErrors = [];

  for (const arrayVar of arrayVars) {
    const rawElements = arrayVar.initializer.elements;
    if (rawElements.length === 0) continue;

    for (const element of rawElements) {
      if (!ts.isObjectLiteralExpression(element)) {
        malformedRecordCount++;
        continue;
      }

      const elementDiagnostics = [];
      const obj = evaluateAstNode(element, sourceFile, elementDiagnostics);
      if (elementDiagnostics.length > 0) {
        malformedRecordCount++;
        parseErrors.push(`Element contains unsupported AST: ${elementDiagnostics.map((d) => d.message).join('; ')}`);
        continue;
      }
      if (!obj || typeof obj !== 'object') {
        malformedRecordCount++;
        continue;
      }

      // Check required fields: acNo, name, winner, party
      const hasAc = typeof obj.acNo === 'number' && Number.isInteger(obj.acNo);
      const hasName = typeof obj.name === 'string' && obj.name.trim().length > 0;
      const hasWinner = typeof obj.winner === 'string' && obj.winner.trim().length > 0;
      const hasParty = typeof obj.party === 'string' && obj.party.trim().length > 0;

      if (!hasAc || !hasName || !hasWinner || !hasParty) {
        malformedRecordCount++;
        continue;
      }

      // Check conflicting record-level year fields
      if (
        obj.electionYear != null &&
        obj.year != null &&
        typeof obj.electionYear === 'number' &&
        typeof obj.year === 'number' &&
        obj.electionYear !== obj.year
      ) {
        malformedRecordCount++;
        parseErrors.push(`Record for AC ${obj.acNo} has conflicting electionYear (${obj.electionYear}) vs year (${obj.year})`);
        continue;
      }

      // Record-level year precedence: electionYear ?? year (STRICTLY NO COLLECTION IDENTIFIER FALLBACK)
      let eventYear = null;
      if (typeof obj.electionYear === 'number' && Number.isInteger(obj.electionYear)) {
        eventYear = obj.electionYear;
      } else if (typeof obj.year === 'number' && Number.isInteger(obj.year)) {
        eventYear = obj.year;
      }

      // If year is absent or outside valid constitutional democratic era, preserve as yearless
      if (eventYear == null || eventYear < 1947 || eventYear > 2030) {
        yearlessRecordCount++;
        continue; // Exclude yearless record from year-specific coverage counts
      }

      // Check statutory range
      if (obj.acNo < 1 || obj.acNo > statutorySeats) {
        continue;
      }

      // Validate numeric ranges on metrics
      if (typeof obj.votes === 'number' && obj.votes < 0) {
        malformedRecordCount++;
        continue;
      }
      if (typeof obj.margin === 'number' && obj.margin < 0) {
        malformedRecordCount++;
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

      demonstrableYears.add(eventYear);
      if (!reconciledEventsByYear.has(eventYear)) {
        reconciledEventsByYear.set(eventYear, []);
      }
      reconciledEventsByYear.get(eventYear).push(reconciledRecord);
    }
  }

  const sortedYears = Array.from(demonstrableYears).sort((a, b) => b - a);

  return {
    demonstrablePerAcYears: sortedYears,
    totalHistoricalYears: sortedYears.length,
    eventsByYear: Object.fromEntries(reconciledEventsByYear),
    malformedRecordCount,
    yearlessRecordCount,
    syntacticParseSuccess: true,
    parseDiagnostics: [],
    parseErrors: parseErrors.slice(0, 5),
  };
}
