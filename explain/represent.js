// vim:sw=4 ts=4 et
function represent(node) {
    return new Representer().represent(node);
}

function Representer() {
    this.next_color = 0;
    this.num_colors = 78;
}

Representer.prototype.title = function(s) {
    return s.charAt(0).toUpperCase() + s.substr(1);
};

Representer.prototype.html_escape = function(s) {
    return s.replace(/[<>"]|&(?!#?\w+;)/g, function(c) {
        return {'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;'}[c];
    });
};

Representer.prototype.stringformat = function(s) {
    if (s.constructor === Number) {
        s = String.fromCharCode(s);
    }
    return '"' + s.replace(/[\x00-\x1F\\"\x7F-\x9F]/g, function(c) {
        switch (c) {
        case '\t': return '\\t';
        case '\n': return '\\n';
        case '\v': return '\\v';
        case '\f': return '\\f';
        case '\r': return '\\r';
        case '\\': return '\\\\';
        case '"': return '\\"';
        default:
            var code = c.charCodeAt(0).toString(16);
            if (code.length == 2) { return '\\x' + code; }
            else { return '\\x0' + code; }
        }
    }) + '"';
}

Representer.prototype.make_html = function(node,literal) {
    var html = ['<span class="literal">'];
	
	html.push('<samp>'+this.html_escape(literal)+'</samp>');
	if('type' in node && node.type!='character' || node.name=='character class') html.push('<dfn>'+this.description(node)+'</dfn>');
	
    html.push('<span class="tooltip"><b>');
    if ('type' in node) {
        html.push(this.html_escape(this.title(node['type'])));
    }
    else { html.push('(unknown)'); }
    if ('name' in node) {
        html.push(':</b> ' + this.html_escape(this.title(node['name'])));
    }
    else { html.push('</b>'); }
    html.push('<br/><b>Literal:</b> ');
    if ('literal' in node) {
        html.push('<tt>');
        html.push(this.html_escape(node['literal']));
        html.push('</tt> ');
    }
    if ('literal_between' in node) {
        html.push('<b>...</b> <tt>');
        html.push(this.html_escape(node['literal_between']));
        html.push('</tt> <b>...</b> ');
    }
    else if ('literal_after' in node) {
        html.push('<b>...</b> ');
    }
    if ('literal_after' in node) {
        html.push('<tt>');
        html.push(this.html_escape(node['literal_after']));
        html.push('</tt>');
    }
    html.push('<br/><b>Description:</b> ' + this.html_escape(this.description(node)));
    html.push('</span>');
    
    html.push('</span>');
    html = html.join('');
    return html;
};

Representer.prototype.description = function(node) {
    var type = node['type'];
    var name = node['name'];
    var args = node['args'];
    var negate = false;
    switch (type) {
    case 'sequence':
        return 'A sequence of characters or other constructs.';
    case 'branch':
        return 'Matches if one of it\'s children matches, tried from left to right.';
    case 'assert':
        switch (name) {
        case 'end of previous match':
            return 'Continues at the position the previous match ended.';
        case 'start of line anchor':
            return 'Matches after a linebreak, or at the start of the string.';
        case 'end of line anchor':
            return 'Matches before a linebreak, or at the end of the string.';
        case 'start of string anchor':
            return 'Matches before the first character of the string.';
        case 'end of string anchor':
            return 'Matches after the last character in the string.';
        case 'end of string anchor or before final \\n': 
            return 'Matches after the last character in the string, or just before the final linebreak.';
        case 'word boundary':
            return 'Matches in between a word character (\\w) and a non-word character, or at the edges of the string if it starts/ends with a word character.';
        case 'not word boundary':
            return 'Matches in between two word characters (\\w), or two non-word characters, or at the edges of the string if it starts/ends with a non-word character.';
        }
        break;
    case 'character':
        switch (name) {
        case 'character class':
            return 'Matches a single character, out of the ones contained in the class.';
        case 'negated character class':
            return 'Matches a any single character, except for the ones contained in the class.';
        case 'character set': // [desc]
            return args[1];
        case 'control escape':
        case 'hex escape':
        case 'literal escape':
        case 'octal escape':
        case 'literal':
            return 'The character ' + this.stringformat(args[0]) + '.';
        case 'range': // [left,right]
            return 'Any character between ' + this.stringformat(args[0]) + ' and ' + this.stringformat(args[1]) + '.';
        case 'unicode character without property': // [name,is_script,desc]
            if (args[1]) {
                return 'Any character not used by the script "' + args[2] + '".';
            }
            return 'Any character without the property "' + args[2] + '".';
        case 'unicode character with property': // [name,is_script,desc]
            if (args[1]) {
                return 'Any character used by the script "' + args[2] + '".';
            }
            return 'Any character with the property "' + args[2] + '".';
        case 'wildcard':
            return 'Any character except newline (\\n).';
        }
        break;
    case 'condition':
        switch (name) {
        case 'absolute reference condition': // [num]
            return 'If group ' + args[0] + ' has matched, use left branch, otherwise right branch.';
        case 'named reference condition': // [name]
            return 'If the group named "' + args[0] + '" has matched, use left branch, otherwise right branch.';
        case 'relative reference condition': // [dist]
            return 'If group relative ' + args[0] + ' to this one has matched, use left branch, otherwise right branch.';
        case 'look-around condition': // []
            return 'If the look-around succeeds, use left branch, otherwise right branch.';
        case 'named recursion condition': // [name]
            return 'If the pattern has recursed through the group named "' + args[0] + '", use left branch, otherwise right branch.'
        case 'specific recursion condition': // [num]
            return 'If the pattern has recursed through group ' + args[0] + ', use left branch, otherwise right branch.'
        case 'overall recursion condition': // []
            return 'If the pattern has recursed through (?R), use left branch, otherwise right branch.'
        }
        break;
    case 'control':
        switch (name) {
        case 'callout': // [num]
            return 'Call the callout function with argument ' + args[0] + '.';
        case 'change options': // [add,remove]
            if (args[0].length > 0 && args[1].length > 0) {
                return 'Set options "' + args[0].join('", "') + '", and clear options "' + args[1].join('", "') + '".';
            }
            else if (args[0].length > 0) {
                return 'Set options "' + args[0].join('", "') + '".';
            }
            return 'Clear options "' + args[1].join('", "') + '".';
        case 'definition of subpatterns for reference':
            return "Defines groups for reference, but does not try to match them, not include them as captures.";
        case 'repetition': // [low,high,greedy,posessive]
            var mode = 'lazy';
            if (args[3]) mode = 'posessive';
            else if (args[2]) mode = 'greedy';
            if (args[0] == args[1]) {
                return 'Repeats ' + args[0] + ' times, ' + mode + '.';
            }
            else if (args[1] < 0) {
                return 'Repeats ' + args[0] + ' or more times, ' + mode + '.';
            }
            else {
                return 'Repeats ' + args[0] + ' to ' + args[1] + ' times, ' + mode + '.';
            }
            break;
        case 'reset match start':
            return 'Discards the string matched up to this point, but does not clear any captures there.';
        }
    case 'group':
        switch (name) {
        case 'atomic group':
            return 'Disables back-tracking within the group once it has completed matching.';
        case 'branch-reset non-capturing group':
            return 'Each branch within the group uses the same numbers for their capturing groups.';
        case 'capturing group': // [num]
            return 'Stores the matched substring as a backreference ' + args[0] + '.';
        case 'named capture group': // [num,name]
            return 'Stores the matched substring as a backreference ' + args[0] + ', and names it "' + args[1] + '".';
        case 'non-capturing group':
            return 'Just groups the content, to contain branches, or so that it can be repeated.';
        }
        break;
    case 'ignore':
        switch (name) {
        case 'inline comment':
            return 'A comment. It is ignored by the engine.';
        }
        break;
    case 'literal':
        switch (name) {
        case 'literal block':
            return 'Will match the literal string "' + args[0] + '", treating any special characters as literal.';
        case 'text':
            return 'Will match the literal string "' + args[0] + '".';
        }
        break;
    case 'look around':
        switch (name) {
        case 'negative look-ahead':
            return 'Will try to match it\'s content from this position. If it succeeds, the look-ahead fails. If it fails, the look-ahead succeeds. It will restore the cursor position after the match.';
        case 'negative look-behind':
            return 'Will try to match it\'s content before this position. If it succeeds, the look-ahead fails. If it fails, the look-ahead succeeds. It will restore the cursor position after the match.';
        case 'positive look-ahead':
            return 'Will try to match it\'s content from this position. It will restore the cursor position after the match.';
        case 'positive look-behind':
            return 'Will try to match it\'s content before this position. It will restore the cursor position after the match.';
        }
        break;
    case 'reference':
        switch (name) {
        case 'reference by name': // [name]
            return 'Will match the exact string matched by the group named "' + args[0] + '".';
        case 'reference by number': // [num]
            return 'Will match the exact string matched by group ' + args[0] + '.';
        case 'relative reference by number': // [dist]
            return 'Will match the exact string matched by the group relative ' + args[0] + ' to this one.';
        }
        break;
    case 'subrutine':
        switch (name) {
        case 'call subpattern by name':
            return 'Match the pattern contained in the group named "' + args[0] + '". (Possibly recursive)';
        case 'call subpattern by number':
            return 'Match the pattern contained in group ' + args[0] + '. (Possibly recursive)';
        case 'call subpattern by relative number':
            return 'Match the pattern contained in the group relative ' + args[0] + ' to this one. (Possibly recursive)';
        case 'recursive whole pattern':
            return 'Match the whole pattern again, recursive.';
        }
        break;
    }
    return '<no description>';
};

Representer.prototype.represent = function(node) {
    var color = null;
    if (node['type'] != 'sequence' && 'children' in node) {
        color = this.next_color+=2;
        this.next_color %= this.num_colors;
    }
    var before = null, between = null, after = null;
    if (node['type'] != 'sequence') {
        if ('literal' in node) {
            before = this.make_html(node,node['literal']);
        }
        if ('literal_between' in node) {
            between = this.make_html(node,node['literal_between']);
        }
        if ('literal_after' in node) {
            after = this.make_html(node,node['literal_after']);
        }
    }
    var html = [];
    html.push('<span class="structure');
	html.push(' '+node.type);
	html.push(' '+node.name);
	
    if (color !== null) {
        html.push(' color');
        html.push(color);
    }
    html.push('">');
    html.push('<wbr/>');
    if (before !== null) {
        html.push(before);
    }
    if ('children' in node) {
        var n = node['children'].length;
        for (var i = 0; i < n; i++) {
            if (i > 0 && between !== null) {
                html.push(between);
            }
            html.push(this.represent(node['children'][i]));
        }
    }
    if (after !== null) {
        html.push(after);
    }
    html.push('</span>');
    return html.join('');
};
