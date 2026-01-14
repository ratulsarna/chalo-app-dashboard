const fs = require("node:fs/promises");
const path = require("node:path");

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function lastSegment(dottedIdent) {
  const parts = String(dottedIdent).split(".");
  return parts[parts.length - 1] || "";
}

function uniqSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function applyTransform(value, transform) {
  if (!transform) return value;
  if (transform === "lowercase") return value.toLowerCase();
  if (transform === "uppercase") return value.toUpperCase();
  return value;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursive(rootDir, { extensions, ignoreDirNames }) {
  const out = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;

    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (ignoreDirNames.has(entry.name)) continue;
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.has(ext)) out.push(fullPath);
    }
  }

  return out.sort((a, b) => a.localeCompare(b));
}

function tokenizeKotlin(sourceText) {
  const tokens = [];
  const text = String(sourceText);
  let i = 0;
  let line = 1;

  function push(kind, raw, value) {
    const tok = { kind, raw, line };
    if (kind === "string") tok.value = value;
    tokens.push(tok);
  }

  while (i < text.length) {
    const ch = text[i];

    if (ch === "\n") {
      line += 1;
      i += 1;
      continue;
    }

    if (ch === "\r" || ch === "\t" || ch === " ") {
      i += 1;
      continue;
    }

    // Line comment
    if (ch === "/" && text[i + 1] === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }

    // Block comment
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length) {
        if (text[i] === "\n") line += 1;
        if (text[i] === "*" && text[i + 1] === "/") {
          i += 2;
          break;
        }
        i += 1;
      }
      continue;
    }

    // Raw string literal """..."""
    if (ch === '"' && text.slice(i, i + 3) === '"""') {
      const startLine = line;
      let j = i + 3;
      while (j < text.length && text.slice(j, j + 3) !== '"""') {
        if (text[j] === "\n") line += 1;
        j += 1;
      }
      const raw = text.slice(i, Math.min(text.length, j + 3));
      const value = text.slice(i + 3, Math.min(text.length, j));
      push("string", raw, value);
      i = Math.min(text.length, j + 3);
      // `line` already updated while scanning.
      if (startLine !== line) {
        // no-op; just keeping lints happy (line is authoritative).
      }
      continue;
    }

    // Standard string literal "..."
    if (ch === '"') {
      let j = i + 1;
      let value = "";
      while (j < text.length) {
        const c = text[j];
        if (c === "\n") line += 1;
        if (c === "\\") {
          const next = text[j + 1];
          if (next === undefined) break;
          if (next === "n") value += "\n";
          else if (next === "r") value += "\r";
          else if (next === "t") value += "\t";
          else value += next;
          j += 2;
          continue;
        }
        if (c === '"') {
          j += 1;
          break;
        }
        value += c;
        j += 1;
      }
      const raw = text.slice(i, j);
      push("string", raw, value);
      i = j;
      continue;
    }

    // Identifiers (allow dotted refs)
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
      let j = i + 1;
      while (j < text.length) {
        const c = text[j];
        const isAlphaNum =
          (c >= "a" && c <= "z") ||
          (c >= "A" && c <= "Z") ||
          (c >= "0" && c <= "9") ||
          c === "_" ||
          c === ".";
        if (!isAlphaNum) break;
        j += 1;
      }
      const raw = text.slice(i, j);
      push("ident", raw);
      i = j;
      continue;
    }

    // Single-character symbols
    push("sym", ch);
    i += 1;
  }

  return tokens;
}

function joinScopeNames(scopes) {
  const names = scopes.map((s) => s.name).filter(Boolean);
  return names.length ? names.join(".") : "";
}

function extractConstStringIndex(tokens, filePath) {
  const out = [];

  // Track object scopes to disambiguate `const val` names like `PRODUCT_TYPE` across different objects.
  const scopeStack = [];
  let braceDepth = 0;
  let pendingObject = null;

  for (let i = 0; i < tokens.length - 2; i += 1) {
    const t = tokens[i];

    // Detect named object declarations: `object Foo { ... }`
    if (t.kind === "ident" && t.raw === "object") {
      const prev = tokens[i - 1];
      // Skip `companion object {}` (no stable name for our purposes).
      if (prev && prev.kind === "ident" && prev.raw === "companion") continue;

      const nameTok = tokens[i + 1];
      if (nameTok && nameTok.kind === "ident") {
        pendingObject = { name: nameTok.raw, atDepth: braceDepth, line: nameTok.line };
      }
      continue;
    }

    if (t.kind === "sym" && t.raw === "{") {
      const nextDepth = braceDepth + 1;
      if (pendingObject && pendingObject.atDepth === braceDepth) {
        scopeStack.push({ kind: "object", name: pendingObject.name, depth: nextDepth, line: pendingObject.line });
        pendingObject = null;
      }
      braceDepth = nextDepth;
      continue;
    }

    if (t.kind === "sym" && t.raw === "}") {
      // Pop any scopes ending at this brace depth.
      while (scopeStack.length && scopeStack[scopeStack.length - 1]?.depth === braceDepth) scopeStack.pop();
      braceDepth = Math.max(0, braceDepth - 1);
      pendingObject = null;
      continue;
    }

    if (t.kind !== "ident" || t.raw !== "const") continue;
    if (tokens[i + 1]?.kind !== "ident" || tokens[i + 1]?.raw !== "val") continue;
    const nameTok = tokens[i + 2];
    if (!nameTok || nameTok.kind !== "ident") continue;

    // Scan forward (handles optional type annotations).
    let eqIndex = -1;
    for (let j = i + 3; j < Math.min(tokens.length, i + 30); j += 1) {
      if (tokens[j]?.kind === "sym" && tokens[j]?.raw === "=") {
        eqIndex = j;
        break;
      }
    }
    if (eqIndex === -1) continue;
    const valueTok = tokens[eqIndex + 1];
    if (!valueTok || valueTok.kind !== "string") continue;

    const scopePrefix = joinScopeNames(scopeStack);
    const qualifiedName = scopePrefix ? `${scopePrefix}.${nameTok.raw}` : nameTok.raw;

    out.push({
      name: nameTok.raw,
      qualifiedName,
      value: valueTok.value,
      filePath,
      line: nameTok.line,
    });
  }
  return out;
}

function parseEnumConstructorParamNames(tokens, openParenIndex) {
  const out = [];
  let depth = 0;
  for (let i = openParenIndex; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.kind === "sym" && t.raw === "(") {
      depth += 1;
      continue;
    }
    if (t.kind === "sym" && t.raw === ")") {
      depth -= 1;
      if (depth === 0) return { names: out, closeParenIndex: i };
      continue;
    }
    if (depth !== 1) continue;
    if (t.kind === "ident" && (t.raw === "val" || t.raw === "var")) {
      const nameTok = tokens[i + 1];
      if (nameTok && nameTok.kind === "ident") out.push(nameTok.raw);
    }
  }
  return { names: out, closeParenIndex: -1 };
}

function parseEnumEntryArgs(tokens, openParenIndex) {
  const values = [];
  let depth = 0;
  let current = [];
  for (let i = openParenIndex; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.kind === "sym" && t.raw === "(") {
      depth += 1;
      if (depth === 1) continue;
    }
    if (t.kind === "sym" && t.raw === ")") {
      depth -= 1;
      if (depth === 0) {
        if (current.length) values.push(current);
        return { args: values, closeParenIndex: i };
      }
    }
    if (depth !== 1) continue;
    if (t.kind === "sym" && t.raw === ",") {
      values.push(current);
      current = [];
      continue;
    }
    current.push(t);
  }
  return { args: values, closeParenIndex: -1 };
}

function tokensToFirstStringLiteral(tokens) {
  for (const t of tokens) {
    if (t.kind === "string") return t.value;
  }
  return undefined;
}

function extractEnumIndex(tokens, filePath) {
  const enums = [];

  for (let i = 0; i < tokens.length - 2; i += 1) {
    if (tokens[i].kind !== "ident" || tokens[i].raw !== "enum") continue;
    if (tokens[i + 1].kind !== "ident" || tokens[i + 1].raw !== "class") continue;
    const nameTok = tokens[i + 2];
    if (!nameTok || nameTok.kind !== "ident") continue;
    const enumName = nameTok.raw;

    let cursor = i + 3;
    let paramNames = [];
    if (tokens[cursor] && tokens[cursor].kind === "sym" && tokens[cursor].raw === "(") {
      const parsed = parseEnumConstructorParamNames(tokens, cursor);
      paramNames = parsed.names;
      cursor = parsed.closeParenIndex > -1 ? parsed.closeParenIndex + 1 : cursor + 1;
    }

    // Find enum body start.
    while (cursor < tokens.length && !(tokens[cursor].kind === "sym" && tokens[cursor].raw === "{")) {
      cursor += 1;
    }
    if (cursor >= tokens.length) continue;

    const bodyStart = cursor;
    cursor += 1;
    let braceDepth = 1;
    let bodyEnd = -1;
    for (; cursor < tokens.length; cursor += 1) {
      const t = tokens[cursor];
      if (t.kind === "sym" && t.raw === "{") braceDepth += 1;
      if (t.kind === "sym" && t.raw === "}") braceDepth -= 1;
      if (braceDepth === 0) {
        bodyEnd = cursor;
        break;
      }
    }
    if (bodyEnd === -1) continue;

    // Entries appear at top-level of enum body, before the first ';' (if any).
    const entriesTokens = [];
    let entryBraceDepth = 1;
    let parenDepth = 0;
    for (let j = bodyStart + 1; j < bodyEnd; j += 1) {
      const t = tokens[j];
      if (t.kind === "sym" && t.raw === "{") entryBraceDepth += 1;
      if (t.kind === "sym" && t.raw === "}") entryBraceDepth -= 1;
      if (entryBraceDepth !== 1) continue;

      if (t.kind === "sym" && t.raw === "(") parenDepth += 1;
      if (t.kind === "sym" && t.raw === ")") parenDepth -= 1;

      if (parenDepth === 0 && t.kind === "sym" && t.raw === ";") break;
      entriesTokens.push(t);
    }

    const entries = [];
    const entryArgsByName = {};
    for (let j = 0; j < entriesTokens.length; j += 1) {
      const prev = entriesTokens[j - 1];
      const t = entriesTokens[j];
      if (t.kind !== "ident") continue;
      if (prev && prev.kind === "sym" && prev.raw === "@") continue;

      // Entry names are usually UPPER_SNAKE_CASE, but allow other leading caps as well.
      if (!/^[A-Z][A-Za-z0-9_]*$/.test(t.raw)) continue;

      const next = entriesTokens[j + 1];
      if (next && (next.kind !== "sym" || !["(", ",", "}"].includes(next.raw))) continue;

      const entryName = t.raw;
      if (!entries.includes(entryName)) entries.push(entryName);

      if (next && next.raw === "(") {
        const parsed = parseEnumEntryArgs(entriesTokens, j + 1);
        if (parsed.closeParenIndex > -1 && paramNames.length > 0) {
          const argValuesByParam = {};
          for (let argIndex = 0; argIndex < Math.min(paramNames.length, parsed.args.length); argIndex += 1) {
            const param = paramNames[argIndex];
            const firstString = tokensToFirstStringLiteral(parsed.args[argIndex]);
            if (typeof firstString === "string") argValuesByParam[param] = firstString;
          }
          if (Object.keys(argValuesByParam).length > 0) entryArgsByName[entryName] = argValuesByParam;
        }
      }
    }

    enums.push({
      name: enumName,
      entries,
      entryArgsByName,
      filePath,
    });
  }

  return enums;
}

function extractFunctionContexts(tokens) {
  const functions = [];

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const t = tokens[i];
    if (t.kind !== "ident" || t.raw !== "fun") continue;

    // Find the parameter list.
    let cursor = i + 1;
    let openParen = -1;
    for (; cursor < Math.min(tokens.length, i + 80); cursor += 1) {
      const tok = tokens[cursor];
      if (tok.kind === "sym" && tok.raw === "(") {
        openParen = cursor;
        break;
      }
    }
    if (openParen === -1) continue;

    // Parse parameters.
    const paramTypes = {};
    let depth = 0;
    for (let j = openParen; j < tokens.length; j += 1) {
      const tok = tokens[j];
      if (tok.kind === "sym" && tok.raw === "(") {
        depth += 1;
        continue;
      }
      if (tok.kind === "sym" && tok.raw === ")") {
        depth -= 1;
        if (depth === 0) {
          cursor = j + 1;
          break;
        }
        continue;
      }
      if (depth !== 1) continue;

      // paramName : Type
      if (tok.kind !== "ident") continue;
      const maybeColon = tokens[j + 1];
      const maybeType = tokens[j + 2];
      if (!maybeColon || maybeColon.kind !== "sym" || maybeColon.raw !== ":") continue;
      if (!maybeType || maybeType.kind !== "ident") continue;
      const typeRaw = maybeType.raw;
      const baseType = lastSegment(typeRaw.split("<")[0].replace(/\?+$/u, ""));
      paramTypes[tok.raw] = baseType;
    }

    // Find body start: either { ... } or expression-bodied (=).
    let bodyStart = -1;
    for (; cursor < Math.min(tokens.length, cursor + 80); cursor += 1) {
      const tok = tokens[cursor];
      if (tok.kind === "sym" && tok.raw === "{") {
        bodyStart = cursor;
        break;
      }
      if (tok.kind === "sym" && tok.raw === "=") {
        // Expression-bodied function; no useful scope for our purposes.
        bodyStart = -1;
        break;
      }
    }
    if (bodyStart === -1) continue;

    // Find matching closing brace.
    let braceDepth = 0;
    let bodyEnd = -1;
    for (let j = bodyStart; j < tokens.length; j += 1) {
      const tok = tokens[j];
      if (tok.kind === "sym" && tok.raw === "{") braceDepth += 1;
      if (tok.kind === "sym" && tok.raw === "}") braceDepth -= 1;
      if (braceDepth === 0) {
        bodyEnd = j;
        break;
      }
    }
    if (bodyEnd === -1) continue;

    functions.push({
      startLine: t.line,
      endLine: tokens[bodyEnd].line,
      bodyStartIndex: bodyStart,
      bodyEndIndex: bodyEnd,
      paramTypes,
    });
  }

  return functions;
}

function findContainingFunction(functions, line) {
  let best = null;
  for (const fn of functions) {
    if (line < fn.startLine || line > fn.endLine) continue;
    if (!best) {
      best = fn;
      continue;
    }
    const bestSize = best.endLine - best.startLine;
    const size = fn.endLine - fn.startLine;
    if (size < bestSize) best = fn;
  }
  return best;
}

function extractAssignments(tokens) {
  const out = [];

  function isValueToken(t) {
    return t && (t.kind === "ident" || t.kind === "string");
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];

    // KEY to VALUE
    if (t.kind === "ident" && t.raw === "to") {
      const keyTok = tokens[i - 1];
      const valueTok = tokens[i + 1];
      if (isValueToken(keyTok) && isValueToken(valueTok)) {
        out.push({
          kind: "to",
          key: keyTok,
          value: valueTok,
          keyIndex: i - 1,
          valueIndex: i + 1,
          line: t.line,
        });
      }
    }

    // map[KEY] = VALUE
    if (t.kind === "sym" && t.raw === "[") {
      const keyTok = tokens[i + 1];
      const close = tokens[i + 2];
      const eq = tokens[i + 3];
      const valueTok = tokens[i + 4];
      if (
        isValueToken(keyTok) &&
        close &&
        close.kind === "sym" &&
        close.raw === "]" &&
        eq &&
        eq.kind === "sym" &&
        eq.raw === "=" &&
        isValueToken(valueTok)
      ) {
        out.push({
          kind: "bracket",
          key: keyTok,
          value: valueTok,
          keyIndex: i + 1,
          valueIndex: i + 4,
          line: t.line,
        });
      }
    }
  }

  return out;
}

function resolveKeyString(keyTok, constIndex) {
  if (!keyTok) return undefined;
  if (keyTok.kind === "string") return keyTok.value;
  if (keyTok.kind === "ident") {
    return resolveConstString(keyTok.raw, constIndex);
  }
  return undefined;
}

function resolveConstString(identRaw, constIndex) {
  if (constIndex.has(identRaw)) return constIndex.get(identRaw)?.value;
  const name = lastSegment(identRaw);
  return constIndex.get(name)?.value;
}

function resolveStaticEnumNameExpression(identRaw) {
  // e.g. SomeEnum.ONLINE.name
  const parts = identRaw.split(".");
  const nameIndex = parts.findIndex((p) => p === "name");
  if (nameIndex !== -1 && nameIndex >= 2) {
    const entry = parts[nameIndex - 1];
    const transform = parts[nameIndex + 1];
    if (/^[A-Z0-9_]+$/.test(entry)) {
      return [applyTransform(entry, transform)];
    }
  }
  return undefined;
}

function resolveEnumPropertyExpression(identRaw, enumIndex) {
  // e.g. Source.LOGIN_OPTIONS_SCREEN.sourceName
  const parts = identRaw.split(".");
  const transform = parts[parts.length - 1];

  // Handle ...sourceName[.lowercase/.uppercase]
  const supportedTransforms = new Set(["lowercase", "uppercase"]);
  const hasTransform = supportedTransforms.has(parts[parts.length - 1]);
  const propertyName = hasTransform ? parts[parts.length - 2] : parts[parts.length - 1];

  if (!propertyName || parts.length < (hasTransform ? 4 : 3)) return undefined;

  const enumType = parts[0];
  const entry = parts[1];
  if (!enumType || !entry || !/^[A-Z0-9_]+$/.test(entry)) return undefined;

  const info = enumIndex.get(enumType);
  if (!info) return undefined;

  const byEntry = info.entryArgsByName?.[entry];
  if (!byEntry || !isRecord(byEntry)) return undefined;

  const rawValue = byEntry[propertyName];
  if (typeof rawValue !== "string") return undefined;

  const transformName = hasTransform ? transform : undefined;
  return [applyTransform(rawValue, transformName)];
}

function resolveVarDerivedEnumValues(valueIdentRaw, { functionCtx, enumIndex, maxEnumEntries, expandLargeEnums }) {
  // e.g. cardTransactionType.name (where cardTransactionType: CardTransactionTypeUiModel)
  const parts = valueIdentRaw.split(".");
  if (parts.length < 2) return undefined;
  const varName = parts[0];
  const propertyName = parts[1];

  const supportedTransforms = new Set(["lowercase", "uppercase"]);
  const hasTransform = supportedTransforms.has(parts[2]);
  const transformName = hasTransform ? parts[2] : undefined;

  if (!functionCtx || !functionCtx.paramTypes) return undefined;
  const typeName = functionCtx.paramTypes[varName];
  if (!typeName) return undefined;
  const enumInfo = enumIndex.get(typeName);
  if (!enumInfo) return undefined;

  if (propertyName === "name") {
    const entries = enumInfo.entries ?? [];
    if (!expandLargeEnums && entries.length > maxEnumEntries) return undefined;
    return entries.map((entry) => applyTransform(entry, transformName));
  }

  const entryArgsByName = enumInfo.entryArgsByName ?? {};
  if (!isRecord(entryArgsByName)) return undefined;
  const out = [];
  for (const entryName of enumInfo.entries ?? []) {
    const args = entryArgsByName[entryName];
    if (!isRecord(args)) continue;
    const raw = args[propertyName];
    if (typeof raw !== "string") continue;
    out.push(applyTransform(raw, transformName));
  }
  if (out.length === 0) return undefined;
  if (!expandLargeEnums && out.length > maxEnumEntries) return undefined;
  return out;
}

function unionSets(a, b) {
  const out = new Set(a ? Array.from(a) : []);
  for (const item of b ? Array.from(b) : []) out.add(item);
  return out;
}

function consumeCallParens(tokens, index, stopIndex) {
  const open = tokens[index + 1];
  if (!open || open.kind !== "sym" || open.raw !== "(") return index;
  let depth = 0;
  for (let i = index + 1; i <= stopIndex; i += 1) {
    const t = tokens[i];
    if (t.kind === "sym" && t.raw === "(") depth += 1;
    if (t.kind === "sym" && t.raw === ")") depth -= 1;
    if (depth === 0) return i;
  }
  return index;
}

function resolveLocalStringBinding(identRaw, localBindings) {
  if (!localBindings) return undefined;
  const supportedTransforms = new Set(["lowercase", "uppercase"]);
  const parts = String(identRaw).split(".");
  if (parts.length === 1) {
    const values = localBindings.get(parts[0]);
    if (values && values.length) return values;
    return undefined;
  }

  if (parts.length === 2 && supportedTransforms.has(parts[1])) {
    const base = localBindings.get(parts[0]);
    if (!base || base.length === 0) return undefined;
    return base.map((v) => applyTransform(v, parts[1]));
  }

  if (parts.length === 2 && parts[1] === "toString") {
    const base = localBindings.get(parts[0]);
    if (base && base.length) return base;
  }

  return undefined;
}

function stripToStringSuffix(raw) {
  const suffix = ".toString";
  if (raw.endsWith(suffix)) return raw.slice(0, -suffix.length);
  return undefined;
}

function resolveIdentToStrings(valueIdentRaw, opts) {
  const { constIndex, enumIndex, functionCtx, localBindings, maxEnumEntries, expandLargeEnums } = opts;

  // Local variable resolution first (closest to actual Kotlin scoping).
  const local = resolveLocalStringBinding(valueIdentRaw, localBindings);
  if (local) return { values: uniqSorted(local) };

  // Treat `.toString` as an identity for our purposes.
  const withoutToString = stripToStringSuffix(valueIdentRaw);
  if (withoutToString) {
    const inner = resolveIdentToStrings(withoutToString, opts);
    if (inner.values) return inner;
  }

  // 1) const val resolution (preferred)
  const asConst = resolveConstString(valueIdentRaw, constIndex);
  if (typeof asConst === "string") return { values: [asConst] };

  // 2) static enum entry `.name` (e.g., Foo.BAR.name)
  const asStaticEnumName = resolveStaticEnumNameExpression(valueIdentRaw);
  if (asStaticEnumName) return { values: asStaticEnumName };

  // 3) static enum property mapping (e.g., Source.LOGIN_OPTIONS_SCREEN.sourceName)
  const asEnumProp = resolveEnumPropertyExpression(valueIdentRaw, enumIndex);
  if (asEnumProp) return { values: asEnumProp };

  // 4) var-derived enum values via function parameter types (e.g., x.name where x: SomeEnum)
  const asVarEnum = resolveVarDerivedEnumValues(valueIdentRaw, {
    functionCtx,
    enumIndex,
    maxEnumEntries,
    expandLargeEnums,
  });
  if (asVarEnum) return { values: uniqSorted(asVarEnum) };

  return { values: undefined, reason: "unresolved_expression" };
}

function resolveStringLiteralWithPostfix(tokens, index, stopIndex) {
  const tok = tokens[index];
  if (!tok || tok.kind !== "string") return { values: undefined, endIndex: index, reason: "not_string" };

  let value = tok.value;
  let endIndex = index;

  const dot = tokens[index + 1];
  const method = tokens[index + 2];
  if (dot && dot.kind === "sym" && dot.raw === "." && method && method.kind === "ident") {
    const name = method.raw;
    if (name === "lowercase" || name === "uppercase") {
      value = applyTransform(value, name);
      endIndex = index + 2;
      endIndex = consumeCallParens(tokens, endIndex, stopIndex);
    } else if (name === "toString") {
      endIndex = index + 2;
      endIndex = consumeCallParens(tokens, endIndex, stopIndex);
    }
  }

  return { values: [value], endIndex };
}

function resolveExpressionAt(tokens, startIndex, opts) {
  const { stopIndex } = opts;
  const startTok = tokens[startIndex];
  if (!startTok) return { values: undefined, endIndex: startIndex, reason: "missing_expression" };

  if (startTok.kind === "string") {
    return resolveStringLiteralWithPostfix(tokens, startIndex, stopIndex);
  }

  if (startTok.kind === "ident" && startTok.raw === "if") {
    return resolveIfExpression(tokens, startIndex, opts);
  }

  if (startTok.kind === "ident" && startTok.raw === "when") {
    return resolveWhenExpression(tokens, startIndex, opts);
  }

  if (startTok.kind === "sym" && startTok.raw === "{") {
    return resolveBlockExpression(tokens, startIndex, opts);
  }

  if (startTok.kind === "ident") {
    const resolved = resolveIdentToStrings(startTok.raw, opts);
    const endIndex = consumeCallParens(tokens, startIndex, stopIndex);
    if (resolved.values) return { values: resolved.values, endIndex };
    return { values: undefined, endIndex, reason: resolved.reason ?? "unresolved_expression" };
  }

  return { values: undefined, endIndex: startIndex, reason: "unsupported_expression" };
}

function resolveIfExpression(tokens, ifIndex, opts) {
  const { stopIndex } = opts;

  // Find condition parens.
  let cursor = ifIndex + 1;
  while (cursor <= stopIndex && !(tokens[cursor]?.kind === "sym" && tokens[cursor]?.raw === "(")) cursor += 1;
  if (cursor > stopIndex) return { values: undefined, endIndex: ifIndex, reason: "if_missing_condition" };

  let parenDepth = 0;
  let closeParen = -1;
  for (let i = cursor; i <= stopIndex; i += 1) {
    const t = tokens[i];
    if (t.kind === "sym" && t.raw === "(") parenDepth += 1;
    if (t.kind === "sym" && t.raw === ")") parenDepth -= 1;
    if (parenDepth === 0) {
      closeParen = i;
      break;
    }
  }
  if (closeParen === -1) return { values: undefined, endIndex: ifIndex, reason: "if_unclosed_condition" };

  const thenStart = closeParen + 1;
  const thenResolved = resolveExpressionAt(tokens, thenStart, opts);
  const thenValues = thenResolved.values ? new Set(thenResolved.values) : new Set();

  // Find `else` token following the then-expression.
  let braceDepth = 0;
  parenDepth = 0;
  let elseIndex = -1;
  for (let i = thenResolved.endIndex + 1; i <= stopIndex; i += 1) {
    const t = tokens[i];
    if (t.kind === "sym" && t.raw === "{") braceDepth += 1;
    if (t.kind === "sym" && t.raw === "}") braceDepth -= 1;
    if (t.kind === "sym" && t.raw === "(") parenDepth += 1;
    if (t.kind === "sym" && t.raw === ")") parenDepth -= 1;
    if (braceDepth === 0 && parenDepth === 0 && t.kind === "ident" && t.raw === "else") {
      elseIndex = i;
      break;
    }
  }
  if (elseIndex === -1) {
    const reason = thenResolved.reason ? `if_missing_else:${thenResolved.reason}` : "if_missing_else";
    return { values: thenResolved.values, endIndex: thenResolved.endIndex, reason };
  }

  const elseStart = elseIndex + 1;
  const elseResolved = resolveExpressionAt(tokens, elseStart, opts);
  const elseValues = elseResolved.values ? new Set(elseResolved.values) : new Set();

  const union = unionSets(thenValues, elseValues);
  const values = union.size ? uniqSorted(Array.from(union)) : undefined;

  if (values) return { values, endIndex: elseResolved.endIndex };

  const reasonParts = [];
  if (thenResolved.reason) reasonParts.push(`then:${thenResolved.reason}`);
  if (elseResolved.reason) reasonParts.push(`else:${elseResolved.reason}`);
  return { values: undefined, endIndex: elseResolved.endIndex, reason: reasonParts.join(",") || "if_unresolved" };
}

function resolveWhenExpression(tokens, whenIndex, opts) {
  const { stopIndex } = opts;

  // Locate body start `{` (supports both `when(x) {}` and `when {}`).
  let cursor = whenIndex + 1;
  if (tokens[cursor]?.kind === "sym" && tokens[cursor]?.raw === "(") {
    let parenDepth = 0;
    for (let i = cursor; i <= stopIndex; i += 1) {
      const t = tokens[i];
      if (t.kind === "sym" && t.raw === "(") parenDepth += 1;
      if (t.kind === "sym" && t.raw === ")") parenDepth -= 1;
      if (parenDepth === 0) {
        cursor = i + 1;
        break;
      }
    }
  }

  while (cursor <= stopIndex && !(tokens[cursor]?.kind === "sym" && tokens[cursor]?.raw === "{")) cursor += 1;
  if (cursor > stopIndex) return { values: undefined, endIndex: whenIndex, reason: "when_missing_body" };

  const bodyStart = cursor;
  let braceDepth = 0;
  let bodyEnd = -1;
  for (let i = bodyStart; i <= stopIndex; i += 1) {
    const t = tokens[i];
    if (t.kind === "sym" && t.raw === "{") braceDepth += 1;
    if (t.kind === "sym" && t.raw === "}") braceDepth -= 1;
    if (braceDepth === 0) {
      bodyEnd = i;
      break;
    }
  }
  if (bodyEnd === -1) return { values: undefined, endIndex: bodyStart, reason: "when_unclosed_body" };

  const values = new Set();
  const reasonParts = [];

  braceDepth = 0;
  let parenDepth = 0;
  for (let i = bodyStart + 1; i < bodyEnd; i += 1) {
    const t = tokens[i];
    if (t.kind === "sym" && t.raw === "{") braceDepth += 1;
    if (t.kind === "sym" && t.raw === "}") braceDepth -= 1;
    if (t.kind === "sym" && t.raw === "(") parenDepth += 1;
    if (t.kind === "sym" && t.raw === ")") parenDepth -= 1;

    if (braceDepth !== 0 || parenDepth !== 0) continue;
    const next = tokens[i + 1];
    if (!next) continue;
    if (t.kind === "sym" && t.raw === "-" && next.kind === "sym" && next.raw === ">") {
      const exprStart = i + 2;
      const branch = resolveExpressionAt(tokens, exprStart, { ...opts, stopIndex: bodyEnd });
      if (branch.values) {
        for (const v of branch.values) values.add(v);
      } else if (branch.reason) {
        reasonParts.push(branch.reason);
      }
      i = branch.endIndex;
    }
  }

  const out = values.size ? uniqSorted(Array.from(values)) : undefined;
  return {
    values: out,
    endIndex: bodyEnd,
    reason: out ? undefined : reasonParts.join(",") || "when_unresolved",
  };
}

function resolveBlockExpression(tokens, blockIndex, opts) {
  const { stopIndex } = opts;
  let braceDepth = 0;
  let blockEnd = -1;
  for (let i = blockIndex; i <= stopIndex; i += 1) {
    const t = tokens[i];
    if (t.kind === "sym" && t.raw === "{") braceDepth += 1;
    if (t.kind === "sym" && t.raw === "}") braceDepth -= 1;
    if (braceDepth === 0) {
      blockEnd = i;
      break;
    }
  }
  if (blockEnd === -1) return { values: undefined, endIndex: blockIndex, reason: "block_unclosed" };

  const values = new Set();
  const reasons = [];

  // Collect explicit returns.
  for (let i = blockIndex + 1; i < blockEnd; i += 1) {
    const t = tokens[i];
    if (t.kind === "ident" && t.raw === "return") {
      const exprStart = i + 1;
      const returned = resolveExpressionAt(tokens, exprStart, { ...opts, stopIndex: blockEnd });
      if (returned.values) for (const v of returned.values) values.add(v);
      else if (returned.reason) reasons.push(returned.reason);
      i = returned.endIndex;
    }
  }

  if (values.size > 0) {
    return { values: uniqSorted(Array.from(values)), endIndex: blockEnd };
  }

  // Fallback: treat the last top-level expression as the block value.
  braceDepth = 0;
  let lastCandidate = null;
  for (let i = blockIndex + 1; i < blockEnd; i += 1) {
    const t = tokens[i];
    if (t.kind === "sym" && t.raw === "{") braceDepth += 1;
    if (t.kind === "sym" && t.raw === "}") braceDepth -= 1;
    if (braceDepth !== 0) continue;
    if (t.kind === "string" || t.kind === "ident" || (t.kind === "sym" && t.raw === "{")) lastCandidate = i;
  }

  if (lastCandidate !== null) {
    const expr = resolveExpressionAt(tokens, lastCandidate, { ...opts, stopIndex: blockEnd });
    if (expr.values) return { values: expr.values, endIndex: blockEnd };
    return { values: undefined, endIndex: blockEnd, reason: expr.reason ?? "block_unresolved" };
  }

  return { values: undefined, endIndex: blockEnd, reason: reasons.join(",") || "block_unresolved" };
}

function extractLocalStringBindings(tokens, functionCtx, opts) {
  if (!functionCtx || typeof functionCtx.bodyStartIndex !== "number" || typeof functionCtx.bodyEndIndex !== "number") {
    return new Map();
  }

  const localBindings = new Map();
  const start = functionCtx.bodyStartIndex;
  const end = functionCtx.bodyEndIndex;

  for (let i = start; i <= end; i += 1) {
    const t = tokens[i];
    if (!t || t.kind !== "ident" || (t.raw !== "val" && t.raw !== "var")) continue;

    const nameTok = tokens[i + 1];
    if (!nameTok) continue;
    if (nameTok.kind === "sym" && nameTok.raw === "(") continue; // destructuring
    if (nameTok.kind !== "ident") continue;

    // Find '=' token for initializer (supports multi-line).
    let eqIndex = -1;
    for (let j = i + 2; j <= Math.min(end, i + 60); j += 1) {
      const tok = tokens[j];
      if (!tok) continue;
      if (tok.kind === "sym" && tok.raw === "=") {
        eqIndex = j;
        break;
      }
      // Stop if this looks like the declaration ended without an initializer.
      if (tok.kind === "sym" && tok.raw === ";") break;
    }
    if (eqIndex === -1) continue;

    const exprStart = eqIndex + 1;
    const resolved = resolveExpressionAt(tokens, exprStart, {
      ...opts,
      functionCtx,
      localBindings,
      stopIndex: end,
    });
    if (!resolved.values || resolved.values.length === 0) continue;

    const cleaned = resolved.values.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
    if (cleaned.length > 0) localBindings.set(nameTok.raw, uniqSorted(cleaned));
  }

  return localBindings;
}

async function buildIndices(files) {
  const constIndex = new Map();
  const enumIndex = new Map();
  const enumItemsByName = new Map();
  const constItems = [];

  for (const filePath of files) {
    let text = "";
    try {
      text = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }
    const tokens = tokenizeKotlin(text);

    for (const item of extractConstStringIndex(tokens, filePath)) {
      // First definition wins; Kotlin discourages duplicates, and we prefer stability.
      constItems.push(item);
      if (item.qualifiedName && !constIndex.has(item.qualifiedName)) constIndex.set(item.qualifiedName, item);
      if (!constIndex.has(item.name)) constIndex.set(item.name, item);
    }

    for (const e of extractEnumIndex(tokens, filePath)) {
      const list = enumItemsByName.get(e.name) ?? [];
      list.push(e);
      enumItemsByName.set(e.name, list);

      const existing = enumIndex.get(e.name);
      if (!existing) {
        enumIndex.set(e.name, e);
        continue;
      }

      // Prefer the enum with more entries. This helps when the same enum name exists in multiple packages
      // (e.g., a "Status" in a domain/use-case vs. the real app-model status enum).
      const existingCount = Array.isArray(existing.entries) ? existing.entries.length : 0;
      const nextCount = Array.isArray(e.entries) ? e.entries.length : 0;
      if (nextCount > existingCount) enumIndex.set(e.name, e);
    }
  }

  return { constIndex, constItems, enumIndex, enumItemsByName };
}

function uniqStrings(values) {
  return uniqSorted(
    values
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean),
  );
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function filterFilesByNeedles(files, needles) {
  const filtered = [];
  const cleanedNeedles = uniqStrings(needles);
  if (cleanedNeedles.length === 0) return filtered;

  // Single combined regex is significantly faster than N× `includes` in practice.
  const pattern = cleanedNeedles.map(escapeRegExp).join("|");
  const re = new RegExp(pattern);

  for (const filePath of files) {
    let text = "";
    try {
      text = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }
    if (re.test(text)) filtered.push(filePath);
  }

  return filtered;
}

async function extractPropertyValueCandidates({
  upstreamRepoPath,
  includeDirs = ["shared"],
  propertyKeys,
  eventNames,
  flowScope = false,
  flowSlug,
  propertyDomains,
  maxEnumEntries = 50,
  expandLargeEnums = false,
} = {}) {
  if (typeof upstreamRepoPath !== "string" || upstreamRepoPath.trim().length === 0) {
    throw new Error("upstreamRepoPath is required");
  }
  if (!Array.isArray(propertyKeys) || propertyKeys.length === 0) {
    throw new Error("propertyKeys must be a non-empty array");
  }

  const desired = new Set(propertyKeys);

  const ignoreDirNames = new Set([
    ".git",
    ".gradle",
    "build",
    "node_modules",
    "dist",
    "out",
    ".idea",
    ".kotlin",
    // Kotlin MPP / Android tests (exclude to avoid fixture/sample values polluting docs).
    "androidTest",
    "androidUnitTest",
    "commonTest",
    "iosTest",
    "jvmTest",
    "test",
    "tests",
    "__tests__",
  ]);
  const extensions = new Set([".kt", ".kts"]);

  const roots = [];
  for (const dir of includeDirs) {
    if (typeof dir !== "string" || dir.trim().length === 0) continue;
    const abs = path.isAbsolute(dir) ? dir : path.join(upstreamRepoPath, dir);
    if (await pathExists(abs)) roots.push(abs);
  }

  const files = [];
  for (const root of roots) {
    const listed = await listFilesRecursive(root, { extensions, ignoreDirNames });
    files.push(...listed);
  }

  const { constIndex, constItems, enumIndex, enumItemsByName } = await buildIndices(files);

  const eventNameList = uniqStrings(Array.isArray(eventNames) ? eventNames : []);
  let scopeEventConstNames = [];
  if (flowScope) {
    if (eventNameList.length === 0) throw new Error("flowScope requires a non-empty eventNames array");
    const byValue = new Set(eventNameList);
    scopeEventConstNames = Array.from(constIndex.values())
      .filter((item) => typeof item.value === "string" && byValue.has(item.value))
      .map((item) => item.name);
  }

  const assignmentFiles = flowScope
    ? await filterFilesByNeedles(files, [...eventNameList, ...scopeEventConstNames])
    : files;

  const valuesByKey = new Map();
  const unresolvedByKey = new Map();
  const domainByKey = new Map();
  const domainErrorsByKey = new Map();

  function normalizePath(p) {
    return String(p).replaceAll("\\", "/");
  }

  function resolveEnumForDomainSource(source) {
    const kind = source.kind;
    const enumName = kind === "enumName" ? source.name : source.enum;
    const name = typeof enumName === "string" ? enumName.trim() : "";
    if (!name) return undefined;

    const preferPath = typeof source.filePath === "string" ? source.filePath.trim() : "";
    if (preferPath) {
      const wantAbs = path.isAbsolute(preferPath) ? preferPath : path.join(upstreamRepoPath, preferPath);
      const want = normalizePath(wantAbs);
      const candidates = enumItemsByName.get(name) ?? [];
      const found = candidates.find((c) => normalizePath(c.filePath) === want);
      if (found) return found;
    }

    return enumIndex.get(name);
  }

  function addDomainValue(key, value, source) {
    const map = domainByKey.get(key) ?? new Map();
    const sources = map.get(value) ?? new Set();
    sources.add(source);
    map.set(value, sources);
    domainByKey.set(key, map);
  }

  function addDomainError(key, message) {
    const list = domainErrorsByKey.get(key) ?? [];
    list.push(String(message));
    domainErrorsByKey.set(key, list);
  }

  // Apply domain registry (authoritative finite sets) before scanning callsites.
  if (isRecord(propertyDomains)) {
    for (const key of propertyKeys) {
      const domainConfig = propertyDomains[key];
      const domainEntries = Array.isArray(domainConfig) ? domainConfig : [domainConfig];

      for (const entry of domainEntries) {
        if (!isRecord(entry)) continue;
        const flows = Array.isArray(entry.flows) ? entry.flows.map((f) => (typeof f === "string" ? f.trim() : "")).filter(Boolean) : [];
        if (flows.length > 0) {
          if (typeof flowSlug !== "string" || flowSlug.trim().length === 0) continue;
          if (!flows.includes(flowSlug.trim())) continue;
        }

        const sources = Array.isArray(entry.sources) ? entry.sources : [];
        for (const source of sources) {
          if (!isRecord(source)) continue;
        const kind = source.kind;
        if (kind === "enumName") {
          const enumName = typeof source.name === "string" ? source.name.trim() : "";
          if (!enumName) {
            addDomainError(key, "[enumName] missing name");
            continue;
          }
          const info = resolveEnumForDomainSource(source);
          if (!info || !Array.isArray(info.entries) || info.entries.length === 0) {
            addDomainError(key, `[enumName] enum not found or empty: ${enumName}`);
            continue;
          }
          for (const entry of info.entries) {
            const v = applyTransform(entry, source.transform);
            if (!v) continue;
            addDomainValue(key, v, { kind, name: enumName, filePath: info.filePath, transform: source.transform });
          }
          continue;
        }

        if (kind === "enumProperty") {
          const enumName = typeof source.enum === "string" ? source.enum.trim() : "";
          const prop = typeof source.property === "string" ? source.property.trim() : "";
          if (!enumName || !prop) {
            addDomainError(key, "[enumProperty] missing enum/property");
            continue;
          }
          const info = resolveEnumForDomainSource(source);
          if (!info || !Array.isArray(info.entries) || info.entries.length === 0) {
            addDomainError(key, `[enumProperty] enum not found or empty: ${enumName}`);
            continue;
          }

          const missing = [];
          for (const entry of info.entries) {
            const raw = info.entryArgsByName?.[entry]?.[prop];
            if (typeof raw !== "string") {
              missing.push(entry);
              continue;
            }
            const v = applyTransform(raw, source.transform);
            if (!v) continue;
            addDomainValue(key, v, {
              kind,
              enum: enumName,
              filePath: info.filePath,
              property: prop,
              transform: source.transform,
            });
          }
          if (missing.length > 0) {
            addDomainError(
              key,
              `[enumProperty] enum ${enumName} has entries without a string ${prop} value: ${missing.slice(0, 20).join(", ")}${
                missing.length > 20 ? ` (+${missing.length - 20} more)` : ""
              }`,
            );
          }
          continue;
        }

        if (kind === "const") {
          const name = typeof source.name === "string" ? source.name.trim() : "";
          if (!name) {
            addDomainError(key, "[const] missing name");
            continue;
          }
          const raw = resolveConstString(name, constIndex);
          if (typeof raw !== "string") {
            addDomainError(key, `[const] const not found: ${name}`);
            continue;
          }
          const v = applyTransform(raw, source.transform);
          if (!v) continue;
          addDomainValue(key, v, { kind, name, transform: source.transform });
          continue;
        }

        if (kind === "constPrefix") {
          const prefix = typeof source.prefix === "string" ? source.prefix : "";
          if (!prefix) {
            addDomainError(key, "[constPrefix] missing prefix");
            continue;
          }
          let matched = 0;
          for (const item of constItems) {
            const qn = typeof item.qualifiedName === "string" ? item.qualifiedName : item.name;
            if (!qn || !qn.startsWith(prefix)) continue;
            const v = applyTransform(item.value, source.transform);
            if (!v) continue;
            addDomainValue(key, v, { kind, prefix, transform: source.transform });
            matched += 1;
          }
          if (matched === 0) addDomainError(key, `[constPrefix] no consts matched prefix: ${prefix}`);
          continue;
        }

        if (kind === "literal") {
          const values = Array.isArray(source.values) ? source.values : [];
          if (values.length === 0) {
            addDomainError(key, "[literal] empty values[]");
            continue;
          }
          for (const raw of values) {
            const v = typeof raw === "string" ? applyTransform(raw, source.transform).trim() : "";
            if (!v) continue;
            addDomainValue(key, v, { kind, transform: source.transform });
          }
          continue;
        }

        addDomainError(key, `[domain] unknown kind: ${String(kind)}`);
      }
      }
    }
  }

  for (const filePath of assignmentFiles) {
    let text = "";
    try {
      text = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const tokens = tokenizeKotlin(text);
    const functions = extractFunctionContexts(tokens);
    const assignments = extractAssignments(tokens);
    const localBindingsCache = new Map();

    for (const item of assignments) {
      const keyString = resolveKeyString(item.key, constIndex);
      if (!keyString || !desired.has(keyString)) continue;

      const fn = findContainingFunction(functions, item.line);
      const stopIndex = fn && typeof fn.bodyEndIndex === "number" ? fn.bodyEndIndex : tokens.length - 1;
      const startTok = tokens[item.valueIndex];

      let localBindings = undefined;
      const mayNeedBindings =
        fn &&
        startTok &&
        ((startTok.kind === "ident" &&
          (startTok.raw === "if" || startTok.raw === "when" || /^[a-z]/.test(startTok.raw))) ||
          (startTok.kind === "sym" && startTok.raw === "{"));
      if (mayNeedBindings) {
        const cacheKey = `${fn.bodyStartIndex}:${fn.bodyEndIndex}`;
        localBindings = localBindingsCache.get(cacheKey);
        if (!localBindings) {
          localBindings = extractLocalStringBindings(tokens, fn, {
            constIndex,
            enumIndex,
            maxEnumEntries,
            expandLargeEnums,
          });
          localBindingsCache.set(cacheKey, localBindings);
        }
      }

      const resolved = resolveExpressionAt(tokens, item.valueIndex, {
        constIndex,
        enumIndex,
        functionCtx: fn,
        localBindings,
        maxEnumEntries,
        expandLargeEnums,
        stopIndex,
      });

      if (resolved.values && resolved.values.length) {
        for (const valueString of resolved.values) {
          const value = typeof valueString === "string" ? valueString.trim() : "";
          if (!value) continue;
          const keyMap = valuesByKey.get(keyString) ?? new Map();
          const occurrences = keyMap.get(value) ?? [];
          occurrences.push({
            filePath,
            line: item.line,
            keyExpr: item.key.raw,
            valueExpr: item.value.raw,
            kind: item.kind,
          });
          keyMap.set(value, occurrences);
          valuesByKey.set(keyString, keyMap);
        }
        continue;
      }

      const unresolved = unresolvedByKey.get(keyString) ?? [];
      unresolved.push({
        filePath,
        line: item.line,
        keyExpr: item.key.raw,
        valueExpr: item.value.raw,
        kind: item.kind,
        reason: resolved.reason ?? "unresolved",
      });
      unresolvedByKey.set(keyString, unresolved);
    }
  }

  const results = {};
  for (const key of propertyKeys) {
    const keyMap = valuesByKey.get(key);
    const observedValues = keyMap ? uniqSorted(Array.from(keyMap.keys())) : [];
    const unresolved = unresolvedByKey.get(key) ?? [];

    const evidence = {};
    if (keyMap) {
      for (const [value, occurrences] of keyMap.entries()) {
        evidence[value] = occurrences;
      }
    }

    const domainMap = domainByKey.get(key);
    const domainValues = domainMap ? uniqSorted(Array.from(domainMap.keys())) : [];
    const domainErrors = domainErrorsByKey.get(key) ?? [];
    const domainSources = {};
    if (domainMap) {
      for (const [value, sources] of domainMap.entries()) {
        domainSources[value] = Array.from(sources);
      }
    }

    let complete = unresolved.length === 0 && observedValues.length > 0;
    let values = observedValues;
    let domainMismatch = undefined;

    if (domainErrors.length === 0 && domainValues.length > 0) {
      const observedNotInDomain = observedValues.filter((v) => !domainMap.has(v));
      if (observedNotInDomain.length > 0) {
        domainMismatch = { observedNotInDomain };
        // Prefer observed values if the declared domain doesn't cover actual observed values.
        values = observedValues;
        complete = false;
      } else {
        values = domainValues;
        complete = true;
      }
    }

    results[key] = {
      complete,
      values,
      observedValues,
      evidence,
      unresolved,
      domain: domainValues.length
        ? {
            values: domainValues,
            sourcesByValue: domainSources,
            errors: domainErrors,
          }
        : undefined,
      domainMismatch,
    };
  }

  return {
    upstreamRepoPath,
    includeDirs,
    indexedFiles: files.length,
    scannedFiles: assignmentFiles.length,
    scopedByEvents: flowScope,
    eventNamesCount: eventNameList.length,
    eventConstNamesCount: scopeEventConstNames.length,
    maxEnumEntries,
    expandLargeEnums,
    results,
  };
}

module.exports = { extractPropertyValueCandidates };
