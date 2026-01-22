import { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/lib/config';

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
        
        // Determine the backend URL
        let url = BACKEND_URL;
        if (!url || url === '') {
          // Fallback: use current host with same port as running on
          url = `${window.location.protocol}//${window.location.hostname}:8082`;
        }
        
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
            errorMsg = 'No response from server - check if backend is running on port 8082';
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

  return {
    availableTopics,
    addTopic,
    isLoading,
    error
  };
};
