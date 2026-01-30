import yaml from 'js-yaml';
import { useEffect, useRef } from 'react';

import { database as db } from '../../common/database';
import * as models from '../../models';
import type { Environment } from '../../models/environment';

export const useEnvironmentFileSync = () => {
  const isUpdatingRef = useRef(new Set<string>());

  useEffect(() => {
    const syncFileToDb = async (filePath: string) => {
      if (isUpdatingRef.current.has(filePath)) {
        return;
      }

      try {
        const environments = await models.environment.all();
        const environment = environments.find(e => e.syncFilePath === filePath);
        if (!environment) {
          return;
        }

        const { content } = await window.main.insecureReadFileWithEncoding({ path: filePath });
        if (!content) {
          return;
        }

        let data: Record<string, any>;
        try {
          data = (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) ? (yaml.load(content) as Record<string, any>) : JSON.parse(content);
        } catch (e) {
          console.error('Failed to parse environment file', filePath, e);
          return;
        }

        if (JSON.stringify(data) !== JSON.stringify(environment.data)) {
          isUpdatingRef.current.add(filePath);
          await models.environment.update(environment, { data });
          setTimeout(() => isUpdatingRef.current.delete(filePath), 1000);
        }
      } catch (err) {
        console.error('Failed to sync file to DB', filePath, err);
      }
    };

    const syncDbToFile = async (environment: Environment) => {
      const filePath = environment.syncFilePath;
      if (!filePath || isUpdatingRef.current.has(filePath)) {
        return;
      }

      try {
        const content = (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) ? yaml.dump(environment.data) : JSON.stringify(environment.data, null, 2);

        isUpdatingRef.current.add(filePath);
        await window.main.writeFile({ path: filePath, content });
        setTimeout(() => isUpdatingRef.current.delete(filePath), 1000);
      } catch (err) {
        console.error('Failed to sync DB to file', filePath, err);
      }
    };

    const handleFileChange = (_: any, filePath: string) => {
      syncFileToDb(filePath);
    };

    const stopWatching = window.main.onEnvironmentSyncFileChange(handleFileChange);

    const initWatchers = async () => {
      const environments = await models.environment.all();
      for (const env of environments) {
        if (env.syncFilePath) {
          window.main.watchFile({ path: env.syncFilePath });
        }
      }
    };

    initWatchers();

    const onChange = async (changes: any[][]) => {
      for (const change of changes) {
        const [type, doc, isRemote] = change;
        if (isRemote) continue;
        if (doc.type === models.environment.type && type === 'update') {
          const env = doc as Environment;
          if (env.syncFilePath) {
            syncDbToFile(env);
            window.main.watchFile({ path: env.syncFilePath });
          }
        }
      }
    };

    db.onChange(onChange);

    return () => {
      stopWatching();
      db.offChange(onChange);
    };
  }, []);
};
