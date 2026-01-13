import React from 'react';

const Sidebar = ({
  outlineTitle,
  outline,
  onStepClick,
  articleHierarchy = {},
  collapsedSections = new Set(),
  generatedArticles = new Set(),
  onToggleCollapse
}) => {
  const renderOutlineItem = (item, level = 0) => {
    const hasChildren = articleHierarchy[item] && articleHierarchy[item].length > 0;
    const isCollapsed = collapsedSections.has(item);
    const marginLeft = level * 15;

    return (
      <li key={item} style={{ marginLeft: `${marginLeft}px` }}>
        {hasChildren && (
          <button
            className="collapse-button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(item);
            }}
            style={{
              marginRight: '5px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#666'
            }}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        )}
        <span
          onClick={() => onStepClick(item)}
          className={generatedArticles.has(item) ? 'generated outline-link' : 'outline-link'}
          style={{ cursor: 'pointer' }}
        >
          {item}
        </span>
        {hasChildren && !isCollapsed && (
          <ul>
            {articleHierarchy[item].map(child => renderOutlineItem(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="sidebar">
      {outlineTitle && (
        <div className="outline-title">
          <h3>{outlineTitle}</h3>
        </div>
      )}
      {outline.length > 0 && (
        <div className="outline">
          <ul>
            {outline.map((item, index) => renderOutlineItem(item, 0))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
