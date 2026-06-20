'use client';

import React, { useState, useEffect, useRef } from 'react';

interface LazyRenderProps {
  children: React.ReactNode;
}

export default function LazyRender({ children }: LazyRenderProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect(); // 一度表示されたら監視を終了しパフォーマンス負荷を下げる
        }
      },
      {
        rootMargin: '250px', // 画面に入る250px手前で先読み描画
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // 描画前は動画カードと同じ高さを仮確保して、スクロールバーのジャンプを防ぐ
  return (
    <div ref={containerRef} style={{ minHeight: isIntersecting ? 'auto' : '380px', width: '100%' }}>
      {isIntersecting ? children : (
        <div className="lazy-placeholder" style={{
          width: '100%',
          height: '380px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxSizing: 'border-box'
        }} />
      )}
    </div>
  );
}
