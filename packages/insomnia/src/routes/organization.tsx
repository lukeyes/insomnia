import { type CurrentPlan, type UserProfile } from 'insomnia-api';
import React, { useEffect, useState } from 'react';
import {
  Button,
  Link,
  ToggleButton,
  Tooltip,
  TooltipTrigger,
} from 'react-aria-components';
import { Outlet, useParams, useRouteLoaderData } from 'react-router';
import * as reactUse from 'react-use';

import { userSession } from '~/models';
import { type Organization } from '~/models/organization';
import type { Settings } from '~/models/settings';
import { useRootLoaderData } from '~/root';
import { CommandPalette } from '~/ui/components/command-palette';
import { GitHubStarsButton } from '~/ui/components/github-stars-button';
import { Hotkey } from '~/ui/components/hotkey';
import { Icon } from '~/ui/components/icon';
import { InsomniaLogo } from '~/ui/components/insomnia-icon';
import { showSettingsModal } from '~/ui/components/modals/settings-modal';
import { InsomniaEventStreamProvider } from '~/ui/context/app/insomnia-event-stream-context';
import { InsomniaTabProvider } from '~/ui/context/app/insomnia-tab-context';
import { RunnerProvider } from '~/ui/context/app/runner-context';
import { useCloseConnection } from '~/ui/hooks/use-close-connection';
import { useEnvironmentFileSync } from '~/ui/hooks/use-environment-file-sync';
import { sortOrganizations } from '~/ui/organization-utils';

import type { Route } from './+types/organization';

export interface OrganizationLoaderData {
  organizations: Organization[];
  user?: UserProfile;
  currentPlan?: CurrentPlan;
}

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const { id, accountId } = await userSession.getOrCreate();
  if (id) {
    const organizations = JSON.parse(localStorage.getItem(`${accountId}:organizations`) || '[]') as Organization[];
    const user = JSON.parse(localStorage.getItem(`${accountId}:user`) || '{}') as UserProfile;
    const currentPlan = JSON.parse(localStorage.getItem(`${accountId}:currentPlan`) || '{}') as CurrentPlan;
    return {
      organizations: sortOrganizations(accountId, organizations),
      user,
      currentPlan,
    };
  }
  return {
    organizations: [],
    user: undefined,
    currentPlan: undefined,
  };
}

export interface FeatureStatus {
  enabled: boolean;
  reason?: string;
}

export interface FeatureList {
  bulkImport: FeatureStatus;
  gitSync: FeatureStatus;
  orgBasicRbac: FeatureStatus;
  aiMockServers: FeatureStatus;
  aiCommitMessages: FeatureStatus;
  aiMcpClient: FeatureStatus;
}

export interface Billing {
  // If true, the user has paid for the current period
  isActive: boolean;
  expirationWarningMessage: string;
  expirationErrorMessage: string;
  accessDenied: boolean;
}

export interface OrganizationFeatureLoaderData {
  featuresPromise: Promise<FeatureList>;
  billingPromise: Promise<Billing>;
}

export const useOrganizationLoaderData = () => {
  return useRouteLoaderData<typeof clientLoader>('routes/organization');
};

interface IndicatorProps {
  asyncTaskStatus: 'error' | 'idle' | 'loading' | 'submitting';
  settings: Settings;
  sync: () => void;
}

const NetworkAndSyncIndicator = ({ asyncTaskStatus, settings, sync }: IndicatorProps) => {
  const [status, setStatus] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    const handleOnline = () => setStatus('online');
    const handleOffline = () => setStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* The sync indicator only show when network status is online */}
      {/* use for show sync organization and projects status(1. first enter app 2. switch organization) */}
      {status === 'online' && asyncTaskStatus !== 'idle' ? (
        <TooltipTrigger>
          <Button
            className="flex h-full items-center justify-center gap-1 px-4 py-1 text-xs text-(--color-font) ring-1 ring-transparent transition-all hover:bg-(--hl-xs) focus:ring-(--hl-md) focus:ring-inset aria-pressed:bg-(--hl-sm)"
            onPress={() => {
              asyncTaskStatus === 'error' && sync();
            }}
          >
            <Icon
              icon={asyncTaskStatus !== 'error' ? 'spinner' : 'circle'}
              className={`${asyncTaskStatus === 'error' ? 'text-(--color-danger)' : 'text-(--color-font)'} w-5 ${asyncTaskStatus !== 'error' ? 'animate-spin' : ''}`}
            />
            {asyncTaskStatus !== 'error' ? 'Syncing' : 'Sync error: click to retry'}
          </Button>
          <Tooltip
            placement="top"
            offset={8}
            className="flex max-h-[85vh] min-w-max items-center gap-2 overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) px-4 py-2 text-sm text-(--color-font) shadow-lg select-none focus:outline-hidden"
          >
            {asyncTaskStatus !== 'error' ? 'Syncing' : 'Sync error: click to retry'}
          </Tooltip>
        </TooltipTrigger>
      ) : (
        <TooltipTrigger>
          <Button
            className="flex h-full items-center justify-center gap-1 px-4 py-1 text-xs text-(--color-font) capitalize ring-1 ring-transparent transition-all hover:bg-(--hl-xs) focus:ring-(--hl-md) focus:ring-inset aria-pressed:bg-(--hl-sm)"
            onPress={() => {
              if (settings.proxyEnabled) {
                showSettingsModal({
                  tab: 'proxy',
                });
              }
            }}
          >
            <Icon icon="circle" className={status === 'online' ? 'text-(--color-success)' : 'text-(--color-danger)'} />{' '}
            {status}
            {status === 'online' && settings.proxyEnabled ? ' via proxy' : ''}
          </Button>
          <Tooltip
            placement="top"
            offset={8}
            className="flex max-h-[85vh] min-w-max items-center gap-2 overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) px-4 py-2 text-sm text-(--color-font) shadow-lg select-none focus:outline-hidden"
          >
            {status === 'online'
              ? 'You have connectivity to the Internet' +
                (settings.proxyEnabled ? ' via the configured proxy' : '') +
                '.'
              : 'You are offline. Connect to sync your data.'}
          </Tooltip>
        </TooltipTrigger>
      )}
    </>
  );
};

const Component = ({ loaderData }: Route.ComponentProps) => {
  const { user } = loaderData;
  const { settings } = useRootLoaderData()!;

  const { organizationId } = useParams() as {
    organizationId: string;
    projectId?: string;
    workspaceId?: string;
  };

  const [isOrganizationSidebarOpen, setIsOrganizationSidebarOpen] = reactUse.useLocalStorage(
    'organizationSidebarOpen',
    true,
  );

  useCloseConnection({
    organizationId,
  });

  useEnvironmentFileSync();

  const [isMinimal, setIsMinimal] = reactUse.useLocalStorage('isMinimal', false);

  const asyncTaskStatus = 'idle';

  const syncOrgsAndProjects = () => {};

  return (
    <InsomniaEventStreamProvider>
      <InsomniaTabProvider>
        <div className="h-full w-full">
          <div
            className={`h-full w-full divide-x divide-solid divide-(--hl-md) ${isOrganizationSidebarOpen ? 'with-navbar' : ''} grid-template-app-layout relative grid bg-(--color-bg)`}
          >
            {!isMinimal && (
              <header className="grid grid-cols-3 items-center border-b border-solid border-(--hl-md) [grid-area:Header]">
                <div className="flex items-center gap-2">
                  <div className="flex w-[50px] shrink-0 justify-center py-2">
                    <InsomniaLogo />
                  </div>
                  {!user ? <GitHubStarsButton /> : null}
                </div>
                <CommandPalette />
                <div className="flex min-w-min items-center justify-end gap-(--padding-sm) space-x-3 p-2" />
              </header>
            )}
            {isOrganizationSidebarOpen && (
              <div className={`overflow-hidden [grid-area:Navbar] ${isOrganizationSidebarOpen ? '' : 'hidden'}`}>
                <nav className="flex h-full w-full flex-col place-content-stretch items-center gap-(--padding-md) overflow-y-auto py-(--padding-md)">
                  <TooltipTrigger>
                    <Link className="relative outline-hidden">
                      <div
                        className="box-border flex h-[28px] w-[28px] items-center justify-center overflow-hidden rounded-md bg-linear-to-br from-[#4000BF] to-[#154B62] font-bold text-(--color-font-surprise) outline-[3px] outline-offset-[3px] transition-all duration-150 select-none hover:no-underline active:outline-solid outline-(--color-font)"
                      >
                        <div className="flex items-center justify-center">
                          <Icon icon="home" />
                        </div>
                      </div>
                    </Link>
                    <Tooltip
                      placement="right"
                      offset={8}
                      className="max-h-[85vh] min-w-max overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) px-4 py-2 text-sm text-(--color-font) shadow-lg select-none focus:outline-hidden"
                    >
                      <span>Scratch Pad</span>
                    </Tooltip>
                  </TooltipTrigger>
                  <div className="flex-1" />
                </nav>
              </div>
            )}
            <div className="overflow-hidden border-b border-(--hl-md) [grid-area:Content]">
              <RunnerProvider>
                <Outlet />
              </RunnerProvider>
            </div>
            <div className="relative flex items-center overflow-hidden [grid-area:Statusbar]">
              <div className="flex h-full w-[50px] shrink-0 items-center justify-center gap-2 border-r border-solid border-r-(--hl-md)">
                <TooltipTrigger>
                  <ToggleButton
                    className="h-[10px] w-[10px] grow-0 gap-2 text-xs text-(--color-font) ring-1 ring-transparent transition-all hover:bg-(--hl-xs) focus:ring-(--hl-md) focus:ring-inset"
                    onChange={setIsOrganizationSidebarOpen}
                    isSelected={isOrganizationSidebarOpen}
                  >
                    {({ isSelected }) => {
                      return (
                        <svg
                          width={10}
                          height={10}
                          viewBox="0 0 16 16"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="currentColor"
                        >
                          {isSelected ? (
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M2 1L1 2v12l1 1h12l1-1V2l-1-1H2zm12 13H7V2h7v12z"
                            />
                          ) : (
                            <path d="M2 1L1 2v12l1 1h12l1-1V2l-1-1H2zm0 13V2h4v12H2zm5 0V2h7v12H7z" />
                          )}
                        </svg>
                      );
                    }}
                  </ToggleButton>
                  <Tooltip
                    placement="top"
                    offset={8}
                    className="flex max-h-[85vh] min-w-max items-center gap-2 overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) px-4 py-2 text-sm text-(--color-font) shadow-lg select-none focus:outline-hidden"
                  >
                    Toggle organizations sidebar
                  </Tooltip>
                </TooltipTrigger>
                <TooltipTrigger>
                  <ToggleButton
                    className="h-[10px] w-[10px] grow-0 rotate-90 gap-2 text-xs text-(--color-font) ring-1 ring-transparent transition-all hover:bg-(--hl-xs) focus:ring-(--hl-md) focus:ring-inset"
                    onChange={flag => {
                      setIsMinimal(!flag);
                    }}
                    isSelected={!isMinimal}
                  >
                    {({ isSelected }) => {
                      return (
                        <svg
                          width={10}
                          height={10}
                          viewBox="0 0 16 16"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="currentColor"
                        >
                          {isSelected ? (
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M2 1L1 2v12l1 1h12l1-1V2l-1-1H2zm12 13H7V2h7v12z"
                            />
                          ) : (
                            <path d="M2 1L1 2v12l1 1h12l1-1V2l-1-1H2zm0 13V2h4v12H2zm5 0V2h7v12H7z" />
                          )}
                        </svg>
                      );
                    }}
                  </ToggleButton>
                  <Tooltip
                    placement="top"
                    offset={8}
                    className="flex max-h-[85vh] min-w-max items-center gap-2 overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) px-4 py-2 text-sm text-(--color-font) shadow-lg select-none focus:outline-hidden"
                  >
                    Toggle header
                  </Tooltip>
                </TooltipTrigger>
              </div>
              <div className="flex w-full items-center gap-2">
                <div className="flex h-full shrink grow basis-1/3 items-center">
                  <TooltipTrigger>
                    <Button
                      data-testid="settings-button"
                      className="flex h-full items-center justify-center gap-2 px-4 py-1 text-xs text-(--color-font) ring-1 ring-transparent transition-all hover:bg-(--hl-xs) focus:ring-(--hl-md) focus:ring-inset aria-pressed:bg-(--hl-sm)"
                      onPress={() => showSettingsModal()}
                    >
                      <Icon icon="gear" /> Preferences
                    </Button>
                    <Tooltip
                      placement="top"
                      offset={8}
                      className="flex max-h-[85vh] min-w-max items-center gap-2 overflow-y-auto rounded-md border border-solid border-(--hl-sm) bg-(--color-bg) px-4 py-2 text-sm text-(--color-font) shadow-lg select-none focus:outline-hidden"
                    >
                      Preferences
                      <Hotkey keyBindings={settings.hotKeyRegistry.preferences_showGeneral} />
                    </Tooltip>
                  </TooltipTrigger>
                  {isMinimal && (
                    <NetworkAndSyncIndicator
                      asyncTaskStatus={asyncTaskStatus}
                      settings={settings}
                      sync={syncOrgsAndProjects}
                    />
                  )}
                </div>
                <div className="min-w-[120px] shrink grow basis-1/3">
                  {isMinimal && <CommandPalette style={{ width: '100%' }} />}
                </div>
                <div className="flex shrink grow basis-1/3 justify-end">
                  <div className="flex items-center gap-2">
                    {!isMinimal && (
                      <NetworkAndSyncIndicator
                        asyncTaskStatus={asyncTaskStatus}
                        settings={settings}
                        sync={syncOrgsAndProjects}
                      />
                    )}
                    {!isMinimal && (
                      <Link>
                        <a
                          className="flex items-center gap-1 px-(--padding-md) text-xs text-(--color-font) focus:underline focus:outline-hidden"
                          href="https://konghq.com/"
                        >
                          Made with
                          <Icon className="text-(--color-surprise-font)" icon="heart" /> by Kong
                        </a>
                      </Link>
                    )}
                  </div>
                  {isMinimal && (
                    <div className="flex items-center justify-end gap-(--padding-sm) p-2" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </InsomniaTabProvider>
    </InsomniaEventStreamProvider>
  );
};

export default Component;
