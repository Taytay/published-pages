(function (root, factory) {
  var api = factory();
  root.StringCleaner = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function toNonNegativeInteger(value) {
    var number = Number(value);
    if (!isFinite(number) || number < 0) {
      return 0;
    }
    return Math.floor(number);
  }

  function applyLineBoxCleanup(str, options) {
    var removeFirstLines = toNonNegativeInteger(options.removeFirstLines);
    var removeLastLines = toNonNegativeInteger(options.removeLastLines);
    var removeFirstChars = toNonNegativeInteger(options.removeFirstChars);
    var removeLastChars = toNonNegativeInteger(options.removeLastChars);

    if (!removeFirstLines && !removeLastLines && !removeFirstChars && !removeLastChars) {
      return str;
    }

    var lines = str.split(/\r\n|\r|\n/);

    if (removeFirstLines) {
      lines = lines.slice(removeFirstLines);
    }

    if (removeLastLines) {
      lines = removeLastLines >= lines.length ? [] : lines.slice(0, lines.length - removeLastLines);
    }

    if (removeFirstChars || removeLastChars) {
      lines = lines.map(function (line) {
        var trimmedLine = removeFirstChars >= line.length ? '' : line.slice(removeFirstChars);
        if (!removeLastChars) {
          return trimmedLine;
        }
        return removeLastChars >= trimmedLine.length ? '' : trimmedLine.slice(0, trimmedLine.length - removeLastChars);
      });
    }

    return lines.join('\n');
  }

  function stripHtmlTags(str) {
    var result = '';
    var insideTag = false;
    var i;

    for (i = 0; i < str.length; i += 1) {
      if (str.charAt(i) === '<') {
        insideTag = true;
        continue;
      }
      if (str.charAt(i) === '>' && insideTag) {
        insideTag = false;
        continue;
      }
      if (!insideTag) {
        result += str.charAt(i);
      }
    }

    return result;
  }

  function stripTagBlock(str, tagName) {
    var openNeedle = '<' + tagName;
    var closeNeedle = '</' + tagName + '>';
    var lower = str.toLowerCase();
    var start = lower.indexOf(openNeedle);

    while (start !== -1) {
      var openEnd = lower.indexOf('>', start);
      if (openEnd === -1) {
        return str.slice(0, start);
      }

      var end = lower.indexOf(closeNeedle, openEnd + 1);
      if (end === -1) {
        return str.slice(0, start);
      }

      str = str.slice(0, start) + str.slice(end + closeNeedle.length);
      lower = str.toLowerCase();
      start = lower.indexOf(openNeedle, start);
    }

    return str;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isInvisibleCode(code) {
    return (code >= 0 && code <= 31) || code === 127 || (code >= 128 && code <= 159);
  }

  function toHexByte(code) {
    var hex = code.toString(16).toUpperCase();
    return hex.length === 1 ? '0' + hex : hex;
  }

  function visualizeText(str, options) {
    var settings = options || {};
    var text = String(str);
    var result = '';
    var i;

    for (i = 0; i < text.length; i += 1) {
      var ch = text.charAt(i);
      var code = text.charCodeAt(i);

      if (settings.showWhitespace) {
        if (ch === ' ') {
          result += '·';
          continue;
        }
        if (ch === '\t') {
          result += '⇥\t';
          continue;
        }
        if (ch === '\r') {
          result += '␍';
          continue;
        }
        if (ch === '\n') {
          result += '↵\n';
          continue;
        }
      }

      if (settings.showInvisible && ch !== '\t' && ch !== '\r' && ch !== '\n' && isInvisibleCode(code)) {
        result += '\\x' + toHexByte(code);
        continue;
      }

      result += ch;
    }

    return result;
  }

  function buildLineParts(str) {
    var text = String(str);
    var parts = [];
    var start = 0;
    var i = 0;

    while (i < text.length) {
      var ch = text.charAt(i);
      if (ch === '\r' || ch === '\n') {
        var newlineStart = i;
        var newline = ch;
        if (ch === '\r' && text.charAt(i + 1) === '\n') {
          newline = '\r\n';
          i += 1;
        }
        parts.push({
          text: text.slice(start, newlineStart),
          newline: newline
        });
        start = i + 1;
      }
      i += 1;
    }

    parts.push({
      text: text.slice(start),
      newline: ''
    });

    return parts;
  }

  function renderNewlineMarker(newline, options) {
    if (!newline || !options || !options.showWhitespace) {
      return '';
    }
    if (newline === '\r\n') {
      return '␍↵';
    }
    if (newline === '\r') {
      return '␍';
    }
    return '↵';
  }

  function wrapDiffSpan(type, html) {
    if (!html) {
      return '';
    }
    if (type === 'add') {
      return '<span class="diff-added">' + html + '</span>';
    }
    if (type === 'remove') {
      return '<span class="diff-removed">' + html + '</span>';
    }
    return html;
  }

  function renderTextHtml(str, options) {
    return escapeHtml(visualizeText(str, options));
  }

  function buildDisplayHtml(str, options) {
    var parts = buildLineParts(str);
    var rows = [];
    var i;

    for (i = 0; i < parts.length; i += 1) {
      rows.push(
        '<div class="display-line">' +
          '<span class="line-number">' + (i + 1) + '</span>' +
          '<span class="line-content">' +
            renderTextHtml(parts[i].text, options) +
            escapeHtml(renderNewlineMarker(parts[i].newline, options)) +
          '</span>' +
        '</div>'
      );
    }

    return rows.join('');
  }

  function collapseDiffOps(ops) {
    return ops.reduce(function (result, op) {
      var previous = result[result.length - 1];
      if (previous && previous.type === op.type) {
        previous.text += op.text;
      } else if (op.text) {
        result.push({
          type: op.type,
          text: op.text
        });
      }
      return result;
    }, []);
  }

  function buildFallbackDiffOps(fromText, toText) {
    var start = 0;
    var fromEnd = fromText.length;
    var toEnd = toText.length;
    var ops = [];

    while (start < fromEnd && start < toEnd && fromText.charAt(start) === toText.charAt(start)) {
      start += 1;
    }

    while (fromEnd > start && toEnd > start && fromText.charAt(fromEnd - 1) === toText.charAt(toEnd - 1)) {
      fromEnd -= 1;
      toEnd -= 1;
    }

    if (start) {
      ops.push({ type: 'equal', text: fromText.slice(0, start) });
    }
    if (fromEnd > start) {
      ops.push({ type: 'remove', text: fromText.slice(start, fromEnd) });
    }
    if (toEnd > start) {
      ops.push({ type: 'add', text: toText.slice(start, toEnd) });
    }
    if (fromEnd < fromText.length) {
      ops.push({ type: 'equal', text: fromText.slice(fromEnd) });
    }

    return ops;
  }

  function buildDiffOps(fromText, toText) {
    var a = String(fromText);
    var b = String(toText);
    var i;
    var j;

    if (a === b) {
      return [{ type: 'equal', text: a }];
    }

    if (!a) {
      return [{ type: 'add', text: b }];
    }

    if (!b) {
      return [{ type: 'remove', text: a }];
    }

    if (a.length * b.length > 250000) {
      return buildFallbackDiffOps(a, b);
    }

    var matrix = new Array(a.length + 1);
    for (i = 0; i <= a.length; i += 1) {
      matrix[i] = new Array(b.length + 1);
      matrix[i][0] = 0;
    }
    for (j = 0; j <= b.length; j += 1) {
      matrix[0][j] = 0;
    }

    for (i = 1; i <= a.length; i += 1) {
      for (j = 1; j <= b.length; j += 1) {
        if (a.charAt(i - 1) === b.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
        } else {
          matrix[i][j] = matrix[i - 1][j] >= matrix[i][j - 1] ? matrix[i - 1][j] : matrix[i][j - 1];
        }
      }
    }

    var ops = [];
    i = a.length;
    j = b.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a.charAt(i - 1) === b.charAt(j - 1)) {
        ops.push({ type: 'equal', text: a.charAt(i - 1) });
        i -= 1;
        j -= 1;
      } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
        ops.push({ type: 'add', text: b.charAt(j - 1) });
        j -= 1;
      } else {
        ops.push({ type: 'remove', text: a.charAt(i - 1) });
        i -= 1;
      }
    }

    return collapseDiffOps(ops.reverse());
  }

  function buildDiffHtml(fromText, toText, options) {
    return buildDiffOps(fromText, toText).map(function (op) {
      return wrapDiffSpan(op.type, renderTextHtml(op.text, options));
    }).join('');
  }

  function buildDiffDisplayHtml(fromText, toText, options) {
    var ops = buildDiffOps(fromText, toText);
    var rows = [];
    var lineHtml = '';
    var lineNumber = 1;

    function pushLine() {
      rows.push(
        '<div class="display-line">' +
          '<span class="line-number">' + lineNumber + '</span>' +
          '<span class="line-content">' + lineHtml + '</span>' +
        '</div>'
      );
      lineHtml = '';
      lineNumber += 1;
    }

    ops.forEach(function (op) {
      buildLineParts(op.text).forEach(function (part) {
        var contentHtml = wrapDiffSpan(op.type, renderTextHtml(part.text, options));
        var newlineHtml = wrapDiffSpan(op.type, escapeHtml(renderNewlineMarker(part.newline, options)));

        lineHtml += contentHtml + newlineHtml;
        if (part.newline) {
          pushLine();
        }
      });
    });

    pushLine();

    return rows.join('');
  }

  function cleanString(str, options) {
    var text = String(str);
    var settings = options || {};
    var urlDecodeError = false;

    if (settings.urlDecode) {
      try {
        text = decodeURIComponent(text);
      } catch (e) {
        urlDecodeError = true;
      }
    }
    if (settings.stripHtml) {
      text = stripTagBlock(text, 'script');
      text = stripTagBlock(text, 'style');
      text = stripHtmlTags(text);
    }
    if (settings.nonPrintable) {
      text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F]/g, '');
    }

    text = applyLineBoxCleanup(text, settings);

    if (settings.tabs) {
      text = text.replace(/\t/g, '');
    }
    if (settings.newlines) {
      text = text.replace(/\r\n|\r|\n/g, '');
    }
    if (settings.removeAllWhitespace) {
      // Removing all whitespace is intentionally stronger than collapsing spaces.
      text = text.replace(/\s+/g, '');
    } else if (settings.collapseSpaces) {
      text = text.replace(/ {2,}/g, ' ');
    }
    if (settings.trim) {
      text = text.trim();
    }

    return {
      text: text,
      urlDecodeError: urlDecodeError
    };
  }

  return {
    cleanString: cleanString,
    visualizeText: visualizeText,
    buildDisplayHtml: buildDisplayHtml,
    buildDiffHtml: buildDiffHtml,
    buildDiffDisplayHtml: buildDiffDisplayHtml
  };
});
