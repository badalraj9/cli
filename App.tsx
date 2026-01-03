import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Terminal } from './components/Terminal';
import { ConnectionState, FileContext } from './types';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    provider: 'GEMINI',
    model: 'gemini-3-flash-preview',
    status: 'CONNECTED'
  });

  const [files, setFiles] = useState<FileContext[]>([]);

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearFiles = () => {
    setFiles([]);
  };

  return (
    <Layout
      connectionState={connectionState}
      files={files}
      onRemoveFile={handleRemoveFile}
      onClearFiles={handleClearFiles}
      isPreviewOpen={isPreviewOpen}
      previewContent={previewContent}
      onClosePreview={() => setIsPreviewOpen(false)}
    >
      <Terminal
        onConnectionChange={setConnectionState}
        files={files}
        setFiles={setFiles}
        setPreviewContent={setPreviewContent}
        setIsPreviewOpen={setIsPreviewOpen}
      />
    </Layout>
  );
};

export default App;
