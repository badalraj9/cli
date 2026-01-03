import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Terminal } from './components/Terminal';
import { ConnectionState, FileContext, Mode } from './types';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    provider: 'GEMINI',
    model: 'gemini-3-flash-preview',
    status: 'CONNECTED'
  });

  const [isLensOpen, setIsLensOpen] = useState(false);
  const [activeContext, setActiveContext] = useState<FileContext | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>('chat');
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  return (
    <Layout 
      connectionState={connectionState}
      isLensOpen={isLensOpen}
      activeContext={activeContext}
      activeMode={activeMode}
      onLensClose={() => setIsLensOpen(false)}
      previewContent={previewContent}
      onPreviewClose={() => setPreviewContent(null)}
    >
      <Terminal 
        onConnectionChange={setConnectionState}
        onLensToggle={setIsLensOpen}
        onContextChange={setActiveContext}
        isLensOpen={isLensOpen}
        activeContext={activeContext}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        onPreviewUpdate={setPreviewContent}
      />
    </Layout>
  );
};

export default App;