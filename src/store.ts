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
  BaseRoomConfig.merge(AiSliceConfig);
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
        getApiKey: () => '',

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

          query_executor: {
            description: 'Run a SQL query and return the result',
            parameters: z.object({
              sql: z.string().describe('The SQL query to run'),
            }),
            execute: async (
              { sql }: { sql: string },
              options: any
            ) => {
              const connector = options?.connector;
              if (!connector) {
                return {
                  llmResult: {
                    success: false,
                    error: 'No database connector found.',
                  },
                };
              }

              try {
                const result = await connector.queryJson(sql);
                return {
                  llmResult: {
                    success: true,
                    details: JSON.stringify(result, null, 2),
                  },
                };
              } catch (err: any) {
                return {
                  llmResult: {
                    success: false,
                    error: `Query failed: ${err.message}`,
                  },
                };
              }
            },
          },
        },

        getInstructions: (tablesSchema: DataTable[]) => {
          const defaultInstructions = getDefaultInstructions(tablesSchema);
          return `${defaultInstructions}
You can run SQL queries using the query_executor tool. 
If the user asks a question that requires querying data, generate the SQL, execute it, and summarize the result.`;
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
