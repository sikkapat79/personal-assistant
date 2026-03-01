import React from 'react';
import { TextAttributes } from '@opentui/core';

interface ModalProps {
  title?: string;
  children: React.ReactNode;
}

export function Modal({ title, children }: ModalProps) {
  return (
    <>
      {/* Dim backdrop */}
      <box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#0a0a0a',
        }}
      />
      {/* Modal content */}
      <box
        style={{
          position: 'absolute',
          top: 2,
          left: 4,
          right: 4,
          bottom: 2,
          borderStyle: 'double',
          padding: 1,
          overflow: 'hidden',
          flexDirection: 'column',
          backgroundColor: '#111111',
        }}
      >
        {title && (
          <>
            <text style={{ attributes: TextAttributes.BOLD }}>{title}</text>
            <text> </text>
          </>
        )}
        {children}
      </box>
    </>
  );
}
