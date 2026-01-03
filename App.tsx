import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Terminal } from './components/Terminal';
import { ConnectionState } from './types';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    provider: 'GEMINI',
    model: 'gemini-3-flash-preview',
    status: 'CONNECTED'
  });

  return (
    <Layout connectionState={connectionState}>
      <Terminal onConnectionChange={setConnectionState} />
    </Layout>
  );
};

export default App;
