import { transactionToWaitFor } from '../lib/currently-importing.js';
import { getTaskStatus } from '../lib/requests.js';
import {getRepositoryByUuid} from '../lib/database.js';

async function loadStatusInfo(repoUuid) {
  const transactionId = transactionToWaitFor(repoUuid);
  if (!transactionId) {
    return null;
  }

  const status = await getTaskStatus(transactionId);
  if (!status) {
    return {
      errorMessage: `Could not query the status of the repository import`,
      apiBridgeStatus: 'error',
      repoStatus: 'error',
      visualizationStatus: 'error'
    };
  }
  const { state, visualizationProgress } = status;

  let apiBridgeStatus = 'pending';
  let repoStatus = 'pending';
  let visualizationStatus = 'pending';

  switch (state) {
    case 'pending':
      break;
    case 'error':
      apiBridgeStatus = repoStatus = visualizationStatus = 'error';
      break;
    case 'done':
      apiBridgeStatus = repoStatus = visualizationStatus = 'done';
      break;

    case 'updating_api_service':
      apiBridgeStatus = 'running';
      repoStatus = 'pending';
      visualizationStatus = 'pending';
      break;

    case 'updating_repo_service':
      apiBridgeStatus = 'done';
      repoStatus = 'running';
      visualizationStatus = 'pending';
      break;

    case 'updating_visualizations':
      apiBridgeStatus = 'done';
      repoStatus = 'done';
      visualizationStatus = 'running';
      break;

    default:
      console.error(
        `Received unknown task state '${state}' from scheduler for task '${transactionId}'`
      );
      break;
  }

  // If we have a progress value for the visualization, we can use it instead
  if (visualizationProgress && visualizationStatus !== 'pending') {
    visualizationStatus = visualizationProgress;
  }

  return {
    apiBridgeStatus,
    repoStatus,
    visualizationStatus
  };
}

export async function getWaitPage(req, res) {
  const { repoUuid } = req.params;

  const statusInfo = await loadStatusInfo(repoUuid);
  if (!statusInfo) {
    // There is nothing to wait for
    return res.redirect(`/dashboard/${repoUuid}`);
  }

  // show default name if no name was found
  let repoName = 'Repository';
  try {
    const repo = getRepositoryByUuid(repoUuid);
    repoName = repo.name;
  } catch (e) {
    console.error(`Repository with uuid: ${repoUuid} not found: ${e.message}`);
  }

  res.render('wait-for-repo', {
    scriptSource: '/static/wait.js',
    user: req.user,
    repoName,
    ...statusInfo
  });
}

export async function getWaitPageUpdate(req, res) {
  const { repoUuid } = req.params;

  const statusInfo = await loadStatusInfo(repoUuid);
  if (!statusInfo) {
    // Send empty response
    return res.sendStatus(204);
  }

  res.render('partial', {
    layout: 'empty',
    partialName: 'repo-wait-status',
    ...statusInfo
  });
}
