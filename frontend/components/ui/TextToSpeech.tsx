'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';

type Props = {
  text: string;
  className?: string;
};

type PlaybackState = 'ready' | 'playing' | 'paused';
let activeSpeechId = 0;

function speechChunks(source: string) {
  const text = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/[*_~`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const chunks: string[] = [];
  let chunk = '';
  for (const word of text.split(' ')) {
    if (chunk && chunk.length + word.length + 1 > 1600) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk = chunk ? `${chunk} ${word}` : word;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export default function TextToSpeech({ text, className = '' }: Props) {
  const [state, setState] = useState<PlaybackState>('ready');
  const speechId = useRef(0);
  const chunks = speechChunks(text);

  useEffect(() => {
    const handleSpeechStarted = (event: Event) => {
      if (speechId.current && (event as CustomEvent<number>).detail !== speechId.current) {
        speechId.current = 0;
        setState('ready');
      }
    };
    window.addEventListener('medprep-speech-started', handleSpeechStarted);
    return () => window.removeEventListener('medprep-speech-started', handleSpeechStarted);
  }, []);

  useEffect(() => () => {
    if (speechId.current && speechId.current === activeSpeechId && 'speechSynthesis' in window) {
      activeSpeechId += 1;
      window.speechSynthesis.cancel();
    }
  }, []);

  const start = () => {
    if (!('speechSynthesis' in window) || !chunks.length) return;
    window.speechSynthesis.cancel();
    const id = ++activeSpeechId;
    speechId.current = id;
    setState('playing');
    window.dispatchEvent(new CustomEvent('medprep-speech-started', { detail: id }));

    const speakChunk = (index: number) => {
      if (id !== activeSpeechId) return;
      if (index >= chunks.length) {
        speechId.current = 0;
        setState('ready');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      const voice = window.speechSynthesis.getVoices().find(item => /^en([-_]|$)/i.test(item.lang));
      if (voice) utterance.voice = voice;
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = () => {
        if (id === activeSpeechId) {
          speechId.current = 0;
          setState('ready');
        }
      };
      window.speechSynthesis.speak(utterance);
    };

    speakChunk(0);
  };

  const togglePlayback = () => {
    if (!('speechSynthesis' in window)) return;
    if (state === 'playing' && speechId.current === activeSpeechId) {
      window.speechSynthesis.pause();
      setState('paused');
    } else if (state === 'paused' && speechId.current === activeSpeechId) {
      window.speechSynthesis.resume();
      setState('playing');
    } else {
      start();
    }
  };

  const stop = () => {
    if ('speechSynthesis' in window && speechId.current === activeSpeechId) {
      activeSpeechId += 1;
      window.speechSynthesis.cancel();
    }
    speechId.current = 0;
    setState('ready');
  };

  if (!chunks.length) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={togglePlayback}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border2 bg-surface px-3 text-[13px] font-medium text-text2 transition-colors hover:border-accent hover:text-accent"
        aria-label={state === 'playing' ? 'Pause audio' : state === 'paused' ? 'Resume audio' : 'Read aloud'}
        title={state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : 'Read aloud'}
      >
        {state === 'playing' ? <Pause size={15} /> : state === 'paused' ? <Play size={15} /> : <Volume2 size={15} />}
        {state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : 'Listen'}
      </button>
      {state !== 'ready' && (
        <button
          type="button"
          onClick={stop}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border2 bg-surface text-text2 transition-colors hover:border-red hover:text-red"
          aria-label="Stop audio"
          title="Stop"
        >
          <Square size={13} />
        </button>
      )}
    </span>
  );
}
