import { useState, useEffect } from 'react';
import axios from 'axios';

// Frontend configuration
// Always use relative URLs - nginx proxies /api/ and /ws/ to backend
// Only use direct URLs for localhost development
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export const useTopics = () => {
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available topics on mount
  useEffect(() => {
    const loadTopics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Always use relative URLs for production (nginx proxies)
        // Only use direct URLs for localhost development
        const url = isLocalhost ? 'http://localhost:8000' : '';

        console.log('Loading topics from:', `${url}/api/topics/`);
        const response = await axios.get(`${url}/api/topics/`, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('Topics loaded:', response.data);
        const topics = response.data.map((t: { name: string }) => t.name);
        setAvailableTopics(topics);
      } catch (error) {
        let errorMsg = 'Unknown error';
        if (axios.isAxiosError(error)) {
          if (error.response) {
            errorMsg = `Server error: ${error.response.status}`;
          } else if (error.request) {
            errorMsg = 'No response from server - check if backend is running on port 8000';
          } else {
            errorMsg = error.message;
          }
        } else if (error instanceof Error) {
          errorMsg = error.message;
        }
        console.error('Error loading topics:', errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };
    loadTopics();
  }, []);

  const addTopic = (topicName: string) => {
    setAvailableTopics(prev => {
      if (!prev.includes(topicName)) {
        return [...prev, topicName];
      }
      return prev;
    });
  };

  const removeTopic = (topicName: string) => {
    setAvailableTopics(prev => prev.filter(topic => topic !== topicName));
  };

  return {
    availableTopics,
    addTopic,
    removeTopic,
    isLoading,
    error
  };
};
