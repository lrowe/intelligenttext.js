//    intelligenttext.js v0.1

//    (c) 2012 Laurence Rowe, Shuttle Thread Limited for Riot AS.
//    intelligenttext.js is distributed under the MIT license.
//    http://github.com/lrowe/intelligenttext.js

//    Transform plain text to HTML preserving line breaks and indentation and making URIs and email addresses clickable.

// AMD/global registrations
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['use!underscore', 'jquery'], function (_, jQuery) {
            return factory(_, jQuery);
        });
    } else {
        // Browser globals
        root.intelligent_text = factory(root._, root.jQuery);
    }
}(this, function (_, jQuery) {

    var tokenizers;

    // The `intelligent_text` function is exported. Parameters are `text` and an optional `options` object.
    function intelligent_text(text, options) {
        var context = {options: {}};

        // The following options are available:
        _.defaults(context.options, options || {}, {
            // `tab_spaces` - by default, tabs are converted to four spaces (though only whitespace at the beginning or a line is considered significant.)
            tab_spaces: '    ',
            // 'uri_max` is the preferred maximum length of a URI/URL/IRI.
            uri_max: 60,
            // Only the path, query string and fragment idenifier is ever truncated, and only then when it is over `path_min` in length.
            path_min: 5,
            // `ellipsis` is the truncation character.
            ellipsis: '&hellip;',
            // `target` for generated links (e.g. _blank).
            target: null
        });

        // The context object is used to maintain state between functions.
        // Output is emitted by calling `this.out.push()`.
        context.out = [];

        // Javascript treats '\n' as the universal newline character, so no need to worry about '\r\n'.
        _.each(text.split('\n'), visit_line, context);

        // Output is joined and returned
        return context.out.join('');
    }

    // Linebreaks are converted to paragraphs.
    function visit_line(line) {
        this.out.push('<p>');
        line = leading_space.call(this, line);
        tokenize_line.call(this, line);
        this.out.push('</p>\n');
    }

    // Leading space is converted to &nbsp; to preserve indentation.
    function leading_space(line) {
        var match = /^\s+/.exec(line);
        if (match) {
            this.out.push(match[0].replace(/\t/g, this.options.tab_spaces).replace(/\s/g, '&nbsp;'));
            return line.slice(match[0].length);
        } else {
            return line;
        }
    }

    // Special tokens (URIs and email addresses) are identified and formatted.
    function tokenize_line(line) {
        // Loop over the tokens in the line
        this.remaining = line;
        while (this.remaining) {

            // Context for tokenizers
            this.index = this.remaining.length;
            this.match= null;
            this.tokenizer = null;

            // Check each tokenizer to find the next token
            _.each(tokenizers, visit_tokenizer, this);

            // When a token is found:
            if (this.match) {
                // - emit any text leading up to the token
                this.out.push(escape(this.remaining.slice(0, this.match.index)));
                // - format and emit the token
                this.out.push(this.tokenizer.format.call(this, this.match));
                // - continue processing any following text
                this.remaining = this.remaining.slice(this.match.index + this.match[0].length);

            // Otherwise emit the remaining text and finish.
            } else {
                this.out.push(escape(this.remaining));
                this.remaining = '';
            }
        }
    }

    function visit_tokenizer(tokenizer) {
        var match = tokenizer.regex.exec(this.remaining);
        if (match && match.index < this.index) {
            this.index = match.index;
            this.match = match;
            this.tokenizer = tokenizer;
        }
    }

    // Tokenizers
    // ----------

    // Tokenizers locate and format matching tokens
    tokenizers = {

        // Email addresses

        email: {
            regex: /\b(?:(?:[^<>()\[\]\\.,;:\s@\"]+(?:\.[^<>()\[\]\\.,;:\s@\"]+)*)|(?:\".+\"))@(?:(?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(?:(?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))\b/,

            format: function (match) {
                var email = match[0],
                    target = '';

                // Set the link target attribute if required.
                if (this.options.target) {
                    target = ' target="' + escape(this.options.target) + '"';
                }

                return '<a' + target + ' href="mailto:' + escape(email) + '">' + escape(email) + '</a>';
            }
        },

        // Internationalized Resource Identifiers (IRIs) / URIs / URLs

        iri: {
            // This regex is responsible for preventing script injections by not matching data: or javascript: urls
            regex: /\b(?:(https?):\/\/(?:(?:(?:[^:@\\\s]+)(?::(?:[^:@\\\s]+))?)?@)?)?(?:(?:[0-9]{1,3}(?:\.[0-9]{1,3}){3})|(?:[\-0-9a-z\u00A0-\uFFFD]{1,63}(?:\.[\-0-9a-z\u00A0-\uFFFD]{1,63})+))(?::[0-9]+)?(\/(?:%[0-9a-f][0-9a-f]|[\-\._!\$&'\(\)\*\+,:;=@~0-9a-z\u00A0-\uFFFD\/\?\#])*)?/i,

            format: function (match) {
                var href,
                    snip,
                    target = '',
                    ellipsis = '',
                    remainder = '',
                    iri = match[0],
                    scheme = match[1],
                    // `path` here is really path + query + fragment
                    path = match[2] || '',
                    // `domain` here is really scheme + user + host + port
                    domain = iri.slice(0, (-path.length || undefined));

                // Assume trailing commas or full stops are not part of IRI.
                if (_.contains(['.',','], iri.slice(-1))) {
                    remainder = iri.slice(-1) + remainder;
                    iri = iri.slice(0, -1);
                }

                // Assume unbalanced closing parentheses are not part of IRI.
                if (iri.slice(-1) === ')' && iri.split(')').length > iri.split('(').length) {
                    remainder = iri.slice(-1) + remainder;
                    iri = iri.slice(0, -1);
                }

                // IRIs missing a scheme are prefixed with `http://`
                if (scheme) {
                    href = iri;
                } else {
                    href = 'http://' + iri;
                }

                // Only Firefox and Opera currently display Internationalized Domain Names (IDNs) in the URL bar
                // (and copy the unicode version to the clipboard.)
                // IE 9 and Chrome 18 display the punycode encoded domain name.
                // https://github.com/bestiejs/punycode.js migh be used here to unencode them.
                // No attempt is made to avoid spoofed IRIs, this would probably require whitelisting TLDs:
                // http://www.mozilla.org/projects/security/tld-idn-policy-list.html

                // Unescape any URL-escaped unicode path characters for display
                path = unescape_iri_path(path);
                iri = domain + path;

                // Abbreviate long paths.
                // The domain is not abbreviated to avoid spoofing attacks.
                if (iri.length > this.options.uri_max && path.length > this.options.path_min) {
                    snip = domain.length + this.options.path_min;
                    if (snip < this.options.uri_max) {
                        snip = this.options.uri_max;
                    }
                    iri = iri.slice(0, snip);
                    ellipsis = this.options.ellipsis;
                }

                // Set the link target attribute if required.
                if (this.options.target) {
                    target = ' target="' + escape(this.options.target) + '"';
                }

                return '<a' + target + ' href="' + escape(href) + '">' + escape(iri) + ellipsis + '</a>' + escape(remainder);
            }
        }
    };

    // Utility functions
    // -----------------

    // _.escape escapes '/' which makes test cases unreadable
    function escape(string) {
        return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    }

    // IRI paths are copied to the clipboard with unicode characters escaped. Unescape them for human readability.
    function unescape_iri_path(path) {
        return path.replace(/(?:%[0-9a-f][0-9a-f])+/gi, function (str) {
            return _.map(decodeURIComponent(str).split(''), function(chr) {
                // Only unescape non-ascii characters
                var encoded = encodeURIComponent(chr);
                if (encoded.length > 3) {
                    return chr;
                } else {
                    return encoded;
                }
            }).join('');
        });
    }

    // jQuery plugin
    // -------------
    if (typeof jQuery !== 'undefined') {
        jQuery.fn.intelligentText = function (options) {
            return this.each(function () {
                var $this = jQuery(this);
                $this.html(intelligent_text($this.text()));
            });
        };
    }

    return intelligent_text;
}));
