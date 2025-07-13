import { SkeletonPane } from '@sqlrooms/ui';
import {
  AnalysisResultsContainer,
  SessionControls,
  QueryControls,
  ModelSelector,
} from '@sqlrooms/ai';
import { useRoomStore } from '../store';

export const MainView: React.FC = () => {
  const currentSessionId = useRoomStore((s) => s.config.ai.currentSessionId);
  const currentSession = useRoomStore((s) => {
    const sessions = s.config.ai.sessions;
    return sessions.find((session) => session.id === currentSessionId);
  });

  const isDataAvailable = useRoomStore((state) => state.room.initialized);

  const modelOptions = [
    { provider: 'ollama', label: 'mistral', value: 'mistral' },
    { provider: 'ollama', label: 'llama3', value: 'llama3' },
    { provider: 'ollama', label: 'phi3', value: 'phi3' },
  ];

  return (
    <div className="flex h-full w-full flex-col gap-0 overflow-hidden p-4">
      <div className="mb-4">
        <SessionControls />
      </div>

      <div className="flex-grow overflow-auto">
        {isDataAvailable ? (
          <AnalysisResultsContainer key={currentSessionId} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <SkeletonPane className="p-4" />
            <p className="text-muted-foreground mt-4">Loading database...</p>
          </div>
        )}
      </div>

      <QueryControls placeholder="Type here what would you like to learn about the data? Something like 'What is the max magnitude of the earthquakes by year?'">
        <div className="flex items-center justify-end gap-2">
          <ModelSelector models={modelOptions} className="w-[200px]" />
        </div>
      </QueryControls>
    </div>
  );
};
