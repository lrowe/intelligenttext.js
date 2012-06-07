(function (intelligent_text, _, $) {

    // [[input, output, options]]
    function intelligent_text_cases(test_cases) {
        _.each(test_cases, function(example) {
            it(example[0], function () {
                expect(intelligent_text(example[0], example[2])).toEqual(example[1]);
            });
        });
    }

    describe('Intelligent Text', function () {

        describe('Text', function () {
            intelligent_text_cases([
                ['One.\nTwo.\nThree.', '<p>One.</p>\n<p>Two.</p>\n<p>Three.</p>\n'],
                ['  leading space.', '<p>&nbsp;&nbsp;leading space.</p>\n'],
                ['\tleading tab.', '<p>&nbsp;&nbsp;&nbsp;&nbsp;leading tab.</p>\n']
            ]);
        });


        describe('Email', function () {
            intelligent_text_cases([
                ['test@example.com', '<p><a href="mailto:test@example.com">test@example.com</a></p>\n'],
                ['test@example.com', '<p><a target="_blank" href="mailto:test@example.com">test@example.com</a></p>\n', {target: '_blank'}],
                ['test@example.com.', '<p><a href="mailto:test@example.com">test@example.com</a>.</p>\n'],
                ['(test@example.com)', '<p>(<a href="mailto:test@example.com">test@example.com</a>)</p>\n'],
                ['(test@example.com).', '<p>(<a href="mailto:test@example.com">test@example.com</a>).</p>\n'],
                ['text a@example.com b@example.com text',
                 '<p>text <a href="mailto:a@example.com">a@example.com</a> <a href="mailto:b@example.com">b@example.com</a> text</p>\n']
            ]);
        });

        describe('IRI', function () {
            intelligent_text_cases([
                ['http://example.com', '<p><a href="http://example.com">http://example.com</a></p>\n'],
                ['example.com', '<p><a href="http://example.com">example.com</a></p>\n'],
                ['example.com', '<p><a target="_blank" href="http://example.com">example.com</a></p>\n', {target: '_blank'}],
                ['http://en.wikipedia.org/wiki/Stade_Fran%C3%A7ais',
                 '<p><a href="http://en.wikipedia.org/wiki/Stade_Fran%C3%A7ais">http://en.wikipedia.org/wiki/Stade_Français</a></p>\n'],
                ['http://παράδειγμα.δοκιμή/%CE%91%CF%81%CF%87%CE%B9%CE%BA%CE%AE_%CF%83%CE%B5%CE%BB%CE%AF%CE%B4%CE%B1',
                 '<p><a href="http://παράδειγμα.δοκιμή/%CE%91%CF%81%CF%87%CE%B9%CE%BA%CE%AE_%CF%83%CE%B5%CE%BB%CE%AF%CE%B4%CE%B1">http://παράδειγμα.δοκιμή/Αρχική_σελίδα</a></p>\n'],
                ['text example.com. text', '<p>text <a href="http://example.com">example.com</a>. text</p>\n'],
                ['example.com/a?b=c', '<p><a href="http://example.com/a?b=c">example.com/a?b=c</a></p>\n'],
                ['example.com/a example.com/b',
                 '<p><a href="http://example.com/a">example.com/a</a> <a href="http://example.com/b">example.com/b</a></p>\n'],
                ['example.com.', '<p><a href="http://example.com">example.com</a>.</p>\n'],
                ['(example.com)', '<p>(<a href="http://example.com">example.com</a>)</p>\n'],
                ['(example.com).', '<p>(<a href="http://example.com">example.com</a>).</p>\n'],
                ['http://en.wikipedia.org/wiki/Model_(abstract)',
                 '<p><a href="http://en.wikipedia.org/wiki/Model_(abstract)">http://en.wikipedia.org/wiki/Model_(abstract)</a></p>\n'],
                ['http://long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long/',
                 '<p><a href="http://long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long/">http://long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long/</a></p>\n'],
                ['http://long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long/long/path/is/very/long',
                 '<p><a href="http://long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long/long/path/is/very/long">http://long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long.long.hostname.is.very.long/long&hellip;</a></p>\n'],
                ['evil data:text/html,<script>alert("foo")</script>', '<p>evil data:text/html,&lt;script&gt;alert(&quot;foo&quot;)&lt;/script&gt;</p>\n'],
                ['evil javascript:alert("foo")', '<p>evil javascript:alert(&quot;foo&quot;)</p>\n']
            ]);
        });

        describe('jQuery integration', function () {
            it('$().intelligentText()', function () {
                expect($('<div>foo\nbar</div>').intelligentText().find('p').length).toEqual(2);
            });
        });

    });
})(this.intelligent_text, this._, this.jQuery);
