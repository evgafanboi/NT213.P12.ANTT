const { marked } = require('marked');
const DOMPurify = require('isomorphic-dompurify');
const hljs = require('highlight.js');

// Configure marked options
marked.setOptions({
    highlight: function(code, lang) {
        try {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        } catch (e) {
            console.error('Highlight.js error:', e);
            return code; // Fallback to unformatted code
        }
    },
    breaks: true, // Convert \n to <br>
    gfm: true, // GitHub Flavored Markdown
    headerIds: true,
    mangle: false, // Don't escape HTML in headings
    sanitize: false, // Let DOMPurify handle sanitization
    smartLists: true,
    smartypants: true,
    xhtml: true
});

// Configure DOMPurify HTML elements whitelist
const purifyOptions = {
    ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'code', 'pre', 'strong', 'em', 'br', 'span', 'table', 'div', 'a', 'blockquote'
    ],
    ALLOWED_ATTR: ['href', 'class', 'style'],
    ALLOWED_CLASSES: {
        'pre': ['language-*'],
        'code': ['language-*'],
        'span': ['hljs-*']
    },
    FORBID_TAGS: ['style', 'script'],
    FORBID_ATTR: ['style', 'onerror', 'onclick'],
    ALLOW_DATA_ATTR: false
};

function renderAndSanitizeMarkdown(content) {
    if (!content) return '';
    
    try {
        // First render markdown to HTML
        const renderedMarkdown = marked(content);
        
        // Then sanitize the HTML
        const sanitizedContent = DOMPurify.sanitize(renderedMarkdown, purifyOptions);
        
        return sanitizedContent;
    } catch (error) {
        console.error('Error in renderAndSanitizeMarkdown:', error);
        return 'Error rendering content';
    }
}

module.exports = {
    renderAndSanitizeMarkdown
};