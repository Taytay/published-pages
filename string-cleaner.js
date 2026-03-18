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
      text = text.replace(/<[^>]*>/g, '');
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
    cleanString: cleanString
  };
});
