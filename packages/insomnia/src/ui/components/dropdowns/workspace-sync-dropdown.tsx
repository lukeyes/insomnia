import React, { type FC } from 'react';

import { isLoggedIn } from '~/account/session';

import { isGitProject, isRemoteProject } from '../../../models/project';
import { useWorkspaceLoaderData } from '../../../routes/organization.$organizationId.project.$projectId.workspace.$workspaceId';
import { useOrganizationPermissions } from '../../hooks/use-organization-features';
import { GitProjectSyncDropdown } from './git-project-sync-dropdown';
import { GitSyncDropdown } from './git-sync-dropdown';
import { LocalProjectBar } from './local-project-bar';
import { SyncDropdown } from './sync-dropdown';

export const WorkspaceSyncDropdown: FC = () => {
  const { activeProject, activeWorkspace, gitRepository, activeWorkspaceMeta } = useWorkspaceLoaderData()!;

  const { features } = useOrganizationPermissions();

  const [loggedIn, setLoggedIn] = React.useState(false);

  React.useEffect(() => {
    isLoggedIn().then(setLoggedIn);
  }, []);

  if (!loggedIn) {
    return <LocalProjectBar />;
  }

  const isLocalProject =
    !isRemoteProject(activeProject) && !activeWorkspaceMeta?.gitRepositoryId && !isGitProject(activeProject);

  if (isLocalProject) {
    return <LocalProjectBar />;
  }

  const shouldShowCloudSyncDropdown = isRemoteProject(activeProject) && !activeWorkspaceMeta?.gitRepositoryId;

  if (shouldShowCloudSyncDropdown) {
    return <SyncDropdown key={activeWorkspace?._id} workspace={activeWorkspace} project={activeProject} />;
  }

  const shouldShowGitSyncDropdown =
    features.gitSync.enabled && (activeWorkspaceMeta?.gitRepositoryId || !isRemoteProject(activeProject));
  if (shouldShowGitSyncDropdown) {
    if (isGitProject(activeProject)) {
      return (
        <GitProjectSyncDropdown key={gitRepository?._id} gitRepository={gitRepository} activeProject={activeProject} />
      );
    }

    if (gitRepository) {
      return (
        <GitSyncDropdown
          key={gitRepository?._id}
          isInsomniaSyncEnabled={isRemoteProject(activeProject)}
          gitRepository={gitRepository}
          showDeprecatedWarning={!isGitProject(activeProject)}
        />
      );
    }
  }

  return null;
};
