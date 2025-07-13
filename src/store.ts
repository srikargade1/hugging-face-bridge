import {
  AiSliceConfig,
  AiSliceState,
  createAiSlice,
  createDefaultAiConfig,
  getDefaultInstructions,
} from '@sqlrooms/ai';
import { DataTable } from '@sqlrooms/duckdb';
import {
  BaseRoomConfig,
  createRoomShellSlice,
  createRoomStore,
  LayoutTypes,
  MAIN_VIEW,
  RoomShellSliceState,
  StateCreator,
} from '@sqlrooms/room-shell';
import {
  createDefaultSqlEditorConfig,
  createSqlEditorSlice,
  SqlEditorSliceState,
  SqlEditorSliceConfig
} from '@sqlrooms/sql-editor';
import { createVegaChartTool } from '@sqlrooms/vega';
import { DatabaseIcon } from 'lucide-react';
import { z } from 'zod';
import { persist } from 'zustand/middleware';
import { DataSourcesPanel } from './components/DataSourcesPanel';
import EchoToolResult from './components/EchoToolResult';
import { MainView } from './components/MainView';
import exampleSessions from './example-sessions.json';
import { DEFAULT_MODEL } from './models';

export const RoomPanelTypes = z.enum([
  'room-details',
  'data-sources',
  'view-configuration',
  MAIN_VIEW,
] as const);
export type RoomPanelTypes = z.infer<typeof RoomPanelTypes>;

export const RoomConfig =
  BaseRoomConfig.merge(AiSliceConfig).merge(SqlEditorSliceConfig);
export type RoomConfig = z.infer<typeof RoomConfig>;

type CustomRoomState = {
  selectedModel: {
    model: string;
    provider: string;
  };
  setSelectedModel: (model: string, provider: string) => void;
};

export type RoomState = RoomShellSliceState<RoomConfig> &
  AiSliceState &
  SqlEditorSliceState &
  CustomRoomState;

export const { roomStore, useRoomStore } = createRoomStore<RoomConfig, RoomState>(
  persist(
    (set, get, store) => ({
      // Base room shell config
      ...createRoomShellSlice<RoomConfig>({
        config: {
          layout: {
            type: LayoutTypes.enum.mosaic,
            nodes: {
              direction: 'row',
              first: RoomPanelTypes.enum['data-sources'],
              second: MAIN_VIEW,
              splitPercentage: 30,
            },
          },
          dataSources: [
            {
              tableName: 'earthquakes',
              type: 'url',
              url: 'https://raw.githubusercontent.com/keplergl/kepler.gl-data/refs/heads/master/earthquakes/data.csv',
            },
          ],
          ...createDefaultAiConfig(
            AiSliceConfig.shape.ai.parse(exampleSessions),
          ),
          ...createDefaultSqlEditorConfig(),
        },
        room: {
          panels: {
            [RoomPanelTypes.enum['data-sources']]: {
              title: 'Data Sources',
              icon: DatabaseIcon,
              component: DataSourcesPanel,
              placement: 'sidebar',
            },
            main: {
              title: 'Main view',
              icon: () => null,
              component: MainView,
              placement: 'main',
            },
          },
        },
      })(set, get, store),

      // SQL editor slice
      ...createSqlEditorSlice()(set, get, store),

      // AI slice with local-only config
      ...createAiSlice({
        getApiKey: () => '', // Local models don't need API keys
        customTools: {
          chart: createVegaChartTool(),
          echo: {
            description: 'A simple echo tool that returns the input text',
            parameters: z.object({
              text: z.string().describe('The text to echo back'),
            }),
            execute: async ({ text }: { text: string }) => {
              return {
                llmResult: {
                  success: true,
                  details: `Echo: ${text}`,
                },
              };
            },
            component: EchoToolResult,
          },
        },
        getInstructions: (tablesSchema: DataTable[]) => {
          const defaultInstructions = getDefaultInstructions(tablesSchema);
          return `${defaultInstructions}. Please be polite and concise.`;
        },
      })(set, get, store),

      // Local model selection (no API)
      selectedModel: {
        model: DEFAULT_MODEL,
        provider: 'ollama',
      },
      setSelectedModel: (model: string, provider: string) => {
        set({ selectedModel: { model, provider } });
      },
    }),
    {
      name: 'ai-example-app-state-storage',
      partialize: (state) => ({
        config: RoomConfig.parse(state.config),
        selectedModel: state.selectedModel,
      }),
    },
  ) as StateCreator<RoomState>,
);
