/** Code used when running as the dashboard **/

function initDashboard() {
  dashboardDocument = window.document;

  const url = new URL(window.location.href);
  const repositoryUuidIndex = 1 + url.pathname.lastIndexOf('/');
  repositoryUuid = url.pathname.substring(repositoryUuidIndex);

  // Setup the visualization selector
  document.getElementById('visualization-selector').onchange = e => {
    const selectElem = e.target;
    const optionElem = selectElem.options[selectElem.selectedIndex];
    const frameUrl = optionElem.getAttribute('data-frame-url');
    const frameElem = document.getElementById('content-frame');
    const parentElem = frameElem.parentNode;

    setCustomDashboardStylesheet('');
    clearCustomControls();
    dashboardDocument.dashboardChangeEventListeners = [];

    // Change the iframe source URL without creating a history entry
    frameElem.remove();
    frameElem.src = frameUrl;
    parentElem.appendChild(frameElem);
  };

  // Setup the button that collapses the nav
  document.getElementById('collapse-nav-button').onclick = () => {
    const classes = document.querySelector('nav.dashboard').classList;
    classes.toggle('collapsed');
  };

  // Setup the collapsible/foldable sections of the nav
  document.querySelectorAll('.fieldset-title').forEach(label => {
    const checkbox = label.querySelector('input');
    const fieldset = document.getElementById(label.getAttribute('data-toggles-fieldset'));
    function update() {
      fieldset.classList.toggle('collapsed', !checkbox.checked);
    }
    checkbox.onchange = update;
    update();
  });

  // Set up branch selector event listener
  const branchSelector = document.getElementById('branch-selector-field');
  branchSelector.onchange = runChangeEventListener;

  setupAuthorMerging();
  setupTimespanPicker();
  setupMilestoneControls();
}

/**
 * Adds a control to a specified fieldset section of the common controls.
 * @param {string} fieldsetName
 * @param {HTMLElement} control
 * @param {'begin'|'end'|HTMLElement} where Where to place the element in the
 * fieldset section. Either place the element at the begin, end (default) or
 * before another control in the same section.
 * @returns {HTMLElement} The provided control element
 */
function addCommonControl(fieldsetName, control, where = 'end') {
  const fieldset = document.getElementById(fieldsetName + '-section');

  let referenceElement;
  if (where === 'end') {
    referenceElement = null;
  } else if (where === 'begin') {
    referenceElement = fieldset.firstElementChild;
  } else {
    referenceElement = where;
  }

  fieldset.insertBefore(control, referenceElement);
  return control;
}

function setupEditCustomMilestones() {
  const tableElement = dashboardDocument.querySelector('#milestones-dialog table');
  const tableBody = tableElement.tBodies.length
    ? tableElement.tBodies[0]
    : tableElement.createTBody();

  function setEventListeners(rowElement, titleInput, dateInput, deleteButton) {
    titleInput.onchange = () => rowElement.setAttribute('data-title', titleInput.value);
    dateInput.onchange = () =>
      rowElement.setAttribute('data-due-date', new Date(dateInput.value).toISOString());
    deleteButton.onclick = () => rowElement.remove();
  }

  // Init rows
  for (const row of tableBody.rows) {
    // Hookup events to all custom milestones
    if (row.hasAttribute('data-is-custom')) {
      setEventListeners(
        row,
        row.cells[0].firstElementChild,
        row.cells[1].firstElementChild,
        row.cells[2].firstElementChild
      );
    }

    // Mark all existing rows as persistent
    row.setAttribute('data-persistent', '');
  }

  // Button to add a custom milestone
  dashboardDocument.getElementById('add-milestone-button').onclick = () => {
    const rowElement = tableBody.insertRow(-1);
    rowElement.setAttribute('data-is-custom', '');

    const titleInput = rowElement.insertCell(-1).appendChild(document.createElement('input'));
    titleInput.type = 'text';
    titleInput.placeholder = 'Name';

    const dateInput = rowElement.insertCell(-1).appendChild(document.createElement('input'));
    dateInput.type = 'date';

    const deleteButton = rowElement.insertCell(-1).appendChild(document.createElement('button'));
    deleteButton.type = 'button';
    deleteButton.classList.add('icon');
    deleteButton.appendChild(document.createElement('img')).src = '/static/cross.svg';

    setEventListeners(rowElement, titleInput, dateInput, deleteButton);
  };
}

function setupMilestoneControls() {
  // Setup the dialog element
  const milestonesDialog = initDialog('milestones-dialog');
  milestonesDialog.onclose = () => {
    const rows = milestonesDialog.querySelector('table').tBodies[0].rows;

    // Remove any rows that are not persistent yet
    if (milestonesDialog.returnValue === 'cancel') {
      for (const row of rows) {
        if (!row.hasAttribute('data-persistent')) {
          row.remove();
        }
      }

      return;
    }

    // Mark rows as persistent now that we save them
    for (const row of rows) {
      row.setAttribute('data-persistent', '');
    }

    saveDashboardConfig({
      milestones: parseMilestonesFromHTML(true),
      mergedAuthors: parseAuthorsFromHTML()
    });

    runChangeEventListener('milestones');
  };

  // Open modal button
  const editMilestonesButton = addCommonControl('indicators', document.createElement('button'));
  editMilestonesButton.name = 'editMilestones';
  editMilestonesButton.textContent = 'Edit Milestones';
  editMilestonesButton.type = 'button';
  editMilestonesButton.onclick = e => {
    e.stopPropagation();
    milestonesDialog.showModal();

    setupEditCustomMilestones();
  };

  // Show milestones checkbox
  const milestoneCheckbox = createInput('checkbox', 'showMilestones', 'Show Milestones');
  addCommonControl('indicators', milestoneCheckbox, 'begin');
}

/**
 * This function returns the current milestones from the milestone modal
 * @param {boolean?} onlyCustomMilestones Only return custom milestones
 * @returns { {title: string, dueDate: string, isCustom: boolean }[]}
 */
function parseMilestonesFromHTML(onlyCustomMilestones = false) {
  return Array.from(dashboardDocument.querySelectorAll('#milestones-dialog tr'))
    .map(row => ({
      title: row.getAttribute('data-title')?.trim(),
      dueDate: new Date(row.getAttribute('data-due-date') || ''),
      isCustom: row.hasAttribute('data-is-custom')
    }))
    .filter(
      ({ title, dueDate, isCustom }) =>
        title && dueDate && !Number.isNaN(dueDate.getTime()) && (isCustom || !onlyCustomMilestones)
    )
    .map(({ title, dueDate, isCustom }) => ({
      title,
      dueDate: dueDate.toISOString().substring(0, 10),
      isCustom
    }));
}

/**
 * This function returns the current merging state from the merging modal
 * @returns { {memberName: string, contributors: {authorName: string, email: string}[] }[]}
 */
function parseAuthorsFromHTML() {
  return Array.from(dashboardDocument.querySelectorAll('#merge-authors-dialog .member-group')).map(
    group => ({
      memberName: group.getAttribute('data-member-name'),
      contributors: Array.from(group.querySelectorAll('.contributor'))
        .filter(contributor => !contributor.classList.contains('placeholder'))
        .map(contributor => ({
          authorName: contributor.getAttribute('data-author-name')?.trim(),
          email: contributor.getAttribute('data-email')?.trim()
        }))
    })
  );
}

function updateAuthorVisibility() {
  const showEmpty = document.getElementById('show-empty-members-field').checked;
  const authorList = document.getElementById('author-list');
  authorList.style.setProperty('--display-empty-member-groups', showEmpty ? 'block' : 'none');
}

function fillAuthorList(authors) {
  // CLear prior list
  const authorList = document.getElementById('author-list');
  authorList.innerHTML = ''; // Clear existing content

  // create new with merging data
  for (const member of authors) {
    // Create the member group
    const memberGroup = authorList.appendChild(document.createElement('div'));
    memberGroup.classList.add('member-group');

    // Add the member name
    const memberName = memberGroup.appendChild(document.createElement('div'));
    memberName.classList.add('member-name');
    memberName.textContent = member.memberName;

    // Add the contributors
    for (const contributor of member.contributors) {
      const contributorDiv = memberGroup.appendChild(document.createElement('div'));
      contributorDiv.classList.add('contributor');

      const authorNameSpan = contributorDiv.appendChild(document.createElement('span'));
      authorNameSpan.textContent = `${contributor.authorName.trim()} `;

      const emailSpan = contributorDiv.appendChild(document.createElement('span'));
      emailSpan.textContent = contributor.email;
    }
  }
}

async function saveDashboardConfig(dashboardConfig) {
  // Get CSRF token to include it in the request
  const csrfToken = document
    .getElementById('common-controls')
    .elements.namedItem('csrfToken').value;

  // Send the current author merging config to the server
  try {
    const resp = await fetch(`/api/repo/${repositoryUuid}/dashboard-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify(dashboardConfig)
    });

    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`Got not ok response: ${text}`);
    }
  } catch (e) {
    console.error(`Could not save merged authors: ${e}`);
  }
}

function setupMergingDragAndDrop() {
  const authorsDialog = document.getElementById('merge-authors-dialog');
  const contributors = authorsDialog.querySelectorAll('.contributor:not(.placeholder)');
  const groups = authorsDialog.querySelectorAll('.member-group');

  for (const contributor of contributors) {
    contributor.ondragstart = e => {
      e.dataTransfer.setData('author-email', e.target.getAttribute('data-email'));
    };
  }

  for (const group of groups) {
    const dropArea = group.querySelector('.contributors');
    dropArea.ondragover = e => e.preventDefault();

    dropArea.ondrop = e => {
      e.preventDefault();

      const draggedEmail = e.dataTransfer.getData('author-email');
      const draggedElement = document.querySelector(`.contributor[data-email='${draggedEmail}']`);
      if (dropArea && draggedElement) {
        dropArea.appendChild(draggedElement);
      }
    };
  }
}

function setupAuthorMerging() {
  // Populate the author list
  const parsedHTMLData = parseAuthorsFromHTML();
  fillAuthorList(parsedHTMLData);

  const showEmptyCheckbox = createInput('checkbox', 'showEmptyMembers', 'Show Empty Members');
  showEmptyCheckbox.onchange = updateAuthorVisibility;
  addCommonControl('authors', showEmptyCheckbox, 'begin');
  updateAuthorVisibility();

  // Setup the dialog element
  const authorsDialog = initDialog('merge-authors-dialog');
  authorsDialog.onclose = () => {
    // Do nothing when the dialog is canceled
    if (authorsDialog.returnValue === 'cancel') {
      return;
    }

    const mergedAuthors = parseAuthorsFromHTML();

    // Update list shown in dashboard
    fillAuthorList(mergedAuthors);
    updateAuthorVisibility();

    saveDashboardConfig({
      milestones: parseMilestonesFromHTML(true),
      mergedAuthors
    });

    runChangeEventListener('mergedAuthors');
  };

  // Open modal button
  document.getElementById('merge-authors-button').onclick = e => {
    e.stopPropagation();
    authorsDialog.showModal();
    setupMergingDragAndDrop(); // Initialize drag-and-drop functionality when modal is opened
  };
}

function setupTimespanPicker() {
  const commonControls = dashboardDocument.getElementById('common-controls');

  // Date inputs
  const startControl = commonControls.elements.namedItem('startDate');
  const endControl = commonControls.elements.namedItem('endDate');

  // Add change event listeners
  startControl.onchange = runChangeEventListener;
  endControl.onchange = runChangeEventListener;

  // Reset time-span Button
  const resetButton = addCommonControl('filtering', document.createElement('button'));
  resetButton.type = 'button';
  resetButton.id = 'reset-timespan';
  resetButton.textContent = 'Reset Timespan';

  // Reset Timespan Event Listener
  resetButton.onclick = () => {
    startControl.value = startControl.min;
    endControl.value = endControl.max;

    // Create a change event to trigger the changeEventListener
    runChangeEventListener('reset');
  };
}

function initDialog(id) {
  const dialogElement = document.getElementById(id);
  const confirmButton = dialogElement.querySelector('button.confirm');

  confirmButton.addEventListener('click', e => {
    e.preventDefault();
    dialogElement.close('confirm');
  });

  // Close modal when clicking outside the modal content
  window.addEventListener('click', event => {
    // Clicked outside the 'form' element inside the dialog element and is still attached
    // to the DOM. If a button removes itself from the DOM it would also trigger closing
    // the modal otherwise.
    const inDialogElement = dialogElement.firstElementChild.contains(event.target);
    const inDocument = dashboardDocument.contains(event.target);
    if (!inDialogElement && inDocument) {
      dialogElement.close('cancel');
    }
  });

  return dialogElement;
}

/** Code used when being loaded by a visualization as a library **/

export let pageURL = null;
export let baseURL = null;
export let visualizationName = null;
export let dashboardDocument = null;
export let repositoryUuid = null;

function initVisualizationUtils() {
  pageURL = new URL(window.location.href);
  baseURL = pageURL.origin + pageURL.pathname.replace('index.html', '');
  visualizationName = pageURL.searchParams.get('show');
  repositoryUuid = pageURL.searchParams.get('repo');
  dashboardDocument = window.parent.document;
}

export function setChangeEventListener(fn) {
  if (!dashboardDocument.dashboardChangeEventListeners) {
    dashboardDocument.dashboardChangeEventListeners = [];
  }
  dashboardDocument.dashboardChangeEventListeners.push(fn);
}

export function runChangeEventListener(event) {
  const listeners = dashboardDocument.dashboardChangeEventListeners;
  if (listeners) {
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

/**
 * Create an input element and label wrapped in a div. The input element is
 * automatically hooked up to the changeEventListener callback function.
 * @param {string} type Input element type
 * @param {string} name Name of the input element
 * @param {string} label Text content of the label
 * @param {Object.<string, string>} attributes HTML attributes to be set on the input element
 * @param {string[]} cssClasses Class names to be set on the container div element
 * @param {string} elementKind Element type of the input element
 * @returns {HTMLDivElement}
 */
export function createInput(
  type,
  name,
  label,
  attributes = {},
  cssClasses = [],
  elementKind = 'input'
) {
  // Make a unique id string from the name
  const id = name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`) + '-field';

  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', id);
  labelElement.textContent = label;

  const inputElement = document.createElement(elementKind);
  inputElement.name = name;
  inputElement.id = id;
  inputElement.onchange = runChangeEventListener;

  if (type) {
    inputElement.type = type;
  }

  // Set custom attributes
  for (const key in attributes) {
    inputElement.setAttribute(key, attributes[key]);
  }

  const containerElement = document.createElement('div');
  containerElement.appendChild(labelElement);
  containerElement.appendChild(inputElement);

  // Add css classes to the container element, so they can affect both the
  // label and input element
  if (cssClasses.length) {
    containerElement.classList.add(...cssClasses);
  } else {
    containerElement.classList.add('dashboard-control');
  }

  return containerElement;
}

/**
 * Create a select element and label wrapped in a div. The input element is
 * automatically hooked up to the changeEventListener callback function.
 * @param {string} name Name of the input element
 * @param {string} label Text content of the label
 * @param {{label: string, value: string, selected: boolean?}[]} options Options to be displaced in the select element
 * @param {Object.<string, string>} attributes HTML attributes to be set on the input element
 * @param {string[]} cssClasses Class names to be set on the container div element
 * @returns {HTMLDivElement}
 */
export function createSelect(name, label, options = [], attributes = {}, cssClasses = []) {
  const containerElement = createInput(undefined, name, label, attributes, cssClasses, 'select');
  const selectElement = containerElement.children[1];

  // Add all the options as children to the select element
  for (const { label, value, selected } of options) {
    const optionElement = selectElement.appendChild(document.createElement('option'));
    optionElement.textContent = label;
    optionElement.value = value;
    optionElement.selected = !!selected;
  }

  return containerElement;
}

/**
 * Collects the currently set values of all inputs found in the provided form element
 * @param {HTMLFormElement} formElement
 * @returns {Object.<string, string|boolean>}
 */
function collectFormInputValues(formElement) {
  const values = {};

  for (let i = 0; i < formElement.elements.length; i++) {
    const element = formElement.elements.item(i);

    if (element.tagName.toLowerCase() === 'input') {
      if (element.type === 'checkbox') {
        values[element.name] = element.checked;
      } else if (element.type === 'radio') {
        throw new Error('Not supported yet');
      } else {
        values[element.name] = element.value;
      }
    } else if (element.tagName.toLowerCase() === 'select') {
      values[element.name] = element.value;
    }
  }

  return values;
}

/**
 * Sets the values of all inputs in the provided form element that match
 * keys in the values object
 * @param {HTMLFormElement} formElement
 * @param {Object.<string, any>} values
 */
function setFormInputValues(formElement, values) {
  for (const key in values) {
    const element = formElement.elements.namedItem(key);
    if (!element) {
      continue;
    }

    if (element.tagName.toLowerCase() === 'input') {
      if (element.type === 'checkbox') {
        element.checked = !!values[key];
      } else if (element.type === 'radio') {
        throw new Error('Not supported yet');
      } else {
        element.value = values[key];
      }
    } else if (element.tagName.toLowerCase() === 'select') {
      element.value = values[key];
    }
  }
}

export function getControlValues() {
  const commonControlsForm = dashboardDocument.getElementById('common-controls');
  const customControlsForm = dashboardDocument.getElementById('custom-controls');

  return {
    common: {
      ...collectFormInputValues(commonControlsForm),
      milestones: parseMilestonesFromHTML(),
      authors: parseAuthorsFromHTML()
    },
    custom: collectFormInputValues(customControlsForm)
  };
}

export function setControlValues(values) {
  const commonControlsForm = dashboardDocument.getElementById('common-controls');
  const customControlsForm = dashboardDocument.getElementById('custom-controls');

  setFormInputValues(commonControlsForm, values.common);
  setFormInputValues(customControlsForm, values.custom);
}

export async function setCustomDashboardStylesheet(href, options = { prependBaseURL: true }) {
  let linkElement = dashboardDocument.getElementById('custom-css-stylesheet');
  if (!linkElement) {
    // Do not create the element if we do not need it
    if (!href) {
      return;
    }

    linkElement = dashboardDocument.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.id = 'custom-css-stylesheet';
    dashboardDocument.head.appendChild(linkElement);
  }

  if (!runsAsDashboard() && options.prependBaseURL) {
    href = baseURL + href;
  }

  linkElement.href = href;
}

export function clearCustomControls() {
  const customControlDiv = dashboardDocument.getElementById('custom-controls');
  customControlDiv.innerHTML = '';
}

/** Entry point **/

function runsAsDashboard() {
  return window.location.pathname.startsWith('/dashboard');
}

function moduleMain() {
  if (runsAsDashboard()) {
    initDashboard();
  } else {
    initVisualizationUtils();
  }
}

// Entry point of the module
moduleMain();
