import type { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';
import { Button } from 'react-aria-components';
import { Panel } from 'react-resizable-panels';
import { useNavigate, useParams } from 'react-router';

import { useWorkspaceLoaderData } from '~/routes/organization.$organizationId.project.$projectId.workspace.$workspaceId';
import { ErrorBoundary } from '~/ui/components/error-boundary';
import { Icon } from '~/ui/components/icon';

export const scratchPadTutorialList: {
  id: string;
  title: string;
  name: string;
  desc: string;
  learnMoreLink: string;
  icon: IconName | [IconPrefix, IconName];
}[] = [
  {
    id: 'document',
    title: `Documents`,
    name: 'documents',
    desc: 'Design or test an API by adding a document.',
    learnMoreLink: 'https://developer.konghq.com/insomnia/documents/',
    icon: 'file',
  },
  {
    id: 'collection',
    title: `Collections`,
    name: 'collections',
    desc: 'Use collections to tests APIs and run automated tests.',
    learnMoreLink: 'https://developer.konghq.com/insomnia/collections/',
    icon: 'bars',
  },
  {
    id: 'mcp',
    title: `MCP Clients`,
    name: 'MCP clients',
    desc: 'Use MCP clients to connect external Model Context Protocol (MCP) Servers to access AI-ready tools, prompts, and resource.',
    learnMoreLink: 'https://developer.konghq.com/insomnia/mcp-clients-in-insomnia/',
    icon: ['fac', 'mcp'] as unknown as [IconPrefix, IconName],
  },
  {
    id: 'mock-server',
    title: `Mocks`,
    name: 'mock servers',
    desc: 'Use mock servers to simulate API endpoints without a live backend.',
    learnMoreLink: 'https://developer.konghq.com/insomnia/mock-servers/',
    icon: 'server',
  },
  {
    id: 'environment',
    title: `Environments`,
    name: 'environments',
    desc: 'Use environments to manage shared values like base URLs, API keys, and tokens across requests.',
    learnMoreLink: 'https://developer.konghq.com/insomnia/environments/',
    icon: 'code',
  },
];

const TutorialContent = ({ panel }: { panel?: string }) => {
  const selectedTutorial = scratchPadTutorialList.find(t => t.id === panel);
  const navigate = useNavigate();
  const workspaceData = useWorkspaceLoaderData();

  const { organizationId, projectId, workspaceId } = useParams<{
    organizationId: string;
    projectId: string;
    workspaceId: string;
  }>();

  const handleCreate = () => {
    if (panel === 'environment') {
      navigate(
        `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/environment`,
      );
      return;
    }

    if (panel === 'document' || panel === 'collection' || panel === 'mcp' || panel === 'mock-server') {
      navigate(`/organization/${organizationId}/project/${projectId}/workspace/new`);
    }
  };

  if (!selectedTutorial) {
    return null;
  }

  const hasEnvironments = (workspaceData?.subEnvironments.length || 0) > 0;
  const isEnvironmentPanel = panel === 'environment';

  if (isEnvironmentPanel && hasEnvironments) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="mb-4 text-2xl font-bold text-(--color-font)">{selectedTutorial.title}</h1>
          <p className="mb-8 text-(--hl)">
            You have {workspaceData?.subEnvironments.length} environment{workspaceData?.subEnvironments.length === 1 ? '' : 's'} in this workspace.
            Use them to manage shared values like base URLs, API keys, and tokens across requests.
          </p>

          <div className="mb-8 space-y-4">
            <Button
              onPress={handleCreate}
              className="rounded-md bg-(--color-surprise) px-6 py-2 text-white transition-colors"
            >
              Manage environments
            </Button>
          </div>
        </div>

        <div className="radius-full mt-8 rounded-full border border-solid border-(--hl) px-6 py-2 text-(--hl)">
          <Icon icon="book-open" className="mr-2 h-4 w-4" />
          Learn more about{' '}
          <Button
            onPress={() => window.main.openInBrowser(selectedTutorial.learnMoreLink)}
            className="inline-flex items-center gap-2 text-sm text-(--color-font-secondary) underline transition-colors hover:text-(--color-font)"
          >
            {selectedTutorial.name}
            <Icon icon="external-link" className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="mb-4 text-2xl font-bold text-(--color-font)">{selectedTutorial.title}</h1>
        <p className="mb-8 text-(--hl)">{selectedTutorial.desc}</p>

        <div className="mb-8 space-y-4">
          <Button
            onPress={handleCreate}
            className="rounded-md bg-(--color-surprise) px-6 py-2 text-white transition-colors"
          >
            Create {selectedTutorial.name}
          </Button>
        </div>
      </div>

      <div className="radius-full mt-8 rounded-full border border-solid border-(--hl) px-6 py-2 text-(--hl)">
        <Icon icon="book-open" className="mr-2 h-4 w-4" />
        Learn more about{' '}
        <Button
          onPress={() => window.main.openInBrowser(selectedTutorial.learnMoreLink)}
          className="inline-flex items-center gap-2 text-sm text-(--color-font-secondary) underline transition-colors hover:text-(--color-font)"
        >
          {selectedTutorial.name}
          <Icon icon="external-link" className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const Tutorial = () => {
  const { panel } = useParams() as { panel?: string };

  return (
    <Panel className="pane-one theme--pane" minSize={35} maxSize={90}>
      <ErrorBoundary showAlert>
        <TutorialContent panel={panel} />
      </ErrorBoundary>
    </Panel>
  );
};

export default Tutorial;
