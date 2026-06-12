// src/components/shared/orgchatbot/DraggableChatbotWrapper.js
import React, { useRef, useEffect, useState, useCallback } from 'react';

const DraggableChatbotWrapper = ({
  position,
  size,
  onDragStop,
  onResizeStop,
  children
}) => {
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const dragStartRef = useRef(null);
  const resizeStartRef = useRef(null);
  
  // Scroll detection and transparency state
  const [isBackgroundScrolling, setIsBackgroundScrolling] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const isScrollingBackgroundRef = useRef(false);

  // Calculate initial position (relative to viewport - fixed positioning)
  const getInitialPosition = () => {
    if (position) {
      return position;
    }
    
    // Default: bottom-right of viewport (fixed positioning)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const widgetWidth = size.width || 320;
    const widgetHeight = size.height || 653;
    
    const defaultX = viewportWidth - widgetWidth - 24;
    const defaultY = viewportHeight - widgetHeight - 24;
    
    return { 
      x: Math.max(0, defaultX), 
      y: Math.max(0, defaultY) 
    };
  };

  const [currentPosition, setCurrentPosition] = useState(getInitialPosition);
  const [currentSize, setCurrentSize] = useState(size);

  // Update position when prop changes (saved position loaded)
  useEffect(() => {
    if (position) {
      setCurrentPosition(position);
    }
  }, [position]);

  // Update size when prop changes
  useEffect(() => {
    if (size) {
      setCurrentSize(size);
    }
  }, [size]);

  // Handle drag start (fixed positioning - no scroll offset needed)
  const handleDragStart = useCallback((e) => {
    // Only drag from header
    if (!e.target.closest('.chatbot-header-drag-handle')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top
    };
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }, []);

  // Handle drag move (fixed positioning - constrain to viewport)
  const handleDragMove = useCallback((e) => {
    if (!isDragging || !dragStartRef.current) return;
    
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    
    const newX = dragStartRef.current.startLeft + deltaX;
    const newY = dragStartRef.current.startTop + deltaY;
    
    // Constrain to viewport bounds (fixed positioning)
    const maxX = window.innerWidth - currentSize.width;
    const maxY = window.innerHeight - currentSize.height;
    
    setCurrentPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY))
    });
  }, [isDragging, currentSize.width, currentSize.height]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    if (dragStartRef.current && onDragStop) {
      onDragStop(null, { x: currentPosition.x, y: currentPosition.y });
    }
    
    dragStartRef.current = null;
  }, [isDragging, currentPosition, onDragStop]);

  // Handle resize start (fixed positioning)
  const handleResizeStart = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startLeft: rect.left,
      startTop: rect.top
    };
    
    document.body.style.userSelect = 'none';
  }, []);

  const parseResizeAxes = (direction) => {
    const value = String(direction ?? '').toLowerCase();
    return {
      horizontal: value.includes('left') ? 'left' : value.includes('right') ? 'right' : null,
      vertical: value.includes('top') ? 'top' : value.includes('bottom') ? 'bottom' : null,
    };
  };

  // Handle resize move
  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizeStartRef.current || !resizeDirection) return;
    
    const deltaX = e.clientX - resizeStartRef.current.startX;
    const deltaY = e.clientY - resizeStartRef.current.startY;
    
    let newWidth = resizeStartRef.current.startWidth;
    let newHeight = resizeStartRef.current.startHeight;
    let newX = resizeStartRef.current.startLeft;
    let newY = resizeStartRef.current.startTop;
    
    const { horizontal, vertical } = parseResizeAxes(resizeDirection);
    const isRight = horizontal === 'right';
    const isLeft = horizontal === 'left';
    const isBottom = vertical === 'bottom';
    const isTop = vertical === 'top';
    
    // Update width
    if (isRight) {
      newWidth = resizeStartRef.current.startWidth + deltaX;
    } else if (isLeft) {
      newWidth = resizeStartRef.current.startWidth - deltaX;
      newX = resizeStartRef.current.startLeft + deltaX;
    }
    
    // Update height
    if (isBottom) {
      newHeight = resizeStartRef.current.startHeight + deltaY;
    } else if (isTop) {
      newHeight = resizeStartRef.current.startHeight - deltaY;
      newY = resizeStartRef.current.startTop + deltaY;
    }
    
    // Apply constraints
    const minWidth = 280;
    const minHeight = 400;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    
    // Adjust position if resizing from left/top
    if (isLeft) {
      if (newWidth < minWidth) {
        newX = resizeStartRef.current.startLeft + (resizeStartRef.current.startWidth - minWidth);
        newWidth = minWidth;
      } else if (newWidth > maxWidth) {
        newX = resizeStartRef.current.startLeft + (resizeStartRef.current.startWidth - maxWidth);
        newWidth = maxWidth;
      }
    }
    
    if (isTop) {
      if (newHeight < minHeight) {
        newY = resizeStartRef.current.startTop + (resizeStartRef.current.startHeight - minHeight);
        newHeight = minHeight;
      } else if (newHeight > maxHeight) {
        newY = resizeStartRef.current.startTop + (resizeStartRef.current.startHeight - maxHeight);
        newHeight = maxHeight;
      }
    }
    
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    
    setCurrentSize({ width: newWidth, height: newHeight });
    setCurrentPosition({ x: newX, y: newY });
  }, [isResizing, resizeDirection]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    if (!isResizing) return;
    
    setIsResizing(false);
    setResizeDirection(null);
    document.body.style.userSelect = '';
    
    if (resizeStartRef.current && onResizeStop) {
      onResizeStop(null, resizeDirection, { style: { width: `${currentSize.width}px`, height: `${currentSize.height}px` } }, {}, currentPosition);
    }
    
    resizeStartRef.current = null;
  }, [isResizing, resizeDirection, currentSize, currentPosition, onResizeStop]);

  // Global event listeners for drag/resize
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const keepWidgetOpaque = useCallback(() => {
    setIsActive(true);
    setIsBackgroundScrolling(false);
    isScrollingBackgroundRef.current = false;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  const markBackgroundScrolling = useCallback(() => {
    isScrollingBackgroundRef.current = true;
    setIsBackgroundScrolling(true);
    setIsActive(false);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsBackgroundScrolling(false);
      setIsActive(true);
      isScrollingBackgroundRef.current = false;
    }, 300);
  }, []);

  // Fade only when the page scrolls — never when the wheel originates inside the chat panel
  const handleWheel = useCallback(
    (e) => {
      const widget = widgetRef.current;
      if (!widget) return;

      if (widget.contains(e.target)) {
        keepWidgetOpaque();

        const messagesContainer = widget.querySelector('.scc-chat-panel__messages');
        if (!messagesContainer) return;

        const canScrollUp = messagesContainer.scrollTop > 0;
        const canScrollDown =
          messagesContainer.scrollTop <
          messagesContainer.scrollHeight - messagesContainer.clientHeight - 1;
        const scrollingUp = e.deltaY < 0;
        const scrollingDown = e.deltaY > 0;

        if ((scrollingUp && canScrollUp) || (scrollingDown && canScrollDown)) {
          e.stopPropagation();
        }
        return;
      }

      markBackgroundScrolling();
    },
    [keepWidgetOpaque, markBackgroundScrolling],
  );

  // Handle click/mouseenter to bring chatbot to front
  const handleActivate = useCallback(() => {
    keepWidgetOpaque();
  }, [keepWidgetOpaque]);

  // Add scroll and interaction listeners
  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;

    // Listen for wheel events on the widget
    widget.addEventListener('wheel', handleWheel, { passive: false });
    
    // Listen for clicks and mouseenter to activate
    widget.addEventListener('click', handleActivate);
    widget.addEventListener('mouseenter', handleActivate);
    
    const messagesContainer = widget.querySelector('.scc-chat-panel__messages');
    const handleMessagesScroll = () => {
      keepWidgetOpaque();
    };

    messagesContainer?.addEventListener('scroll', handleMessagesScroll, { passive: true });

    // Document listener catches page scroll when the wheel event is outside the widget
    const handleDocumentWheel = (e) => {
      if (!widget.contains(e.target)) {
        markBackgroundScrolling();
      }
    };

    document.addEventListener('wheel', handleDocumentWheel, { passive: true });
    
    return () => {
      widget.removeEventListener('wheel', handleWheel);
      widget.removeEventListener('click', handleActivate);
      widget.removeEventListener('mouseenter', handleActivate);
      document.removeEventListener('wheel', handleDocumentWheel);
      messagesContainer?.removeEventListener('scroll', handleMessagesScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleWheel, handleActivate, keepWidgetOpaque, markBackgroundScrolling]);

  const resizeHandleStyle = {
    backgroundColor: 'transparent',
  };
  
  // Corner handle size (larger for easier grabbing)
  const cornerHandleSize = 16;
  // Edge handle size
  const edgeHandleSize = 8;

  // Calculate opacity and z-index based on scroll state
  const opacity = isBackgroundScrolling ? 0.3 : 1;
  const zIndex = isActive ? 10000 : 9999;
  const transition = isBackgroundScrolling ? 'opacity 0.2s ease-out' : 'opacity 0.3s ease-in, z-index 0s';

  return (
    <div
      ref={widgetRef}
      className="scc-panel-shell scc-panel-shell--floating"
      style={{
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        width: `${currentSize.width}px`,
        height: `${currentSize.height}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        opacity: opacity,
        zIndex: zIndex,
        transition: transition,
      }}
      onMouseDown={handleDragStart}
    >
        {children}
      
      {/* Resize handles - Corners (larger, higher z-index) */}
      <div
        className="scc-resize-handle scc-resize-handle--nw"
        style={{
          ...resizeHandleStyle,
          zIndex: 25,
          width: `${cornerHandleSize}px`,
          height: `${cornerHandleSize}px`,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'top-left');
        }}
      />
      <div
        className="scc-resize-handle scc-resize-handle--ne"
        style={{
          ...resizeHandleStyle,
          zIndex: 25,
          width: `${cornerHandleSize}px`,
          height: `${cornerHandleSize}px`,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'top-right');
        }}
      />
      <div
        className="scc-resize-handle scc-resize-handle--sw"
        style={{
          ...resizeHandleStyle,
          zIndex: 25,
          width: `${cornerHandleSize}px`,
          height: `${cornerHandleSize}px`,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'bottom-left');
        }}
      />
      <div
        className="scc-resize-handle scc-resize-handle--se"
        style={{
          ...resizeHandleStyle,
          zIndex: 25,
          width: `${cornerHandleSize}px`,
          height: `${cornerHandleSize}px`,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'bottom-right');
        }}
      />
      {/* Edge handles (smaller, lower z-index so corners take priority) */}
      <div
        className="scc-resize-handle scc-resize-handle--n"
        style={{
          ...resizeHandleStyle,
          height: `${edgeHandleSize}px`,
          left: `${cornerHandleSize}px`,
          right: `${cornerHandleSize}px`,
          zIndex: 15
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'top');
        }}
      />
      <div
        className="scc-resize-handle scc-resize-handle--s"
        style={{
          ...resizeHandleStyle,
          height: `${edgeHandleSize}px`,
          left: `${cornerHandleSize}px`,
          right: `${cornerHandleSize}px`,
          zIndex: 15
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'bottom');
        }}
      />
      <div
        className="scc-resize-handle scc-resize-handle--w"
        style={{
          ...resizeHandleStyle,
          width: `${edgeHandleSize}px`,
          top: `${cornerHandleSize}px`,
          bottom: `${cornerHandleSize}px`,
          zIndex: 15
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'left');
        }}
      />
      <div
        className="scc-resize-handle scc-resize-handle--e"
        style={{
          ...resizeHandleStyle,
          width: `${edgeHandleSize}px`,
          top: `${cornerHandleSize}px`,
          bottom: `${cornerHandleSize}px`,
          zIndex: 15
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResizeStart(e, 'right');
        }}
      />
      </div>
  );
};

export default DraggableChatbotWrapper;
