import { useState, useCallback, useEffect } from 'react';
import { BACKEND_URL, HINT_GENERATION_TIMEOUT_MS } from '../config';

export const useHints = () => {
  const [selectedText, setSelectedText] = useState('');
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintContent, setHintContent] = useState('');
  const [hintStreaming, setHintStreaming] = useState(false);

  const generateHint = useCallback(async (selectedText, topicName) => {
    if (!selectedText.trim()) return;

    setHintContent('');
    setHintStreaming(true);

    try {
      const currentTopic = topicName || 'программирование';
      const hintQuery = `Объясни в контексте темы "${currentTopic}": ${selectedText}`;

      console.log('Generating hint for:', hintQuery);

      const encodedTopic = encodeURIComponent(currentTopic);
      const encodedTitle = encodeURIComponent(`__HINT__${selectedText}__`);
      // For local development, connect directly to backend
      // For production, use relative WebSocket URL through nginx proxy
      const isLocalhost = window.location.hostname === 'localhost';
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = isLocalhost ? 'localhost:8082' : window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/ws/generate-article?topic=${encodedTopic}&title=${encodedTitle}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for hint generation');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            console.error('WebSocket hint error:', data.error);
            setHintContent(`Ошибка: ${data.error}`);
            setHintStreaming(false);
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
              console.error('Error decoding hint base64:', decodeError);
              content = data.content_b64;
            }
          }

          setHintContent(content);

          if (data.status === 'ready') {
            console.log('Hint completed! Length:', content.length);
            setHintStreaming(false);
            ws.close();
          }
        } catch (parseError) {
          console.error('Error parsing hint WebSocket message:', parseError);
          setHintContent('Ошибка обработки ответа');
          setHintStreaming(false);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket hint error:', error);
        setHintContent('Ошибка подключения');
        setHintStreaming(false);
      };

      ws.onclose = () => {
        console.log('Hint WebSocket closed');
        setHintStreaming(false);
      };

      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          setHintStreaming(false);
        }
      }, HINT_GENERATION_TIMEOUT_MS);

    } catch (error) {
      console.error('Error generating hint:', error);
      setHintContent('Ошибка генерации подсказки');
      setHintStreaming(false);
    }
  }, []);

  // Removed useEffect - generateHint will be called manually from App.js

  const handleCloseHintModal = () => {
    setShowHintModal(false);
    setHintContent('');
    setHintStreaming(false);
  };

  return {
    selectedText,
    showHintModal,
    hintContent,
    hintStreaming,
    setSelectedText,
    setShowHintModal,
    generateHint,
    handleCloseHintModal
  };
};
