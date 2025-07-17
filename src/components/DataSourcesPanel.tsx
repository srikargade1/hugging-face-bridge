import { useState } from 'react';
import { RoomPanel } from '@sqlrooms/room-shell';
import { TableStructurePanel } from '@sqlrooms/sql-editor';
import { FileDropzone } from '@sqlrooms/dropzone';
import { useRoomStore, RoomPanelTypes } from '../store';
import { convertToValidColumnOrTableName } from '@sqlrooms/utils';
import { useToast, Button, Input } from '@sqlrooms/ui';

export const DataSourcesPanel = () => {
  const connector = useRoomStore((state) => state.db.connector);
  const refreshTableSchemas = useRoomStore((state) => state.db.refreshTableSchemas);
  const { toast } = useToast();

  const [hfId, setHfId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleHuggingFaceLoad = async () => {
    setLoading(true);
    try {
      const apiUrl = `https://huggingface.co/api/datasets/${hfId}/revision/main`;
      const apiResp = await fetch(apiUrl);
      const apiJson = await apiResp.json();

      const supportedFile = apiJson.siblings.find((f: any) =>
        ['.csv', '.json', '.jsonl', '.parquet', '.arrow'].some(ext =>
          f.rfilename.toLowerCase().endsWith(ext)
        )
      );

      if (!supportedFile) throw new Error('No CSV, JSON, JSONL, Parquet, or Arrow file found in dataset.');

      const fileUrl = `https://huggingface.co/datasets/${hfId}/resolve/main/${supportedFile.rfilename}`;
      const fileExt = supportedFile.rfilename.split('.').pop()?.toLowerCase() || '';
      const mimeType =
        fileExt === 'csv' ? 'text/csv' :
        fileExt === 'json' ? 'application/json' :
        fileExt === 'jsonl' ? 'application/jsonl' :
        fileExt === 'parquet' ? 'application/octet-stream' :
        fileExt === 'arrow' ? 'application/vnd.apache.arrow.file' :
        'application/octet-stream';

      const blob = await fetch(fileUrl).then((r) => r.blob());
      const file = new File([blob], supportedFile.rfilename, { type: mimeType });

      const tableName = convertToValidColumnOrTableName(file.name);
      await connector.loadFile(file, tableName);

      toast({
        variant: 'default',
        title: 'Dataset loaded',
        description: `Hugging Face dataset ${hfId} loaded as ${tableName}`,
      });
      await refreshTableSchemas();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to load Hugging Face dataset: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoomPanel type={RoomPanelTypes.enum['data-sources']}>
      <div className="mb-4">
        <label className="text-sm font-medium">Load Hugging Face Dataset</label>
        <div className="flex gap-2 mt-2">
          <Input
            value={hfId}
            onChange={(e) => setHfId(e.target.value)}
            placeholder="e.g., Anthropic/EconomicIndex"
          />
          <Button disabled={loading || !hfId} onClick={handleHuggingFaceLoad}>
            {loading ? 'Loading...' : 'Load'}
          </Button>
        </div>
      </div>

      <FileDropzone
        className="h-[200px] p-5"
        acceptedFormats={{
          'text/csv': ['.csv'],
          'text/tsv': ['.tsv'],
          'text/parquet': ['.parquet'],
          'text/json': ['.json'],
          'application/jsonl': ['.jsonl'],
          'application/vnd.apache.arrow.file': ['.arrow'],
        }}
        onDrop={async (files) => {
          for (const file of files) {
            try {
              const tableName = convertToValidColumnOrTableName(file.name);
              await connector.loadFile(file, tableName);
              toast({
                variant: 'default',
                title: 'Table created',
                description: `File ${file.name} loaded as ${tableName}`,
              });
            } catch (error) {
              toast({
                variant: 'destructive',
                title: 'Error',
                description: `Error loading file ${file.name}: ${error}`,
              });
            }
          }
          await refreshTableSchemas();
        }}
      >
        <div className="text-muted-foreground text-xs">
          Files you add will stay local to your browser.
        </div>
      </FileDropzone>

      <TableStructurePanel />
    </RoomPanel>
  );
};
