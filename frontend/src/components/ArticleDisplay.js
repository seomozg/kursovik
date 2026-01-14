import React from 'react';

const ArticleDisplay = ({ article, forceUpdate, onRegenerate }) => {
  if (!article) return null;

  const renderContent = (text, parentTitle = '') => {
    if (!text) return '';

    // Split content into lines for processing
    const lines = text.split('\n');
    const processedLines = [];
    let currentListItems = [];
    let inCodeBlock = false;
    let codeBlockContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          const escapedCodeBlock = codeBlockContent.replace(/`/g, '\\`');
          processedLines.push(`<pre><code>${escapedCodeBlock}</code></pre>`);
          inCodeBlock = false;
          codeBlockContent = '';
        } else {
          // Start of code block
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        continue;
      }

      // Handle headers (## Header -> regular header)
      const headerMatch = line.match(/^#{2,}\s+(.+)$/);
      if (headerMatch) {
        const headerText = headerMatch[1].trim();
        const escapedHeaderText = headerText.replace(/`/g, '\\`');
        const headerLevel = line.match(/^#+/)[0].length;
        const marginLeft = Math.max(0, (headerLevel - 2) * 20); // Indent based on level

        // Create regular header
        const headerHtml = `<h${headerLevel} class="article-header" style="margin-left: ${marginLeft}px; margin-top: 20px; margin-bottom: 10px;">
          ${'#'.repeat(headerLevel - 1)} ${escapedHeaderText}
        </h${headerLevel}>`;

        processedLines.push(headerHtml);
        continue;
      }

      // Handle bold text
      let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Replace backticks with apostrophes to prevent display issues
      processedLine = processedLine.replace(/`/g, "'");

      // Handle math formulas
      processedLine = processedLine.replace(/\$([^$]+)\$/g, '<span class="math">$1</span>');

      // Handle lists
      if (processedLine.trim().match(/^[-*]\s/)) {
        const itemText = processedLine.trim().substring(2).replace(/`/g, '\\`');
        currentListItems.push(`<li>${itemText}</li>`);
        continue;
      }
      if (processedLine.trim().match(/^\d+\.\s/)) {
        const itemText = processedLine.trim().replace(/^\d+\.\s/, '').replace(/`/g, '\\`');
        currentListItems.push(`<li>${itemText}</li>`);
        continue;
      }

      // If we have accumulated list items, wrap them
      if (currentListItems.length > 0) {
        if (currentListItems[0].includes('1.') || currentListItems[0].includes('2.') || currentListItems[0].includes('3.')) {
          processedLines.push(`<ol>${currentListItems.join('')}</ol>`);
        } else {
          processedLines.push(`<ul>${currentListItems.join('')}</ul>`);
        }
        currentListItems = [];
      }

      // Regular line
      processedLines.push(processedLine || '<br/>');
    }

    // Handle any remaining list items
    if (currentListItems.length > 0) {
      if (currentListItems[0].includes('1.') || currentListItems[0].includes('2.') || currentListItems[0].includes('3.')) {
        processedLines.push(`<ol>${currentListItems.join('')}</ol>`);
      } else {
        processedLines.push(`<ul>${currentListItems.join('')}</ul>`);
      }
    }

    return processedLines.join('\n');
  };

  return (
    <div key={`${article.version || 'article'}-${forceUpdate}`} className="article-display">
      <div className="article-header">
        <h2>{article.title}</h2>
        {article.title !== 'Генерация оглавления...' && (
          <button
            className="regenerate-button"
            onClick={() => onRegenerate(article.title)}
            title="Перегенерировать статью"
          >
            🔄
          </button>
        )}
      </div>
      <div
        className="article-content"
        dangerouslySetInnerHTML={{ __html: renderContent(article.content, article.title) }}
      />
    </div>
  );
};

export default ArticleDisplay;
