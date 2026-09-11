import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from '~/spreadsheet/markdown/HtmlToMarkdown.js';

describe('htmlToMarkdown', () => {
   it('returns an empty string for blank or undefined input', () => {
      expect(htmlToMarkdown('')).toBe('');
      expect(htmlToMarkdown(undefined)).toBe('');
      expect(htmlToMarkdown(null)).toBe('');
   });

   it('renders <p> as a paragraph, blank line between paragraphs', () => {
      expect(htmlToMarkdown('<p>First.</p><p>Second.</p>')).toBe('First.\n\nSecond.');
   });

   it('renders <br> as a line break', () => {
      expect(htmlToMarkdown('<p>Line one<br>Line two</p>')).toBe('Line one  \nLine two');
   });

   it('renders <strong> and <b> as bold', () => {
      expect(htmlToMarkdown('<p><strong>Bold</strong> and <b>also bold</b></p>')).toBe(
         '**Bold** and **also bold**',
      );
   });

   it('renders <em> and <i> as italic', () => {
      expect(htmlToMarkdown('<p><em>Italic</em> and <i>also italic</i></p>')).toBe(
         '*Italic* and *also italic*',
      );
   });

   it('renders <s>, <del>, and <strike> as strikethrough', () => {
      expect(htmlToMarkdown('<p><s>a</s> <del>b</del> <strike>c</strike></p>')).toBe('~~a~~ ~~b~~ ~~c~~');
   });

   it('renders <u> as unchanged text', () => {
      expect(htmlToMarkdown('<p><u>Underlined</u></p>')).toBe('Underlined');
   });

   it('renders <code> with backticks and no inner escaping', () => {
      expect(htmlToMarkdown('<p><code>a + b</code></p>')).toBe('`a + b`');
   });

   it('renders <pre> as a fenced block, preserving whitespace', () => {
      expect(htmlToMarkdown('<pre>line one\n  line two</pre>')).toBe('```\nline one\n  line two\n```');
   });

   it('renders <a href> as a link', () => {
      expect(htmlToMarkdown('<p><a href="https://example.com">Link</a></p>')).toBe(
         '[Link](https://example.com)',
      );
   });

   it('renders an unordered list, top-level items blank-line separated', () => {
      expect(htmlToMarkdown('<ul><li>One</li><li>Two</li></ul>')).toBe('* One\n\n* Two');
   });

   it('renders an ordered list with numbered markers', () => {
      expect(htmlToMarkdown('<ol><li>One</li><li>Two</li><li>Three</li></ol>')).toBe(
         '1. One\n\n2. Two\n\n3. Three',
      );
   });

   it('renders a nested list directly under its parent item, indented two spaces', () => {
      expect(
         htmlToMarkdown('<ul><li>Parent<ul><li>Child one</li><li>Child two</li></ul></li></ul>'),
      ).toBe('* Parent\n  * Child one\n  * Child two');
   });

   it('renders headings as a bold paragraph, never a Markdown heading', () => {
      expect(htmlToMarkdown('<h2>A Heading</h2><p>Body.</p>')).toBe('**A Heading**\n\nBody.');
   });

   it('renders <blockquote> with "> " prefixed lines', () => {
      expect(htmlToMarkdown('<blockquote><p>Quoted.</p></blockquote>')).toBe('> Quoted.');
   });

   it('renders <hr> as a thematic break', () => {
      expect(htmlToMarkdown('<p>Before.</p><hr><p>After.</p>')).toBe('Before.\n\n***\n\nAfter.');
   });

   it('renders a <table> with a <th> header row as a GFM pipe table', () => {
      const html = '<table><tr><th>Result</th><th>Effect</th></tr>'
         + '<tr><td>1-3</td><td>Nothing happens</td></tr>'
         + '<tr><td>4-8</td><td>You suffer 1d6 Damage.</td></tr></table>';
      expect(htmlToMarkdown(html)).toBe(
         '| Result | Effect |\n'
         + '| --- | --- |\n'
         + '| 1\\-3 | Nothing happens |\n'
         + '| 4\\-8 | You suffer 1d6 Damage. |',
      );
   });

   it('synthesizes a blank header row for a <table> with no <th> cells', () => {
      const html = '<table><tr><td>a</td><td>b</td></tr></table>';
      expect(htmlToMarkdown(html)).toBe('|  |  |\n| --- | --- |\n| a | b |');
   });

   it('renders <img alt> as its alt text, or nothing when absent', () => {
      expect(htmlToMarkdown('<p><img src="x.png" alt="A picture"></p>')).toBe('A picture');
      expect(htmlToMarkdown('<p><img src="x.png"></p>')).toBe('');
   });

   it('decodes entities in <img alt>', () => {
      expect(htmlToMarkdown('<p><img src="x.png" alt="Tom &amp; Jerry"></p>')).toBe('Tom & Jerry');
   });

   it('drops <section class="secret"> entirely', () => {
      expect(
         htmlToMarkdown('<p>Visible.</p><section class="secret"><p>GM only.</p></section>'),
      ).toBe('Visible.');
   });

   it('renders an unrecognized tag by rendering its children inline', () => {
      expect(htmlToMarkdown('<p>Text with a <span>span</span> inside.</p>')).toBe(
         'Text with a span inside.',
      );
   });

   it('decodes named entities', () => {
      expect(htmlToMarkdown('<p>Tom &amp; Jerry &lt;3 &quot;quotes&quot; &apos;apos&apos;</p>')).toBe(
         'Tom & Jerry <3 "quotes" \'apos\'',
      );
   });

   it('decodes numeric character references, decimal and hex', () => {
      expect(htmlToMarkdown('<p>&#65;&#x42;&#67;</p>')).toBe('ABC');
   });

   it('decodes &nbsp; as a plain space', () => {
      expect(htmlToMarkdown('<p>a&nbsp;b</p>')).toBe('a b');
   });

   it('collapses runs of whitespace in text nodes', () => {
      expect(htmlToMarkdown('<p>a   b\n\n  c</p>')).toBe('a b c');
   });

   it('expands @UUID with an explicit label to italicized label text', () => {
      expect(htmlToMarkdown('<p>Cast @UUID[Item.abc]{Fireball} now.</p>')).toBe('Cast *Fireball* now.');
   });

   it('expands @UUID with no label to the italicized last reference segment', () => {
      expect(
         htmlToMarkdown('<p>@UUID[Compendium.titan.effects.Item.xyz]</p>'),
      ).toBe('*xyz*');
   });

   it('expands an inline roll to its formula, verbatim', () => {
      expect(htmlToMarkdown('<p>Roll [[/r 1d6]] damage.</p>')).toBe('Roll 1d6 damage.');
      expect(htmlToMarkdown('<p>[[/roll 2d6+1]]</p>')).toBe('2d6+1');
      expect(htmlToMarkdown('<p>[[1d6]]</p>')).toBe('1d6');
   });

   it('reproduces the miscasting table from an HTML table', () => {
      const html = '<table><tr><th>Result</th><th>Effect</th></tr>'
         + '<tr><td>1-3</td><td>Nothing happens</td></tr>'
         + '<tr><td>4-8</td><td>The magical energy erupts as you try to control it. You suffer 1d6 Damage.</td></tr>'
         + '<tr><td>9-10</td><td>The spell is cast but it has the opposite effect to what was intended.</td></tr>'
         + '<tr><td>11-12</td><td>Arcane energy floods your mind, momentarily disorienting you.</td></tr>'
         + '<tr><td>13-14</td><td>Your body and mind are so overcome with the uncontrolled magical power.</td></tr>'
         + '<tr><td>15-17</td><td>You simply cannot withstand the onslaught of uncontrolled aetheric energy.</td></tr>'
         + '<tr><td>18+</td><td>The magic you have lost control of begins to destroy you from the inside out.</td></tr>'
         + '</table>';
      expect(htmlToMarkdown(html)).toBe(
         '| Result | Effect |\n'
         + '| --- | --- |\n'
         + '| 1\\-3 | Nothing happens |\n'
         + '| 4\\-8 | The magical energy erupts as you try to control it. You suffer 1d6 Damage. |\n'
         + '| 9\\-10 | The spell is cast but it has the opposite effect to what was intended. |\n'
         + '| 11\\-12 | Arcane energy floods your mind, momentarily disorienting you. |\n'
         + '| 13\\-14 | Your body and mind are so overcome with the uncontrolled magical power. |\n'
         + '| 15\\-17 | You simply cannot withstand the onslaught of uncontrolled aetheric energy. |\n'
         + '| 18\\+ | The magic you have lost control of begins to destroy you from the inside out. |',
      );
   });

   it('escapes +, a leading negative number, and * in plain text', () => {
      expect(htmlToMarkdown('<p>+1 bonus, -3 penalty, a * b</p>')).toBe('\\+1 bonus, \\-3 penalty, a \\* b');
   });

   it('escapes a pipe character inside a table cell', () => {
      const html = '<table><tr><th>A</th></tr><tr><td>a | b</td></tr></table>';
      expect(htmlToMarkdown(html)).toBe('| A |\n| --- |\n| a \\| b |');
   });

   it('implicitly closes an unclosed <p> on the next sibling <p>', () => {
      expect(htmlToMarkdown('<p>A<p>B</p>')).toBe('A\n\nB');
   });

   it('implicitly closes an unclosed <li> on the next sibling <li>', () => {
      expect(htmlToMarkdown('<ul><li>One<li>Two</ul>')).toBe('* One\n\n* Two');
   });

   it('implicitly closes unclosed <td> cells and <tr> rows into a two-row pipe table', () => {
      const html = '<table><tr><td>a<td>b<tr><td>c<td>d</table>';
      expect(htmlToMarkdown(html)).toBe('|  |  |\n| --- | --- |\n| a | b |\n| c | d |');
   });

   it('closes a nested list before resuming the outer list on the next sibling <li>', () => {
      const html = '<ul><li>One<ul><li>Nested</ul><li>Two</ul>';
      expect(htmlToMarkdown(html)).toBe('* One\n  * Nested\n\n* Two');
   });

   it('bounds the implicit paragraph close at table scope', () => {
      const html = '<table><tr><p>Outer<td><p>Inner</p></td></tr></table>';
      /** @type {string} The rendered table; a stray outer <p> must not swallow the cell's <p>. */
      const result = htmlToMarkdown(html);
      expect(result).toBe('|  |  |\n| --- | --- |\n| Outer | Inner |');
      expect(result).toContain('Inner');
      expect(result).toContain('Outer');
   });
});
