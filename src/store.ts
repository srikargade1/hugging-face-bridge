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
  SqlEditorSliceConfig,
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
import { queryOllama } from './utils/ModelConnector';

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

      ...createSqlEditorSlice()(set, get, store),

      ...createAiSlice({
        // No API key needed for Ollama
        getApiKey: () => '',

        // Local-only provider

        customTools: {
          chart: createVegaChartTool(),

          echo: {
            description: 'A simple echo tool that returns the input text',
            parameters: z.object({
              text: z.string().describe('The text to echo back'),
            }),
            execute: async ({ text }) => {
              return {
                llmResult: {
                  success: true,
                  details: `Echo: ${text}`,
                },
              };
            },
            component: EchoToolResult,
          },

          ollama_runner: {
            description: 'Use a local LLM via Ollama to generate a response',
            parameters: z.object({
              prompt: z.string().describe('The user prompt to send to the local model'),
            }),
            execute: async (
              { prompt }: { prompt: string },
              options: { model?: string; context?: unknown } = {},
            ) => {
              try {
                const state = get();
                const model = options.model || state.selectedModel.model || DEFAULT_MODEL;
                const response = await queryOllama(model, prompt);
                return {
                  llmResult: {
                    success: true,
                    details: response,
                  },
                };
              } catch (err: any) {
                return {
                  llmResult: {
                    success: false,
                    error: `Ollama call failed: ${err.message}`,
                  },
                };
              }
            },
          },
        },

        getInstructions: (tablesSchema: DataTable[]) => {
          const defaultInstructions = getDefaultInstructions(tablesSchema);
          return `${defaultInstructions}
You can run SQL queries using the query_executor tool. You are powered by a local Ollama model.`;
        },
      })(set, get, store),

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
