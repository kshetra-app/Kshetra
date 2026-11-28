import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const displayProps = new Set([
  'accessibilityHint', 'accessibilityLabel', 'description', 'label', 'placeholder', 'title',
]);
const invariantText = new Set([
  'Poligram', 'POLIGRAM', 'KSHETRA', 'ECI', 'ECI ·', 'AP', 'TS', 'MCMC:', 'DLT:', 'PDI',
  'ROI', 'SC', 'ST', 'GEN', 'MRR', 'CSV', '· CSV', 'APK', 'IP', 'RTMP', 'SRT', 'HLS',
  'YYYY-MM-DD', '98480xxxxx',
]);

function isEnglishCopy(text) {
  const value = text.replaceAll('&gt;', '>').replaceAll('&lt;', '<').trim();
  return /[A-Za-z]{2,}/.test(value) && !invariantText.has(value) && !/^https?:\/\/\S+$/.test(value);
}

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(file);
    return file.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(file) ? [file] : [];
  });
}

export function scanScreenCopy(root = process.cwd()) {
  const files = ['app', 'components'].flatMap((area) =>
    filesIn(path.join(root, 'apps', 'mobile', area)),
  );
  const findings = [];
  for (const pathName of files) {
    const source = ts.createSourceFile(
      pathName, fs.readFileSync(pathName, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
    );
    const file = path.relative(root, pathName).split(path.sep).join('/');

    function add(node, kind, text) {
      if (!isEnglishCopy(text)) return;
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      findings.push({ file, line: line + 1, kind, text: text.trim(), start: node.getStart(source), end: node.end });
    }

    function expression(node, kind) {
      if (ts.isStringLiteralLike(node)) add(node, kind, node.text);
      if (ts.isTemplateExpression(node)) {
        add(node, kind, [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' '));
      }
      if (ts.isParenthesizedExpression(node)) expression(node.expression, kind);
      if (ts.isConditionalExpression(node)) {
        expression(node.whenTrue, kind);
        expression(node.whenFalse, kind);
      }
      if (ts.isBinaryExpression(node)) {
        const operator = node.operatorToken.kind;
        if (operator === ts.SyntaxKind.BarBarToken || operator === ts.SyntaxKind.QuestionQuestionToken) {
          expression(node.left, kind);
        }
        if ([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(operator)) {
          expression(node.right, kind);
        }
      }
    }

    function visit(node) {
      if (ts.isJsxText(node)) add(node, 'text', node.text);
      if (ts.isJsxAttribute(node) && displayProps.has(node.name.getText(source))) {
        const value = node.initializer;
        if (value && ts.isStringLiteral(value)) add(value, 'prop', value.text);
        if (value && ts.isJsxExpression(value) && value.expression) expression(value.expression, 'expression');
      }
      if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent)) {
        const name = node.parent.openingElement.tagName.getText(source);
        if (name === 'Text' || name.endsWith('.Text')) expression(node.expression, 'expression');
      }
      if (ts.isCallExpression(node) && node.expression.getText(source) === 'Alert.alert') {
        for (const argument of node.arguments.slice(0, 2)) expression(argument, 'alert');
        const buttons = node.arguments[2];
        if (buttons && ts.isArrayLiteralExpression(buttons)) {
          for (const button of buttons.elements) {
            if (!ts.isObjectLiteralExpression(button)) continue;
            const label = button.properties.find((entry) =>
              ts.isPropertyAssignment(entry) && entry.name.getText(source) === 'text',
            );
            if (label) expression(label.initializer, 'alert');
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return { files: files.length, findings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { files, findings } = scanScreenCopy();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ files, findings }, null, 2));
  } else {
    for (const { file, line, kind, text } of findings) console.error(file + ':' + line + ' [' + kind + '] ' + text);
    console.log('Scanned ' + files + ' mobile TSX files. Found ' + findings.length + ' unlocalized screen strings.');
  }
  if (findings.length) process.exitCode = 1;
}
