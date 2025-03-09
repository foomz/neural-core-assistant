import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CodeBlock } from './CodeBlock';
import { parseMessage } from '../utils/messageParser';

interface TypewriterMessageProps {
  content: string;
  onComplete?: () => void;
}

export function TypewriterMessage({ content, onComplete }: TypewriterMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        // Check for code block markers
        if (content.slice(currentIndex).startsWith('```')) {
          // Find the end of the code block
          const remainingContent = content.slice(currentIndex);
          const endIndex = remainingContent.indexOf('```', 3);
          if (endIndex !== -1) {
            // Add the entire code block at once
            const codeBlock = remainingContent.slice(0, endIndex + 3);
            setDisplayedContent(prev => prev + codeBlock);
            setCurrentIndex(currentIndex + codeBlock.length);
            return;
          }
        }

        // Add multiple characters at once for faster typing
        const charsToAdd = Math.min(3, content.length - currentIndex);
        const nextChars = content.slice(currentIndex, currentIndex + charsToAdd);
        setDisplayedContent(prev => prev + nextChars);
        setCurrentIndex(currentIndex + charsToAdd);
      }, isPaused ? 0 : Math.random() * 15 + 10); // Faster random delay between 10-25ms

      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, content, isPaused, onComplete]);

  // Handle click to show full message immediately
  const handleClick = () => {
    if (currentIndex < content.length) {
      setIsPaused(true);
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  };

  // Parse and render the content
  const renderContent = () => {
    if (!displayedContent) return null;

    const parts = parseMessage(displayedContent);
    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <div key={index} className="my-4">
            <CodeBlock code={part.content} language={part.language || 'plaintext'} />
          </div>
        );
      }
      return <p key={index} className="whitespace-pre-wrap">{part.content}</p>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className="cursor-pointer"
    >
      {renderContent()}
      {!isComplete && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="inline-block w-2 h-4 bg-indigo-400 ml-1"
        />
      )}
    </motion.div>
  );
}