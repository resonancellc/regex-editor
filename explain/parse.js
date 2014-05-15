/*
===============================================================================
Group:
  1) Different ways of matching a character using an esacpe.
  2) Either an octal escape, or a reference by number.
  3) An important syntax character.
  4) A meta character: EOL, BOL and wildcard.
  4) A literal block.
  5) Start of a character class.
  6) Quantifiers.
  7) Different kinds of groups, even look-arounds.
  8) Embedded comment.
  9) Option manipulation
 10) Different ways of referencing a group.
 11) Recursion constructs.
 12) Simple conditions.
 13) Look-around condition.
 14) Callouts.
 15) Syntax errors.
 16) Fallback: Literal characters

Global regex pattern:
/ ( \\[aefnrt]           # Simple non-printing characters
  | \\c.                 # Control escape
  | \\x[\da-fA-F]{0,2}   # Short hex escape
  | \\x{[\da-fA-F]+}     # Long hex escape
  | \\[CdDhHNRsSvVwWX]   # Charcter types
  | \\[pP]{\^?[\w&]+}    # Character with(sequence) specified property
  | \\[|()[{.+*?^$\\]    # Escaped meta character
  | \\\W                 # Literal escape
  )
| ( \\0[0-7]{0,2}        # Octal escape
  | \\[1-9]\d{0,4}       # Octal escape or backreference
  )
| ( [|)] )               # Meta character
| ( [$^.]                # Anchors, "Reset match start", or wildcard
  | \\[bBAzZGK]
  )
| ( \\Q.*?\\E )          # Literal block
| ( \[\^? )              # Start of (negated) character class
| ( (?: [?*+]            # Quantifier
     |  \{\d+(?:,\d*)?}  #
     )                   #
     [?+]?               #
  )
| ( \(\?P?<\w+>          # Start of named capturing group
  | \(\?'\w+'            # Start of named capturing group
  | \(\?:                # Start of non-capturing group
  | \(\?\|               # Start of branch reset non-capturing group
  | \(\?>                # Start of atomic group
  | \(\?<?[!=]           # Start of a look-around
  | \((?!\?)             # Start of a capturing group
  )
| ( \(\?\#[^)]*\) )      # Comment
| ( \(\?[iJmsUx]*-?[iJmsUx]+\))
                         # (Un)set options
| ( \\g\d+               # Reference by number
  | \\g{\d+}             # Reference by number
  | \\g{-\d+}            # Relative reference by number
  | \\k<\w+>             # Reference by name
  | \\k'\w+'             # Reference by name
  | \\[kg]{\w+}          # Reference by name
  | \(\?\P=\w+\)         # Reference by name
  )
| ( \(\?R\)              # Recursive whole pattern
  | \(\?\d+\)            # Call subpattern by absolute number
  | \(\?[+-]\d+\)        # Call subpattern by relative number
  | \(\?&\w+\)           # Call subpattern by name
  | \(\?P>\w+\)          # Call subpattern by name
  | \\g<\d+>             # Call subpattern by absolute number
  | \\g'\d+'             # Call subpattern by absolute number
  | \\g<[+-]\d+>         # Call subpattern by relative number
  | \\g'[+-]\d+'         # Call subpattern by relative number
  | \\g<\w+>             # Call subpattern by name
  | \\g'\w+'             # Call subpattern by name
  )
| ( \(\?\(\d+\)          # Start of abolute reference condition
  | \(\?\([+-]\d+\)      # Start of relative reference condition
  | \(\?\(<\w+>\)        # Start of named reference condition
  | \(\?\('\w+'\)        # Start of named reference condition
  | \(\?\(R\d*\)         # Start of overall/specific recursion condition
  | \(\?\(R&\w+\)        # Start of specific named recursion condition
  | \(\?\(DEFINE\)       # Start of definition of subpatterns for reference
  | \(\?\(\w+\)          # Start of specific named reference condition
  )
| ( \(\?\(\?<?[!=] )     # Start of look-around condition
| ( \(\?C\d*\) )         # Callout (with data)
| ( \\Q                  # Unclosed literal block
  | \\.?                 # Erroreus escape
  | \(\?.?               # Unknown extension group
  )
| ( . )                  # Any other character (literal)
/sg

===============================================================================

Groups:
  1) Different ways of matching a character. Only constructs that are
     valid in a character range.
  2) Character sets.
  3) Meta character.
  4) Syntax errors.
  5) Fallback: Literal characters

Character class regex:
/ ( \\[abefnrt]          # Simple non-printing characters
  | \\c.                 # Control escape
  | \\x[\da-fA-F]{0,2}   # Short hex escape
  | \\x{[\da-fA-F]+}     # Long hex escape
  | \\[0-7]{1,3}         # Octal escape
  | \\[\]-]              # Escaped meta character
  | \\\W                 # Literal escape
  )
| ( \\[CdDhHNRsSvVwWX]   # Charcter types
  | \\[pP]{[\w&]+}       # Character with(sequence) specified property
  )
| ( [\]-] )              # Meta charactes
| ( \\[1-9]\d{0,4}       # Invalid group reference inside character class
  | \\.?                 # Erroreus escape
  )
| ( . )                  # Any other character (literal)
/sg

===============================================================================
*/

function parse(source) {
    if (source.constructor == RegExp) {
        // RegExp objects have a 'source' property
        source = source.source;
    }
    return new Parser(source).parse();
}

/**
 * Parses a regex pattern into an AST like structure.
 * @param source string - A regex in string form.
 */
function Parser(source) {
    /** The source string to parse. */
    this.source = source;
    /** Accumulator for sequences. */
    this.sequence = [];
    /** Accumulator for branches. */
    this.branches = [];
    /** Stack used to manage nested structures. */
    this.stack = [];
    /** Mapping group names to numbers. */
    this.capture_names = {};
    /** The number of the next capture-group. */
    this.next_capture_number = 1;
    /** The position in source where the next search will begin. */
    this.lastIndex = 0;
}

/** The global regex. Used to the main parsing of the regex. */
Parser.global_re = /(\\[aefnrt]|\\c.|\\x[\da-fA-F]{0,2}|\\x{[\da-fA-F]+}|\\[CdDhHNRsSvVwWX]|\\[pP]{\^?[\w&]+}|\\[|()[{.+*?^$\\]|\\\W)|(\\0[0-7]{0,2}|\\[1-9]\d{0,4})|([|)])|([$^.]|\\[bBAzZGK])|(\\Q.*?\\E)|(\[\^?)|((?:[?*+]|\{\d+(?:,\d*)?})[?+]?)|(\(\?P?<\w+>|\(\?'\w+'|\(\?:|\(\?\||\(\?>|\(\?<?[!=]|\((?!\?))|(\(\?\#[^)]*\))|(\(\?[iJmsUx]*-?[iJmsUx]+\))|(\\g\d+|\\g{\d+}|\\g{-\d+}|\\k<\w+>|\\k'\w+'|\\[kg]{\w+}|\(\?\P=\w+\))|(\(\?R\)|\(\?\d+\)|\(\?[+-]\d+\)|\(\?&\w+\)|\(\?P>\w+\)|\\g<\d+>|\\g'\d+'|\\g<[+-]\d+>|\\g'[+-]\d+'|\\g<\w+>|\\g'\w+')|(\(\?\(\d+\)|\(\?\([+-]\d+\)|\(\?\(<\w+>\)|\(\?\('\w+'\)|\(\?\(R\d*\)|\(\?\(R&\w+\)|\(\?\(DEFINE\)|\(\?\(\w+\))|(\(\?\(\?<?[!=])|(\(\?C\d*\))|(\\Q|\\.?|\(\?.?)|(.|\n)/g;
/** The character class regex. Used for parsing character classes. */
Parser.charclass_re = /(\\[abefnrt]|\\c.|\\x[\da-fA-F]{0,2}|\\x{[\da-fA-F]+}|\\[0-7]{1,3}|\\[\]-]|\\\W)|(\\[CdDhHNRsSvVwWX]|\\[pP]{[\w&]+})|([\]-])|(\\[1-9]\d{0,4}|\\.?)|(.|\n)/g;


/**
 * Pushes the current state onto the stack.
 *
 * @param item object - Any object, to be returned by pop().
 */
Parser.prototype.push = function(item) {
    //console.log("Called push(",item,")");
    this.stack.push([item,this.sequence,this.branches]);
    this.sequence = [];
    this.branches = [];
}

Parser.prototype.compact = function() {
	var seq = this.sequence;
	//console.log("Compacting ", seq);
	for (var i = 1; i < seq.length; i++) {
		var item1 = seq[i-1];
		var item2 = seq[i];
		if (item1['name'] == 'text' && item2['name'] == 'text') {
			item1['args'][0] += item2['args'][0];
			item1['literal'] += item2['literal'];
			//item1['desc'] = 'The literal text "' + item1['literal'] + '".';
			seq.splice(i,1);
			i--;
		}
	}
}

/**
 * Closes the current state, and pops an old one from the stack.
 *
 * @param no_compact bool - Wether or not to combine literal texts.
 * @return object - The object pushed onto the stack by .push().
 */
Parser.prototype.pop = function(no_compact) {
    //console.log("Called pop()");
    if (!no_compact) {
		this.compact();
    }
    var item;
    if (this.sequence.length == 1) {
        item = this.sequence[0];
    }
    else {
        item = {
            'type': 'sequence',
            'children': this.sequence
        };
    }
    this.branches.push(item);
    if (this.branches.length != 1) {
        item = {
            'type': 'branch',
            'children': this.branches,
            'literal_between': '|'
        };
    }
    var entry = this.stack.pop();
    this.sequence = entry[1];
    this.branches = entry[2];
    this.add(item);
    return entry[0];
}

Parser.prototype.new_branch = function() {
    //console.log("Called new_branch()");
	this.compact();
    var item;
    if (this.sequence.length == 1) {
        item = this.sequence[0];
    }
    else {
        item = {
            'type': 'sequence',
            'children': this.sequence
        };
    }
    this.branches.push(item);
    this.sequence = [];
}

Parser.prototype.add = function(item) {
    //console.log("Called add(",item,")");
    this.sequence.push(item);
}

Parser.prototype.parse = function() {
    //console.log("Called parse()");
    var match;
    Parser.global_re.lastIndex = this.lastIndex = 0;
    while (m = Parser.global_re.exec(this.source)) {
        this.lastIndex = m.index + m[0].length;
        if (m[1]) { this.parse_escaped_character(m[1]); }
        else if (m[2]) { this.parse_number_escape(m[2],true); }
        else if (m[3]) { this.parse_control_meta(m[3]); }
        else if (m[4]) { this.parse_other_meta(m[4]); }
        else if (m[5]) {
            var s = m[5];
            this.add({
                'type':    'literal',
                'name':    'literal block',
                'args':    [s.substr(2,s.length-4)],
                'literal': s
            });
        }
        else if (m[6]) { this.parse_character_class(m[6]); }
        else if (m[7]) { this.parse_quantifier(m[7]); }
        else if (m[8]) { this.parse_group(m[8]); }
        else if (m[9]) {
            var s = m[9];
            this.add({
                'type':    'ignore',
                'name':    'inline comment',
                'args':    [s.substr(3,s.length-4)],
                'literal': s
            });
        }
        else if (m[10]) { this.parse_inline_options(m[10]); }
        else if (m[11]) { this.parse_reference(m[11]); }
        else if (m[12]) { this.parse_subrutine(m[12]); }
        else if (m[13]) { this.parse_condition(m[13]); }
        else if (m[14]) { this.parse_lookaround_condition(m[14]); }
        else if (m[15]) {
            var s = m[15];
            var n = s.substr(3,s.length-4);
            this.add({
                'type':    'control',
                'name':    'callout',
                'args':    [parseInt(n)],
                'literal': s
            });
        }
        else if (m[16]) {
            var s = m[16];
            this.add({
                'type':    'error',
                'name':    'invalid regex',
                'literal': s
            });
        }
        else if (m[17]) {
            var s = m[17];
            this.add({
                'type':    'literal',
                'name':    'text',
                'args':    [s],
                'literal': s
            });
        }
        Parser.global_re.lastIndex = this.lastIndex;
    }
    while (this.stack.length > 0) {
        this.parse_control_meta(")");
    }
    this.stack.push([{},[],[]]);
    this.pop();
    return this.sequence.pop();
}

var unicode_scripts = {
    'Common': 'Unidentified Script',

    'Arabic':       'Arabic Script',
    'Armenian':     'Armenian Script',
    'Avestan':      'Avestan Script',
    'Balinese':     'Balinese Script',
    'Bamum':        'Bamum Script',
    'Bengali':      'Bengali Script',
    'Bopomofo':     'Bopomofo Script',
    'Braille':      'Braille Script',
    'Buginese':     'Buginese Script',
    'Buhid':        'Buhid Script',
    'Canadian_Aboriginal': 'Canadian Aboriginal Script',
    'Carian':       'Carian Script',
    'Cham':         'Cham Script',
    'Cherokee':     'Cherokee Script',
    'Common':       'Common Script',
    'Coptic':       'Coptic Script',
    'Cuneiform':    'Cuneiform Script',
    'Cypriot':      'Cypriot Script',
    'Cyrillic':     'Cyrillic Script',
    'Deseret':      'Deseret Script',
    'Devanagari':   'Devanagari Script',
    'Egyptian_Hieroglyphs': 'Egyptian Hieroglyphs Script',
    'Ethiopic':     'Ethiopic Script',
    'Georgian':     'Georgian Script',
    'Glagolitic':   'Glagolitic Script',
    'Gothic':       'Gothic Script',
    'Greek':        'Greek Script',
    'Gujarati':     'Gujarati Script',
    'Gurmukhi':     'Gurmukhi Script',
    'Han':          'Han Script',
    'Hangul':       'Hangul Script',
    'Hanunoo':      'Hanunoo Script',
    'Hebrew':       'Hebrew Script',
    'Hiragana':     'Hiragana Script',
    'Imperial_Aramaic': 'Imperial Aramaic Script',
    'Inherited':    'Inherited Script',
    'Inscriptional_Pahlavi': 'Inscriptional Pahlavi Script',
    'Inscriptional_Parthian': 'Inscriptional Parthian Script',
    'Javanese':     'Javanese Script',
    'Kaithi':       'Kaithi Script',
    'Kannada':      'Kannada Script',
    'Katakana':     'Katakana Script',
    'Kayah_Li':     'Kayah Li Script',
    'Kharoshthi':   'Kharoshthi Script',
    'Khmer':        'Khmer Script',
    'Lao':          'Lao Script',
    'Latin':        'Latin Script',
    'Lepcha':       'Lepcha Script',
    'Limbu':        'Limbu Script',
    'Linear_B':     'Linear B Script',
    'Lisu':         'Lisu Script',
    'Lycian':       'Lycian Script',
    'Lydian':       'Lydian Script',
    'Malayalam':    'Malayalam Script',
    'Meetei_Mayek': 'Meetei Mayek Script',
    'Mongolian':    'Mongolian Script',
    'Myanmar':      'Myanmar Script',
    'New_Tai_Lue':  'New Tai Lue Script',
    'Nko':          'Nko Script',
    'Ogham':        'Ogham Script',
    'Ol_Chiki':     'Ol Chiki Script',
    'Old_Italic':   'Old Italic Script',
    'Old_Persian':  'Old Persian Script',
    'Old_South_Arabian': 'Old South Arabian Script',
    'Old_Turkic':   'Old Turkic Script',
    'Oriya':        'Oriya Script',
    'Osmanya':      'Osmanya Script',
    'Phags_Pa':     'Phags Pa Script',
    'Phoenician':   'Phoenician Script',
    'Rejang':       'Rejang Script',
    'Runic':        'Runic Script',
    'Samaritan':    'Samaritan Script',
    'Saurashtra':   'Saurashtra Script',
    'Shavian':      'Shavian Script',
    'Sinhala':      'Sinhala Script',
    'Sundanese':    'Sundanese Script',
    'Syloti_Nagri': 'Syloti Nagri Script',
    'Syriac':       'Syriac Script',
    'Tagalog':      'Tagalog Script',
    'Tagbanwa':     'Tagbanwa Script',
    'Tai_Le':       'Tai Le Script',
    'Tai_Tham':     'Tai Tham Script',
    'Tai_Viet':     'Tai Viet Script',
    'Tamil':        'Tamil Script',
    'Telugu':       'Telugu Script',
    'Thaana':       'Thaana Script',
    'Thai':         'Thai Script',
    'Tibetan':      'Tibetan Script',
    'Tifinagh':     'Tifinagh Script',
    'Ugaritic':     'Ugaritic Script',
    'Vai':          'Vai Script',
    'Yi':           'Yi Script',
};

var unicode_properties = {
    'C':   'Other',
    'Cc':  'Control',
    'Cf':  'Format',
    'Cn':  'Unassigned',
    'Co':  'Private use',
    'Cs':  'Surrogate',

    'L':   'Letter',
    'Ll':  'Lower case letter',
    'Lm':  'Modifier letter',
    'Lo':  'Other letter',
    'Lt':  'Title case letter',
    'Lu':  'Upper case letter',
    'L&':  'Lower, title or upper case letter',

    'M':   'Mark',
    'Mc':  'Spacing mark',
    'Me':  'Enclosing mark',
    'Mn':  'Non-spacing mark',

    'N':   'Number',
    'Nd':  'Decimal number',
    'Nl':  'Letter number',
    'No':  'Other number',

    'P':   'Punctuation',
    'Pc':  'Connector punctuation',
    'Pd':  'Dash punctuation',
    'Pe':  'Close punctuation',
    'Pf':  'Final punctuation',
    'Pi':  'Initial punctuation',
    'Po':  'Other punctuation',
    'Ps':  'Open punctuation',

    'S':   'Symbol',
    'Sc':  'Currency symbol',
    'Sk':  'Modifier symbol',
    'Sm':  'Mathematical symbol',
    'So':  'Other symbol',

    'Z':   'Separator',
    'Zl':  'Line separator',
    'Zp':  'Paragraph separator',
    'Zs':  'Space separator',

    'Xan': 'Alphanumeric',
    'Xps': 'POSIX space character + p{Z}',
    'Xsp': 'Perl space character + p{Z}',
    'Xwd': 'Perl word character + p{L}'
};

var character_sets = {
    'C': 'One byte, even in UTF-8 mode (best avoided).',
    'd': 'A decimal digit. [0-9]',
    'D': 'A character that is not a decimal digit. [^0-9]',
    'h': 'A horizontal whitespace character.',
    'H': 'A character that is not a horizontal whitespace character.',
    'N': 'A character that is not a newline. [^\\n]',
    'R': 'A newline sequence. \\r\\n, \\n or \\r',
    's': 'A whitespace character. [\\t\\n\\v\\f\\r ] or [\\x09-\\x0D\\x20]',
    'S': 'A character that is not a whitespace character. [^\\t\\n\\v\\f\\r ] or [^\\x09-\\x0D\\x20]',
    'v': 'A vertical whitespace character. [\\n\\v\\f\\r] or [\\x0A-\\x0D]',
    'V': 'A character that is not a vertical whitespace character. [^\\n\\v\\f\\r] or [^\\x0A-\\x0D]',
    'w': 'A "word" character. [A-Za-z0-9_]',
    'W': 'A "non-word" character. [^A-Za-z0-9_]',
    'X': 'An extended Unicode sequence. \\P{M}\\p{M}*'
};

// \\[aefnrt]
// \\c.
// \\x[\da-fA-F]{0,2}
// \\x{[\da-fA-F]+}
// \\[CdDhHNRsSvVwWX]
// \\[pP]{\^?[\w&]+}
// \\[|()[{.+*?^$\\]
// \\\W
Parser.prototype.parse_escaped_character = function(s) {
    //console.log("Called parse_escaped_character(",s,")");
    var negated = false;
    var c;
    switch (c = s.charAt(1)) {
    case 'c':
        c = s.charCodeAt(2);
        if (0x61 <= c && c <= 0x7A) { c -= 0x20; }
        c ^= 0x40;
        this.add({
            'type':    'character',
            'name':    'control escape',
            'args':    [c],
            'literal': s
        });
        return;
    case 'x':
        if (s.charAt(2) == '{') {
            c = parseInt(s.substr(3,s.length-4),16);
        }
        else {
            c = parseInt(s.substr(2),16);
        }
        this.add({
            'type':    'character',
            'name':    'hex escape',
            'args':    [c],
            'literal': s
        });
        return;
    case 'P':
        negated = true;
    case 'p':
        var name = s.substr(3,s.length-4);
        if (name.charAt(0) == "^") {
            negated = !negated;
            name = name.substr(1);
        }
        var desc = unicode_properties[name];
        if (desc !== undefined) {
            this.add({
                'type':    'character',
                'name':    'unicode character ' +
                    (negated ? 'without' : 'with') + ' property',
                'args':    [name,false,desc],
                'literal': s
            });
			return;
        }
        var desc = unicode_script[name];
        if (desc !== undefined) {
            this.add({
                'type':    'character',
                'name':    'unicode character ' +
                    (negated ? 'without' : 'with') + ' property',
                'args':    [name,true,desc],
                'literal': s
            });
			return;
        }
		this.add({
			'type':    'error',
			'name':    'invalid unicode property',
			'literal': s
		});
        return;
    default:
        if (c in character_sets) {
            this.add({
                'type':    'character',
                'name':    'character set',
                'args':    [c, character_sets[c]],
                'literal': s
            });
            return;
        }
        this.add({
            'type':    'character',
            'name':    'literal escape',
            'args':    [c],
            'literal': s
        });
    }
}

// \\0[0-7]{0,2}
// \\[1-9]\d{0,4}
Parser.prototype.parse_number_escape = function(s,allow_reference) {
    //console.log("Called parse_number_escape(",s,",",allow_reference,")");
    if (s.charAt(1) == "0") {
        this.parse_escaped_character(s);
        return;
    }
    var rest = null;
    if (allow_reference) {
        for (var i = s.length-1; i > 0; i--) {
            var x = s.substr(1,i);
            var n = parseInt(x);
            if (n < this.next_capture_number) {
                this.add({
                    'type':    'reference',
                    'name':    'reference by number',
                    'args':    [n],
                    'literal': x
                });
                rest = s.substr(i+1);
                break;
            }
        }
    }
    if (rest === null) {
        var n = s.length > 4 ? 4 : s.length;
        for (var i = n; i > 0; i--) {
            var x = s.substr(1,i);
            if (/^[0-7]+$/.test(x)) {
                var n = parseInt(x);
                this.add({
                    'type':    'character',
                    'name':    'octal escape',
                    'args':    [n],
                    'literal': x
                })
                rest = s.substr(i+1);
            }
        }
    }
    if (rest != null && rest.length > 0) {
        this.lastIndex = m.index + s.length - rest.length;
    }
}

// [|)]
Parser.prototype.parse_control_meta = function(s) {
    //console.log("Called parse_control_meta(",s,")");
    if (s == '|') {
        this.new_branch();
    }
    else if (s == ')') {
        var item = this.pop();
        var child = this.sequence.pop();
        item['children'] = [child];
        item['literal_after'] = s;
        if (item['type'] == 'look-around condition') {
            var children = item['children'];
            var replace_with_empty = false;
            if (children[0]['type'] == 'branch') {
                children = children[0]['children'];
                replace_with_empty = true;
            }
            if (children[0]['type'] == 'sequence') {
                children = children[0]['children'];
                replace_with_empty = false;
            }
            var cond = children.shift();
            if (replace_with_empty) {
                children.unshift({
                    'type':     'sequence',
                    'children': []
                });
            }
            if (cond['type'] != 'look around') {
                throw new Exception("Internal error: Look-around condition without look-around?!")
            }
            item['children'].unshift(cond);
        }
        this.add(item);
    }
}

// [$^.]
// \\[bBAzZGK]
Parser.prototype.parse_other_meta = function(s) {
    //console.log("Called parse_other_meta(",s,")");
    var item;
    switch (s) {
    case '^':
        item = {
            'type':    'assert',
            'name':    'start of line anchor',
            'literal': s
        };
        break;
    case '$':
        item = {
            'type':    'assert',
            'name':    'end of line anchor',
            'literal': s
        };
        break;
    case '.':
        item = {
            'type':    'character',
            'name':    'wildcard',
            'literal': s
        };
        break;
    case '\\b':
        item = {
            'type': 'assert',
            'name': 'word boundary',
            'literal': s
        };
        break;
    case '\\B':
        item = {
            'type': 'assert',
            'name': 'not word boundary',
            'literal': s
        };
        break;
    case '\\A':
        item = {
            'type': 'assert',
            'name': 'start of string anchor',
            'literal': s
        };
        break;
    case '\\z':
        item = {
            'type': 'assert',
            'name': 'end of string anchor',
            'literal': s
        };
        break;
    case '\\Z':
        item = {
            'type': 'assert',
            'name': 'end of string anchor or before final \\n',
            'literal': s
        };
        break;
    case '\\G':
        item = {
            'type': 'assert',
            'name': 'end of previous match',
            'literal': s
        };
        break;
    case '\\K':
        item = {
            'type': 'control',
            'name': 'reset match start',
            'literal': s
        };
        break;
    default:
        throw new Exception("Unexpected construct: " + s);
    }
    this.add(item);
}


// \[\^?
Parser.prototype.parse_character_class = function(s) {
    //console.log("Called parse_character_class(",s,")");
    var negated = s == "[^";
    Parser.charclass_re.lastIndex = this.lastIndex;
    this.push(null);
    var stage = 0;
    var left, dash, right;
    while (m = Parser.charclass_re.exec(this.source)) {
        this.lastIndex = m.index + m[0].length;
        if (m[1]) {
            this.parse_escaped_character(m[1]);
            if (stage == 0 || stage == 2) { stage++; }
            else { stage = 1; }
        }
        else if (m[2]) { 
            this.parse_escaped_character(m[2]);
            stage = 0;
        }
        else if (m[3]) { 
            if (m[3] == '-') {
                this.add({
                    'type':    'character',
                    'name':    'literal',
                    'args':    ['-'],
                    'literal': '-'
                });
                stage++;
            }
            else {
                break;
            }
        }
        else if (m[4]) {
            this.add({
                'type':    'error',
                'name':    'invalid escape inside character class',
                'literal': m[4]
            });
            stage = 0;
        }
        else if (m[5]) {
            this.add({
                'type':    'character',
                'name':    'literal',
                'args':    [m[5]],
                'literal': m[5]
            });
            if (stage == 0 || stage == 2) { stage++; }
            else { stage = 1; }
        }
        if (stage == 3) {
            right = this.sequence.pop();
            dash = this.sequence.pop();
            left = this.sequence.pop();
            this.add({
                'type': 'character',
                'name': 'range',
				'args': [left.args[0],right.args[0]],
                'children': [left,right],
                'literal_between': dash.literal
            });
            stage = 0;
        }
        Parser.charclass_re.lastIndex = this.lastIndex;
    }
    this.pop(true);
    var seq = this.sequence.pop();
    var children = [seq];
    if (seq['type'] == 'sequence') {
        children = seq.children;
    }
    this.add({
        'type': 'character',
        'name': (negated ? 'negated ' : '') + 'character class',
        'children': children,
        'literal': s,
        'literal_after': ']'
    });
}

Parser.prototype.parse_quantifier = function(s) {
    //console.log("Called parse_quantifier(",s,")");
    var last = '';
    if (s.length > 1 && s.charAt(s.length-1) != '}') {
        last = s.charAt(s.length-1);
    }
    var min,max;
    switch (s.charAt(0)) {
    case '?': min = 0; max = 1; break;
    case '+': min = 1; max = -1; break;
    case '*': min = 0; max = -1; break;
    case '{':
        var m = s.match(/^{(\d+)(?:,(\d*))?}/);
        min = parseInt(m[1]);
        max = m[2] != null ? m[2].length > 0 ? parseInt(m[2]) : -1 : min;
        break;
    }
    if (this.sequence.length < 1) {
        this.add({
            'type':    'error',
            'name':    'nothing to repeat',
            'literal': s
        });
        return;
    }
    var item = this.sequence.pop();
    var greedy = (last != '?');
    var posessive = (last == '+');
    this.add({
        'type':          'control',
        'name':          'repetition',
        'args':          [min,max,greedy,posessive],
        'literal_after': s,
        'children':      [item]
    });
}

Parser.prototype.parse_group = function(s) {
    //console.log("Called parse_group(",s,")");
    var item;
    switch (s.substr(0,4)) {
    case '(?P<':
        var name = s.substr(4,s.length-5);
        var num = this.next_capture_number++;
        item = {
            'type':    'group',
            'name':    'named capture group',
            'args':    [num, name],
            'literal': s
        };
        this.capture_names[name] = num;
        break;
    case '(?<!':
        item = {
            'type':    'look around',
            'name':    'negative look-behind',
            'literal': s
        };
        break;
    case '(?<=':
        item = {
            'type':    'look around',
            'name':    'positive look-behind',
            'literal': s
        };
        break;
    default:
        switch (s.substr(0,3)) {
        case '(?<': case "(?'":
            var name = s.substr(3,s.length-4);
            var num = this.next_capture_number++;
            item = {
                'type':    'group',
                'name':    'named capture group',
                'args':    [num, name],
                'literal': s
            };
            this.capture_names[name] = num;
            break;
        case '(?:':
            item = {
                'type':    'group',
                'name':    'non-capturing group',
                'literal': s
            };
            break;
        case '(?|':
            item = {
                'type':    'group',
                'name':    'branch-reset non-capturing group',
                'literal': s
            };
            break;
        case '(?>':
            item = {
                'type':    'group',
                'name':    'atomic group',
                'literal': s
            };
            break;
        case '(?!':
            item = {
                'type':    'look around',
                'name':    'negative look-ahead',
                'literal': s
            };
            break;
        case '(?=':
            item = {
                'type':    'look around',
                'name':    'positive look-ahead',
                'literal': s
            };
            break;
        default:
            item = {
                'type':    'group',
                'name':    'capturing group',
                'args':    [this.next_capture_number++],
                'literal': s
            };
        }
    }
    this.push(item);
}

Parser.prototype.parse_inline_options = function(s) {
    //console.log("Called parse_inline_options(",s,")");
    var add_options = [];
    var rem_options = [];
    var options = s.substr(2,s.length-3);
    var sign = true;
    var c;
    for (var i = 0; i < options.length; i++) {
        switch (c = s.charAt(i)) {
        case '-':
            sign = false;
        default:
            (sign ? add_options : rem_options).push(c);
        }
    }
    this.add({
        'type': 'control',
        'name': 'change options',
        'args': [add_options,rem_options]
    });
}

// \\g\d+
// \\g{\d+}
// \\g{-\d+}
// \\k<\w+>
// \\k'\w+'
// \\[kg]{\w+}
// \(\?\P=\w+\)
Parser.prototype.parse_reference = function(s) {
    //console.log("Called parse_reference(",s,")");
    var num = null, name = null, relative = false;
    if (s.substr(0,4) == "(?P=") {
        name = s.substr(4,s.length-5);
    }
    else if (s.substr(0,4) == "\\g{-") {
        num = parseInt(s.substr(4,s.length-5));
        relative = true;
    }
    else if (s.substr(0,3) == "\\g{") {
        num = s.substr(3,s.length-4);
        if (/^\d+$/.test(num)) {
            num = parseInt(num);
        }
        else {
            name = num;
            num = null;
        }
    }
    else if (s.substr(0,2) == "\\g") {
        num = parseInt(s.substr(2));
    }
    else if (s.substr(0,2) == "\\k") {
        name = s.substr(3,s.length-4);
    }
    if (name !== null) {
        this.add({
            'type':    'reference',
            'name':    'reference by name',
            'args':    [name],
            'literal': s
        });
    }
    else if (relative) {
        this.add({
            'type':    'reference',
            'name':    'relative reference by number',
            'args':    [num],
            'literal': s
        });
    }
    else {
        this.add({
            'type':    'reference',
            'name':    'reference by number',
            'args':    [num],
            'literal': s
        });
    }
}

// \(\?R\)
// \(\?\d+\)
// \(\?[+-]\d+\)
// \(\?&\w+\)
// \(\?P>\w+\)
// \\g<\d+>
// \\g'\d+'
// \\g<[+-]\d+>
// \\g'[+-]\d+'
// \\g<\w+>
// \\g'\w+'
Parser.prototype.parse_subrutine = function(s) {
    //console.log("Called parse_subrutine(",s,")");
    if (s == "(?R)") {
        this.add({
            'type':    'subrutine',
            'name':    'recursive whole pattern',
            'literal': s
        });
        return;
    }
    var name = null, num = null, relative = false;
    var c = s.substr(3,s.length-4);
    if (c.substr(0,2) == "P>") {
        name = c.substr(2);
    }
    if (c.substr(0,1) == "&") {
        name = c.substr(1);
    }
    else if (c.substr(0,1) == "+" || c.substr(0,1) == "-") {
        num = parseInt(s);
        relative = true;
    }
    else if (/^\d+$/.test(c)) {
        num = parseInt(c);
    }
    else {
        name = c;
    }
    if (name !== null) {
        this.add({
            'type':    'subrutine',
            'name':    'call subpattern by name',
            'args':    [name],
            'literal': s
        });
    }
    else if (relative) {
        this.add({
            'type':    'subrutine',
            'name':    'call subpattern by relative number',
            'args':    [name],
            'literal': s
        });
    }
    else {
        this.add({
            'type':    'subrutine',
            'name':    'call subpattern by number',
            'args':    [name],
            'literal': s
        });
    }
}

// \(\?\(\d+\)          
// \(\?\([+-]\d+\)      
// \(\?\(<\w+>\)        
// \(\?\('\w+'\)        
// \(\?\(R\d*\)         
// \(\?\(R&\w+\)        
// \(\?\(DEFINE\)       
// \(\?\(\w+\)          
Parser.prototype.parse_condition = function(s) {
    //console.log("Called parse_condition(",s,")");
    var c = s.substr(3,s.length-4);
    var item;
    if (/^\d+$/.test(c)) {
        item = {
            'type':    'condition',
            'name':    'absolute reference condition',
            'args':    [parseInt(c)],
            'literal': s
        };
    }
    else if (/^[+-]\d+$/.test(c)) {
        item = {
            'type':    'condition',
            'name':    'relative reference condition',
            'args':    [parseInt(c)],
            'literal': s
        };
    }
    else if (/^(?:<\w+>|'\w+')$/.test(c)) {
        item = {
            'type':    'condition',
            'name':    'named reference condition',
            'args':    [c.substr(1,c.length-2)],
            'literal': s
        };
    }
    else if (c == "R") {
        item = {
            'type':    'condition',
            'name':    'overall recursion condition',
            'literal': s
        };
    }
    else if (/^R\d+$/.test(c)) {
        item = {
            'type':    'condition',
            'name':    'specific recursion condition',
            'args':    [parseInt(c.substr(1))],
            'literal': s
        };
    }
    else if (c.substr(0,2) == "R&") {
        item = {
            'type':    'condition',
            'name':    'named recursion condition',
            'args':    [parseInt(c.substr(1))],
            'literal': s
        };
    }
    else if (c == "DEFINE") {
        item = {
            'type':    'control',
            'name':    'definition of subpatterns for reference',
            'literal': s
        };
    }
    else {
        item = {
            'type':    'condition',
            'name':    'named reference condition',
            'args':    [c],
            'literal': s
        };
    }
    this.push(item);
}

// \(\?\(\?<?[!=]
Parser.prototype.parse_lookaround_condition = function(s) {
    //console.log("Called parse_lookaround_condition(",s,")");
    var item = {
        'type':    'condition',
        'name':    'look-around condition',
        'literal': s.substring(0,2)
    };
    this.push(item);
    var name;
    switch (s.substr(4)) {
        case '=': name = 'positive look-ahead'; break;
        case '!': name = 'negative look-ahead'; break;
        case '<=': name = 'positive look-behind'; break;
        case '<!': name = 'negative look-behind'; break;
    }
    item = {
        'type': 'look around',
        'name': name,
        'literal': s.substr(2)
    };
    this.push(item);
}
