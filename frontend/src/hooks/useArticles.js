import { useState, useCallback } from 'react';
import axios from 'axios';
import { BACKEND_URL, ARTICLE_GENERATION_TIMEOUT_MS, OUTLINE_GENERATION_TIMEOUT_MS } from '../config';

export const useArticles = (addTopic) => {
  const [outline, setOutline] = useState([]);
  const [outlineTitle, setOutlineTitle] = useState('');
  const [currentArticle, setCurrentArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [generatedArticles, setGeneratedArticles] = useState(new Set());
  const [forceUpdate, setForceUpdate] = useState(0);
  const [articleHierarchy, setArticleHierarchy] = useState({});
  const [collapsedSections, setCollapsedSections] = useState(new Set());

  const handleGenerateOutline = async (topic) => {
    if (!topic.trim()) return;

    setLoading(true);
    setStreaming(true);

    try {
      const encodedTopic = encodeURIComponent(topic);
      const encodedTitle = encodeURIComponent("__OUTLINE__");
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/generate-article?topic=${encodedTopic}&title=${encodedTitle}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket outline connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            console.error('WebSocket outline error:', data.error);
            alert(`Ошибка генерации оглавления: ${data.error}`);
            setLoading(false);
            setStreaming(false);
            ws.close();
            return;
          }

          console.log('Outline WebSocket message:', { status: data.status, contentLength: data.content?.length || 0 });

          if (data.status === 'generating') {
            let content = data.content || '';
            if (data.content_b64) {
              try {
                const binaryString = atob(data.content_b64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                content = new TextDecoder('utf-8').decode(bytes);
              } catch (decodeError) {
                console.error('Error decoding outline base64 content:', decodeError);
                content = data.content_b64;
              }
            }
            setCurrentArticle({
              id: Date.now(),
              title: 'Генерация оглавления...',
              content: content,
              status: data.status,
              version: data.version
            });
            setStreaming(true);
          }

          if (data.status === 'ready' && data.titles && data.titles.length > 0) {
            setCurrentArticle(null);
            setOutlineTitle(data.titles[0] || '');
            setOutline(data.titles.slice(1));
            setLoading(false);
            setStreaming(false);

            // Add topic to available topics
            if (addTopic) {
              addTopic(topic);
            }

            console.log('Outline generation completed, titles:', data.titles.length);
            ws.close();
          }
        } catch (error) {
          console.error('Error parsing outline WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket outline error:', error);
        alert('Ошибка подключения к стримингу оглавления');
        setLoading(false);
        setStreaming(false);
      };

      ws.onclose = () => {
        console.log('WebSocket outline closed');
      };

      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          setLoading(false);
          setStreaming(false);
        }
      }, OUTLINE_GENERATION_TIMEOUT_MS);

    } catch (error) {
      console.error('Error starting outline generation:', error);
      let message = 'Ошибка при работе с оглавлением.';
      if (error.response) {
        message = error.response.data.detail || message;
      }
      alert(message);
      setLoading(false);
      setStreaming(false);
    }
  };

  const checkGeneratedArticles = async (topicName, outlineItems) => {
    const generated = new Set();
    const hierarchy = {};

    for (const item of outlineItems) {
      try {
        const encodedTitle = encodeURIComponent(encodeURIComponent(item));
        const response = await axios.get(`${BACKEND_URL}/api/topics/${encodeURIComponent(topicName)}/${encodedTitle}`);
        if (response.data.status === 'ready' && response.data.content) {
          generated.add(item);

          const content = response.data.content;
          if (content) {
            const lines = content.split('\n');
            const subHeaders = [];
            for (const line of lines) {
              const headerMatch = line.match(/^#{2,}\s+(.+)$/);
              if (headerMatch) {
                subHeaders.push(headerMatch[1].trim());
              }
            }
            if (subHeaders.length > 0) {
              hierarchy[item] = subHeaders;
            }
          }
        }
      } catch (error) {
        // Article doesn't exist, continue
      }
    }

    setGeneratedArticles(generated);
    setArticleHierarchy(prev => ({ ...prev, ...hierarchy }));
  };

  const handleTopicTagClick = async (topicName) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/topics/${topicName}`);
      const titles = response.data.titles || [];
      setOutlineTitle(titles[0] || '');
      const outlineItems = titles.slice(1);
      setOutline(outlineItems);

      await checkGeneratedArticles(topicName, outlineItems);
    } catch (error) {
      console.error('Error loading outline:', error);
      alert('Ошибка при загрузке оглавления для этой темы.');
    }
  };

  const handleStepClick = async (stepTitle, topicName, forceRegenerate = false) => {
    if (!topicName || !topicName.trim()) return;

    if (forceRegenerate) {
      setArticleHierarchy(prev => {
        const newHierarchy = { ...prev };
        delete newHierarchy[stepTitle];
        return newHierarchy;
      });
    }

    setCurrentArticle(null);
    setLoading(true);
    setStreaming(true);

    try {
      if (!forceRegenerate) {
        try {
          const encodedTitle = encodeURIComponent(encodeURIComponent(stepTitle));
          const checkResponse = await axios.get(`${BACKEND_URL}/api/topics/${encodeURIComponent(topicName)}/${encodedTitle}`);
          const existingArticle = checkResponse.data;

          if (existingArticle.status === 'ready' && existingArticle.content) {
            setCurrentArticle(existingArticle);
            setLoading(false);
            setStreaming(false);
            return;
          }
        } catch (error) {
          if (error.response?.status !== 404) {
            throw error;
          }
        }
      }

      const encodedTopic = encodeURIComponent(topicName);
      const encodedTitle = encodeURIComponent(stepTitle);
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/generate-article?topic=${encodedTopic}&title=${encodedTitle}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for article streaming');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            console.error('WebSocket error:', data.error);
            alert(`Ошибка генерации: ${data.error}`);
            setLoading(false);
            setStreaming(false);
            ws.close();
            return;
          }

          let content = data.content || '';
          if (data.content_b64) {
            try {
              const binaryString = atob(data.content_b64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              content = new TextDecoder('utf-8').decode(bytes);
            } catch (decodeError) {
              console.error('Error decoding base64 content:', decodeError);
              content = data.content_b64;
            }
          }

          setCurrentArticle({
            id: Date.now(),
            title: stepTitle,
            content: content,
            status: data.status,
            version: data.version
          });

          if (data.status === 'ready') {
            console.log('Article completed! Full content length:', data.content?.length || data.content_b64?.length);
            setLoading(false);
            setStreaming(false);
            setGeneratedArticles(prev => new Set([...prev, stepTitle]));

            const lines = content.split('\n');
            const subHeaders = [];
            for (const line of lines) {
              const headerMatch = line.match(/^#{2,}\s+(.+)$/);
              if (headerMatch) {
                subHeaders.push(headerMatch[1].trim());
              }
            }

            if (subHeaders.length > 0) {
              console.log('Found sub-headers:', subHeaders);
              setArticleHierarchy(prev => ({
                ...prev,
                [stepTitle]: subHeaders
              }));
            }

            ws.close();
          }
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
          console.log('Raw message data:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('Ошибка подключения к стримингу');
        setLoading(false);
        setStreaming(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
      };

      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          setLoading(false);
          setStreaming(false);
        }
      }, ARTICLE_GENERATION_TIMEOUT_MS);

    } catch (error) {
      console.error('Error starting article generation:', error);
      let message = 'Ошибка при работе со статьей.';
      if (error.response) {
        message = error.response.data.detail || message;
      }
      alert(message);
      setLoading(false);
      setStreaming(false);
    }
  };

  const toggleCollapse = useCallback((item) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  }, []);

  return {
    outline,
    outlineTitle,
    currentArticle,
    loading,
    streaming,
    generatedArticles,
    forceUpdate,
    articleHierarchy,
    collapsedSections,
    handleGenerateOutline,
    checkGeneratedArticles,
    handleTopicTagClick,
    handleStepClick,
    toggleCollapse,
    setForceUpdate
  };
};
