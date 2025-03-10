/*eslint eqeqeq: ["error", "smart"], no-extra-parens: off */

function parseDate(data) {    
    if (data instanceof Date) { return data; }
    if (data == "") { return new Date(); }

    const d = new Date(0);
    if (data === null || data === undefined) { return d; }

    let milliseconds = 0;

    //if data is formatted as "/Date(1234567890)/" then parse it
    if (data.startsWith("/Date(")) {
        milliseconds = data.substring(6, data.length - 2);
    }
    else {
        milliseconds = Date.parse(data);
    }

    milliseconds = Math.max(0, milliseconds);
    d.setUTCMilliseconds(parseInt(milliseconds));
   
    return (d);
}

function parseBool(data) {
    if (typeof (data) === "undefined") { return false; }
    switch (data.toString().toLowerCase()) {
        case "1":
        case "on":
        case "yes":
        case "y":
        case "true":
            return true;
        case "0":
        case "off":
        case "no":
        case "n":
        case "false":
            return false;
        default:
            return !!data;
    }
}

async function sleepAsync(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

HTMLInputElement.prototype.insertAtCaret = function (text) {
    text = text || '';
    if (this.selectionStart || this.selectionStart === 0) {
        const startPos = this.selectionStart;
        const endPos = this.selectionEnd;
        this.value = this.value.substring(0, startPos) +
            text +
            this.value.substring(endPos, this.value.length);
        this.selectionStart = startPos + text.length;
        this.selectionEnd = startPos + text.length;
    } else {
        this.value += text;
    }
    $(this).change();
    return this;
};

String.prototype.pad = function (size) {
    var s = String(this);
    if (typeof (size) !== "number") { size = 2; }

    while (s.length < size) { s = "0" + s; }
    return s;
};

Number.prototype.pad = String.prototype.pad;

String.prototype.deCamelCase = function () {
    return this.replace(/([a-z])([A-Z]+$)|([A-Z]+)([A-Z])|([a-z])([A-Z])/g, '$1$3$5 $2$4$6');
};

String.prototype.escapeRegExp = function () {
    const s = String(this);
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

Date.prototype.getTimestamp = function () {
    const lang = window.navigator.userLanguage || window.navigator.language;
    const options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: 'UTC'
    };

    return (this.toLocaleDateString(lang, options) + " " + this.toLocaleTimeString(lang));
};

Date.prototype.getDate = function () {
    const lang = window.navigator.userLanguage || window.navigator.language;
    const options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    };

    return (this.toLocaleDateString(lang, options));
};

Date.prototype.get24hTime = function () {
    const lang = window.navigator.userLanguage || window.navigator.language;
    const options = {
        hour12: false
    };

    return (this.toLocaleTimeString(lang, options));
};

var getParamValue = (function () {
    let params;
    const resetParams = function () {
        const query = window.location.search;
        const regex = /[?&;](.+?)=([^&;]+)/g;
        let match;

        params = {};

        if (query) {
            while ((match = regex.exec(query)) != null) {
                params[match[1]] = decodeURIComponent(match[2]);
            }
        }
    };

    window.addEventListener && window.addEventListener('popstate', resetParams);

    resetParams();

    return function (param) {
        return Object.prototype.hasOwnProperty.call(params, param) ? params[param] : null;
    };
})();

if (!Array.prototype.last) { Array.prototype.last = function () { return this.length < 1 ? null : this[this.length - 1]; }; }
if (!Array.prototype.first) { Array.prototype.first = function () { return this.length < 1 ? null : this[0]; }; }

//Fill for IE which doesn't support 'startsWith' / 'endsWith'
if (!String.prototype.startsWith) { String.prototype.startsWith = function (startsWith) { return this.indexOf(startsWith) === 0; }; }
if (!String.prototype.endsWith) { String.prototype.endsWith = function (endsWith) { return this.indexOf(endsWith) === (this.length - endsWith.length); }; }

String.prototype.contains = function (contains) { return this.indexOf(contains) > -1; };
Array.prototype.contains = function (contains) { return this.indexOf(contains) > -1; };
String.prototype.isEmptyOrWhitespace = function () { return this.match(/^\s*$/); };

String.prototype.format = function (args) {
    return this.replace(/\{(\w+)\}/g, function (match, key) {
        return typeof args[key] != 'undefined' ? args[key] : match;
    });
};

Array.prototype.groupBy = function (keySelector) {
    return this.reduce((result, currentValue) => {
        const key = keySelector(currentValue);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(currentValue);
        return result;
    }, {});
};

Array.prototype.distinct = function (keySelector) {
    const seen = new Set();
    return this.filter(item => {
        const key = keySelector(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

ko.bindingHandlers.enterPressed = {
    init: function (element, valueAccessor, _allBindings, viewModel) {
        const callback = valueAccessor();
        $(element).keypress(function (event) {
            const keyCode = (event.which ? event.which : event.keyCode);
            if (keyCode === 13) {
                callback.call(viewModel);
                return false;
            }
            return true;
        });
    }
};

ko.bindingHandlers.fadeVisible = {
    init: function (element, valueAccessor) {
        // Initially set the element to be instantly visible/hidden depending on the value
        const value = valueAccessor();
        $(element).toggle(ko.unwrap(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function (element, valueAccessor) {
        // Whenever the value subsequently changes, slowly fade the element in or out
        const value = valueAccessor();
        ko.unwrap(value) ? $(element).fadeIn() : $(element).fadeOut();
    }
};

ko.bindingHandlers.forcePush = {
    init: function (element, valueAccessor, _allBindings, viewModel) {
        const callback = valueAccessor();
        Pressure.set(element, {
            startDeepPress: function (event) {
                callback.call(viewModel, element, event);
            },
        });
    },
};

ko.bindingHandlers.element = {
    init: function (element, valueAccessor) {
        const target = valueAccessor();
        target(element);
    }
};

function getForm(selector) {
    const form = {};

    $(selector).find('[data-formfield]').each(function () {
        const self = $(this);
        const name = self.data("formfield");
        if (self.text() != null)
        {
            form[name] = self.text();
        }
    });

    $(selector).find(':input[name]:enabled, :input[data-formfield]:enabled').each(function () {
        const self = $(this);
        const name = self.attr('name') || self.data("formfield");

        if (self.is(":checkbox") || self.is(":radio")) {
            form[name] = self.is(":checked");
            return; //Logic: Behaves as continue since we're in a callback
        }

        if (form[name] !== "" && form[name] != null) {
            form[name] = form[name] + ',' + self.val();
        } else {
            form[name] = self.val();
        }
    });

    return form;
}

function setForm(selector, data) {
    $(selector).find('[data-formfield]').each(function () {
        const self = $(this);
        const name = self.data("formfield");

        if (data[name] != null) {
            const fieldType = self.data("formfieldtype");
            if (fieldType != null) {
                let displayValue = data[name];
                switch (fieldType) {
                    case "DateTime":
                        displayValue = parseDate(displayValue).getTimestamp();
                        break;
                }
                self.text(displayValue);
            }
            else {
                self.text(data[name]);
            }
        }
        else {
            self.text("");
        }
    });

    $(selector).find(':input[name]:enabled').each(function () {
        const self = $(this);
        const name = self.attr('name');

        if (data[name] != null) {
            if (self.is(":checkbox") || self.is(":radio")) {
                self.prop("checked", data[name]);
                return; //Logic: Behaves as continue since we're in a callback
            }

            self.val(data[name]);
        }
        else {
            self.val("");
        }
    });
}

function WildcardToRegex(pattern)
{
    if (pattern == null) { return null; }

    let escapeRegex = function (string) {
        return string.replace(/([.*+?^${}()|[\]/\\])/g, "\\$1");
    };

    let escapeReplace = function (data, original, replacement) {
        const searchRegex = new RegExp("\\\\+\\" + original);
        const newRegex = data.replace(searchRegex, function (match) {
            const count = match.length - 1;
            const halfCount = Math.floor(count / 2);
            const newSlashes = Array(halfCount).join("\\");
            const result = newSlashes + ((halfCount % 2 === 0) ? replacement : original);
            return result;
        });
        return newRegex;
    };

    let toRegex = function (pattern, starMatchesEmpty, flags) {
        let reg = "^" + escapeRegex(pattern) + "$";
        reg = escapeReplace(reg, "?", "(.)");
        reg = escapeReplace(reg, "*", starMatchesEmpty === true ? "(.*?)" : "(.+?)");
        return new RegExp(reg, flags);
    };

    return toRegex(pattern, false);
}

function CalcLevenshteinDistance(a, b) {
    if (a == null || b == null) { return 0; }

    const lengthA = a.length;
    const lengthB = b.length;
    let distances = [];
    for (let x = 0; x <= lengthA; x++) {
        distances[x] = [];
    }
    for (let i = 0; i <= lengthA; distances[i][0] = i++);
    for (let j = 0; j <= lengthB; distances[0][j] = j++);

    for (i = 1; i <= lengthA; i++) {
        for (j = 1; j <= lengthB; j++) {
            const cost = b[j - 1] === a[i - 1] ? 0 : 1;
            distances[i][j] = Math.min(
                    Math.min(distances[i - 1][j] + 1, distances[i][j - 1] + 1),
                    distances[i - 1][j - 1] + cost);
        }
    }
    return distances[lengthA][lengthB];
}

function uuid4() {
    function hex(s, b) {
        return s +
            (b >>> 4).toString(16) +  // high nibble
            (b & 0b1111).toString(16);   // low nibble
    }

    let r = crypto.getRandomValues(new Uint8Array(16));

    r[6] = r[6] >>> 4 | 0b01000000; // Set type 4: 0100
    r[8] = r[8] >>> 3 | 0b10000000; // Set variant: 100

    return r.slice(0, 4).reduce(hex, '') +
        r.slice(4, 6).reduce(hex, '-') +
        r.slice(6, 8).reduce(hex, '-') +
        r.slice(8, 10).reduce(hex, '-') +
        r.slice(10, 16).reduce(hex, '-');
}

function generateSecurePassword(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^*()_+';
    let password = '';
    const buffer = new Uint8Array(length);

    crypto.getRandomValues(buffer);
    for (const element of buffer) {
        password += charset[element % charset.length];
    }

    return password;
}

class Version {
    constructor(major, minor, revision, build) {
        this.Major = major || 0;
        this.Minor = minor || 0;
        this.Revision = revision || 0;
        this.Build = build || 0;
    }

    static parse(versionString = "0.0.0.0") {
        const [major, minor, revision, build] = versionString.split(".").map(Number);
        return new Version(major, minor, revision, build);
    }

    static fromObject(obj) {
        return new Version(obj?.Major || 0, obj?.Minor || 0, obj?.Revision || 0, obj?.Build || 0);
    }

    newerThan = otherVersion => this.compare(otherVersion) > 0;
    olderThan = otherVersion => this.compare(otherVersion) < 0;
    equalTo = otherVersion => this.compare(otherVersion) === 0;
    olderThanOrEqualTo = otherVersion => this.compare(otherVersion) <= 0;
    newerThanOrEqualTo = otherVersion => this.compare(otherVersion) >= 0;
    toString = (parts) => [this.Major, this.Minor, this.Revision, this.Build].splice(0, parts || 4).join(".");

    getParts(parts) {
        return parse(toString(parts));
    }

    compare(otherVersion) {
        if (typeof (otherVersion) === "string") {
            return this.compare(Version.parse(otherVersion));
        }

        if (!(otherVersion instanceof Version)) {
            throw new Error("Invalid argument: 'otherVersion' must be an instance of Version.");
        }

        if (this.Major !== otherVersion.Major) {
            return this.Major - otherVersion.Major;
        }

        if (this.Minor !== otherVersion.Minor) {
            return this.Minor - otherVersion.Minor;
        }

        if (this.Revision !== otherVersion.Revision) {
            return this.Revision - otherVersion.Revision;
        }

        return this.Build - otherVersion.Build;
    }
}

class TokenStream {
    constructor(input) {
        this.input = input;
        this.index = 0;
        this.regex = /"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|==|!=|>=|<=|&&|\|\||<|>|\(|\)|\b[A-Za-z0-9_.]+\b|\btrue\b|\bfalse\b|\b\d+\b/g;
        this.tokens = this.input.match(this.regex);
    }

    next() { return this.tokens[this.index++]; }
    peek() { return this.tokens[this.index]; }
    eof() { return this.peek() === undefined; }
}

class Parser {
    constructor(input, callback) {
        this.tokens = new TokenStream(input);
        this.callback = callback;
    }

    parse() {
        let expr = this.boolean();
        if (!this.tokens.eof()) throw new SyntaxError("Unexpected '" + this.tokens.peek() + "'");
        return expr;
    }

    boolean() {
        let expr = this.comparison();
        while (!this.tokens.eof() && /^&&|\|\|$/.test(this.tokens.peek())) {
            let op = this.tokens.next() === '&&' ? (a, b) => a && b : (a, b) => a || b;
            expr = op(expr, this.comparison());
        }
        return expr;
    }

    comparison() {
        let expr = this.expression();
        let operators = {
            '==': (a, b) => a == b,
            '!=': (a, b) => a != b,
            '>=': (a, b) => a >= b,
            '<=': (a, b) => a <= b,
            '>': (a, b) => a > b,
            '<': (a, b) => a < b
        };

        while (!this.tokens.eof() && operators[this.tokens.peek()]) {
            let op = operators[this.tokens.next()];
            expr = op(expr, this.expression());
        }

        return expr;
    }

    expression() {
        let expr;
        if (this.tokens.peek() === "(") {
            this.tokens.next();
            expr = this.boolean();
            if (this.tokens.next() !== ")") throw new SyntaxError("Expected ')'");
        } else {
            expr = this.value();
        }
        return expr;
    }

    value() {
        if (/^\d+$/.test(this.tokens.peek())) return Number(this.tokens.next());
        if (/^true|false$/.test(this.tokens.peek())) return this.tokens.next() === 'true';
        if (/^"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'$/.test(this.tokens.peek())) {
            let str = this.tokens.next();
            return str.substring(1, str.length - 1).replace(/\\(.)/g, "$1");
        }
        return this.callback(this.tokens.next());
    }
}

function evaluateExpression(expression, callback) {
    return new Parser(expression, callback).parse();
}

function createTable(obj) {
    const keys = Object.keys(obj);
    const values = Object.values(obj);

    // Calculate the width of the widest key and value
    let maxWidthKey = Math.max(...keys.map(key => key.length));
    let maxWidthValue = Math.max(...values.map(value => String(value).length));

    let table = "";

    // Create the table header
    table += "┏" + "━".repeat(maxWidthKey) + "━━┳━" + "━".repeat(maxWidthValue) + "━┓\n";
    table += "┃ " + "Key".padEnd(maxWidthKey) + " ┃ " + "Value".padEnd(maxWidthValue) + " ┃\n";
    table += "┣" + "━".repeat(maxWidthKey) + "━━╋━" + "━".repeat(maxWidthValue) + "━┫\n";

    // Iterate over keys and values to create table rows
    for (let i = 0; i < keys.length; i++) {
        table += "┃ " + keys[i].padEnd(maxWidthKey) + " ┃ " + String(values[i]).padEnd(maxWidthValue) + " ┃\n";
    }

    // Create the table footer
    table += "┗" + "━".repeat(maxWidthKey) + "━━┻━" + "━".repeat(maxWidthValue) + "━┛\n";

    return table;
}

function setupClickPulse() {
    const selector = getComputedStyle(document.body).getPropertyValue("--pulse-on-click");
    document.querySelectorAll(selector).forEach(item => {
        item.classList.add("pulse-container")
        item.addEventListener('click', function (e) {
            // Create the pulse element
            const pulse = document.createElement('div');
            pulse.classList.add('pulse');
            this.appendChild(pulse);

            // Position the pulse element
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            pulse.style.left = `${x}px`;
            pulse.style.top = `${y}px`;

            // Clean up pulse element after animation
            pulse.addEventListener('animationend', () => {
                pulse.remove();
            });
        });
    });

}