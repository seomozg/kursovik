import { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config';

export const useTopics = () => {
  const [availableTopics, setAvailableTopics] = useState([]);

  // Load available topics on mount
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/topics/`);
        const topics = response.data.map(t => t.name);
        setAvailableTopics(topics);
      } catch (error) {
        console.error('Error loading topics:', error);
      }
    };
    loadTopics();
  }, []);

  const addTopic = (topicName) => {
    setAvailableTopics(prev => {
      if (!prev.includes(topicName)) {
        return [...prev, topicName];
      }
      return prev;
    });
  };

  return {
    availableTopics,
    addTopic
  };
};
