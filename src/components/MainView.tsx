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


  const isDataAvailable = useRoomStore((state) => state.room.initialized);

  const modelOptions = [
    { provider: 'ollama', label: 'mistral', value: 'mistral' },
    { provider: 'ollama', label: 'llama3', value: 'llama3' },
    { provider: 'ollama', label: 'phi3', value: 'phi3' },
    { provider: 'ollama', label: 'command-r-plus', value: 'command-r-plus' },
    { provider: 'ollama', label: 'deepseek-r1', value: 'deepseek-r1' },
    { provider: 'ollama', label: 'deepseek-r1-distill-qwen', value: 'deepseek-r1-distill-qwen' },
    { provider: 'ollama', label: 'deepseek-r1-distill-qwen-32b', value: 'deepseek-r1-distill-qwen-32b' },
    { provider: 'ollama', label: 'deepseek-r1-distill-qwen-32b-instruct', value: 'deepseek-r1-distill-qwen-32b-instruct' },
    { provider: 'ollama', label: 'deepseek-r1-distill-qwen-32b-instruct', value: 'deepseek-r1-distill-qwen-32b-instruct' },
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
