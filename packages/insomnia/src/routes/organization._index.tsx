import { href, redirect } from 'react-router';

import { SCRATCHPAD_ORGANIZATION_ID } from '~/models/organization';
import { SCRATCHPAD_PROJECT_ID } from '~/models/project';
import { SCRATCHPAD_WORKSPACE_ID } from '~/models/workspace';

import type { Route } from './+types/organization._index';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return redirect(href('/organization/:organizationId/project/:projectId/workspace/:workspaceId/debug', {
    organizationId: SCRATCHPAD_ORGANIZATION_ID,
    projectId: SCRATCHPAD_PROJECT_ID,
    workspaceId: SCRATCHPAD_WORKSPACE_ID,
  }));
}
