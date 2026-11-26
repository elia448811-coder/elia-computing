import sanitizeHtml from "sanitize-html";

export function cleanHtml(content: string) {
  return sanitizeHtml(content, {
    allowedTags: ["h1", "h2", "h3", "p", "br", "hr", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "a", "span", "font", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: {
      a: ["href", "target"],
      span: ["class", "contenteditable", "data-field", "data-signer-id", "style", "id"],
      font: ["size", "color"],
      "*": ["style", "id"],
    },
    allowedClasses: { span: ["quick-field-token", "signature-field"] },
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^right$/, /^center$/],
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i],
        "font-size": [/^(?:8|9|10|11|12|14|16|18|20|22|24|28|32|36|48|72)pt$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}

export function quickFieldHtml(field: string, value: string) {
  const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<span class="quick-field-token" contenteditable="true" data-field="${escape(field)}">${escape(value)}</span>`;
}
