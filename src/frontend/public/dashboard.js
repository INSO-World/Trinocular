/** Code used when running as the dashboard **/

const DROP_AREA_TEXT = "Drop contributor here";
function initDashboard() {
  dashboardDocument = window.document;

  document.getElementById('visualization-selector').onchange = e => {
    const selectElem = e.target;
    const optionElem = selectElem.options[selectElem.selectedIndex];
    const frameUrl = optionElem.getAttribute('data-frame-url');
    const frameElem = document.getElementById('content-frame');
    const parentElem = frameElem.parentNode;

    setCustomDashboardStylesheet('');
    clearCustomControls();

    // Change the iframe source URL without creating a history entry
    frameElem.remove();
    frameElem.src = frameUrl;
    parentElem.appendChild(frameElem);
  };

  document.getElementById('collapse-nav-button').onclick = () => {
    const classes = document.querySelector('nav.dashboard').classList;
    classes.toggle('collapsed');
  };

  // Add start/end date inputs and reset button

  setupAuthorMerging();
  setupTimespanPicker();

}


/**
 * This function returns the current merging state from the merging modal
 * @returns { {memberName: string, contributors: {authorName: string, email: string}[] }[]}
 */
function parseAuthorsFromHTML() {
  return Array
    .from( document.querySelectorAll('#merge-authors-dialog .member-group') )
    .map( group => ({
      memberName: group.getAttribute('data-member-name'),
      contributors: Array
        .from( group.querySelectorAll('.contributor') )
        .filter( contributor => !contributor.hasAttribute('data-drop-area') )
        .map( contributor => ({
          authorName: contributor.getAttribute('data-author-name')?.trim(),
          email: contributor.getAttribute('data-email')?.trim()
        }))
    }));
}

function combineNewAuthorsWithSavedMerging(savedAuthors, newAuthors) {
  const mergedData = [...savedAuthors];

  newAuthors.forEach(({ memberName, contributors }) => {
    // Check if the member already exists in the merged data
    const existingMember = mergedData.find(member => member.memberName === memberName);

    if (!existingMember) {
      // If the member does not exist, add the whole member with contributors
      mergedData.push({ memberName, contributors });
    } else {
      // If the member exists, add only missing contributors
      contributors.forEach(({ authorName, email }) => {
        if (!contributors.some(contributor =>
          contributor.authorName === authorName && contributor.email === email)) {
          existingMember.contributors.push({ authorName, email });
        }
      });
    }
  });

  return mergedData;
}

function updateAuthorVisibility() {
  const showEmpty = document.getElementById('toggle-empty-members').checked;
  const authorList = document.getElementById('author-list');
  authorList.style.setProperty('--display-empty-member-groups', showEmpty ? 'block' : 'none');
}

function fillAuthorList(authors) {
  // CLear prior list
  const authorList = document.getElementById('author-list');
  const mergingAuthorList = document.querySelector('#merge-authors-dialog .merge-area');
  authorList.innerHTML = ''; // Clear existing content
  mergingAuthorList.innerHTML = '';

  // create new with merging data
  authors.forEach(member => {
    // Create the member group
    const memberGroup = document.createElement('div');
    memberGroup.classList.add('member-group');
    const mergingMemberGroup = document.createElement('div');
    mergingMemberGroup.classList.add('member-group');
    mergingMemberGroup.setAttribute('data-member-name', member.memberName);

    // Add the member name
    const memberName = document.createElement('div');
    memberName.classList.add('member-name');
    memberName.textContent = member.memberName;
    memberGroup.appendChild(memberName);
    const MergedMemberName = document.createElement('div');
    MergedMemberName.classList.add('member-name');
    MergedMemberName.textContent = member.memberName;
    mergingMemberGroup.appendChild(MergedMemberName);
    const mergingContributors = document.createElement('div');
    mergingContributors.classList.add('contributors');
    mergingMemberGroup.appendChild(mergingContributors);


    // create empty drop area if no contributors exist
    if(member.contributors.length === 0 ) {
      const emptyDropArea = document.createElement('div');
      emptyDropArea.classList.add('contributor');
      emptyDropArea.setAttribute('data-drop-area', '');
      const dropAreaSpan = document.createElement('span');
      dropAreaSpan.textContent = DROP_AREA_TEXT;
      emptyDropArea.appendChild(dropAreaSpan);
      mergingContributors.appendChild(emptyDropArea);
    } else {
      // Add the contributors
      member.contributors.forEach(contributor => {
        // dashboard list
        const contributorDiv = document.createElement('div');
        contributorDiv.classList.add('contributor');
        const authorNameSpan = document.createElement('span');
        authorNameSpan.textContent = `${contributor.authorName.trim()} `;
        contributorDiv.appendChild(authorNameSpan);
        const emailSpan = document.createElement('span');
        emailSpan.textContent = contributor.email;
        contributorDiv.appendChild(emailSpan);

        // merging modal list
        const mergingContributorDiv = document.createElement('div');
        mergingContributorDiv.classList.add('contributor');
        mergingContributorDiv.draggable = true;
        mergingContributorDiv.id = `modal-contributor-${contributor.email}`;
        mergingContributorDiv.setAttribute('data-email', contributor.email)
        mergingContributorDiv.setAttribute('data-author-name', contributor.authorName)
        const mergingAuthorNameSpan = document.createElement('span');
        mergingAuthorNameSpan.classList.add('contributor-author')
        mergingAuthorNameSpan.textContent = `${contributor.authorName.trim()} `;
        mergingContributorDiv.appendChild(mergingAuthorNameSpan);
        const mergingEmailSpan = document.createElement('span');
        mergingEmailSpan.textContent = contributor.email;
        mergingEmailSpan.classList.add('contributor-email');
        mergingContributorDiv.appendChild(mergingEmailSpan);
        const dragHandle = document.createElement('span');
        dragHandle.textContent = '☰';
        dragHandle.classList.add('drag-handle');
        mergingContributorDiv.appendChild(dragHandle);

        memberGroup.appendChild(contributorDiv);
        mergingContributors.appendChild(mergingContributorDiv);
      });
    }

    // Append the member group to the section
    authorList.appendChild(memberGroup);
    mergingAuthorList.appendChild(mergingMemberGroup);
  });
}

/**
 * This function is used to initialize the list with data from the localstorage upon loading
 */
function initializeAuthorList() {
  // Parse from the merging Modal
  const parsedHTMLData = parseAuthorsFromHTML();

  // TODO better way to get uuid?
  const url = window.location.href;
  const uuidMatch = url.match(/\/dashboard\/([a-f0-9\-]+)(?:\?|$)/);
  const repoUuid = uuidMatch[1];

  // load prior merging from localstorage
  const savedMergedAuthors = JSON.parse(localStorage.getItem(repoUuid));
  let mergedAuthors = parsedHTMLData;
  if(savedMergedAuthors) {
    mergedAuthors = combineNewAuthorsWithSavedMerging(savedMergedAuthors,parsedHTMLData);
  }

  fillAuthorList(mergedAuthors)

  //update localstorage
  localStorage.setItem(repoUuid, JSON.stringify(mergedAuthors));
  updateAuthorVisibility();
}

function saveMergedAuthors(){
  const mergedAuthors = parseAuthorsFromHTML();

  const url = window.location.href;
  const uuidMatch = url.match(/\/dashboard\/([a-f0-9\-]+)$/);
  const repoUuid = uuidMatch[1];

  // update list shown in dashboard
  fillAuthorList(mergedAuthors);
  // save new merging state to localstorage
  localStorage.setItem(repoUuid, JSON.stringify(mergedAuthors));
  updateAuthorVisibility();
}

function setupMergingDragAndDrop() {
  const authorsDialog= document.getElementById('merge-authors-dialog');
  const contributors = authorsDialog.querySelectorAll('.contributor');
  const groups = authorsDialog.querySelectorAll('.member-group');

  contributors.forEach(contributor => {
    contributor.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text', e.target.id);
    });
  });

  groups.forEach(group => {
    const dropArea = group.querySelector('.contributors');
    dropArea.addEventListener('dragover', (e) => e.preventDefault());
    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();

      const draggedElementId = e.dataTransfer.getData('text');
      const draggedElement = document.getElementById(draggedElementId);
      // Remove the dragged contributor from its original group
      if (draggedElement) {
        const parent = draggedElement.parentNode;
        dropArea.appendChild(draggedElement);

        // if field is now empty, create new dropArea
        if(parent.children.length === 0){
            const newDropArea = document.createElement('div');
            newDropArea.classList.add('contributor');
            newDropArea.textContent = DROP_AREA_TEXT;
            newDropArea.setAttribute('data-drop-area', '');
            parent.appendChild(newDropArea);
        }
      }

      // If there are contributors now, remove placeholder text
      if (dropArea.children.length > 0) {
        const childrenElems = dropArea.children;
        const placeHolderElem = Array.from(childrenElems).find(child => child.textContent.trim() === DROP_AREA_TEXT);
        if (placeHolderElem) {
          placeHolderElem.remove();
        }
      }
    });
  });

}

function setupAuthorMerging() {
  // load previous saved data from the local storage and fuse with given new data
  initializeAuthorList();

  const showEmptyCheckbox = document.getElementById('toggle-empty-members')
  showEmptyCheckbox.addEventListener('change', updateAuthorVisibility);

  // Setup the dialog element
  const authorsDialog= initDialog('merge-authors-dialog');
  authorsDialog.onclose= () => {
    // Do nothing when the dialog is canceled
    if( authorsDialog.returnValue === 'cancel' ) {
      return;
    }

    saveMergedAuthors();
  };

  // Open modal button
  document.getElementById('merge-authors-button').onclick = e => {
    e.stopPropagation();
    authorsDialog.showModal();
    const members = parseAuthorsFromHTML()
    setupMergingDragAndDrop(members); // Initialize drag-and-drop functionality when modal is opened
  };

  // Close modal when clicking outside the modal content
  window.addEventListener('click', (event) => {
    // Clicked outside the 'form' element inside the dialog element
    if( !authorsDialog.firstElementChild.contains(event.target) ) {
      authorsDialog.close('cancel');
    }
  });
}

function setupTimespanPicker() {
  const commonControls = document.getElementById('common-controls');

  // Date inputs
  const startDateDiv = createInput('date', 'startDate', 'Start Date');
  const endDateDiv = createInput('date', 'endDate', 'End Date');

  // Reset time-span Button
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.id = 'reset-timespan';
  resetButton.textContent = 'Reset Timespan';

  // Reset Timespan Event Listener
  resetButton.onclick = () => {
    const commonControlsForm = dashboardDocument.getElementById('common-controls');
    const startControl = commonControlsForm.elements.namedItem('startDate');
    const endControl = commonControlsForm.elements.namedItem('endDate');

    startControl.value = startControl.min;
    endControl.value = endControl.max;

    // Create a change event to trigger the changeEventListener
    runChangeEventListener('reset');
  };

  // Append all elements to the container
  commonControls.appendChild(startDateDiv);
  commonControls.appendChild(endDateDiv);
  commonControls.appendChild(resetButton);
}

function initDialog( id ) {
  const dialogElement= document.getElementById( id );
  const confirmButton= dialogElement.querySelector('button.confirm');

  confirmButton.addEventListener('click', e => {
    e.preventDefault();
    dialogElement.close('confirm');
  });

  return dialogElement;
}

/** Code used when being loaded by a visualization as a library **/

export let pageURL = null;
export let baseURL = null;
export let visualizationName = null;
export let dashboardDocument = null;

function initVisualizationUtils() {
  pageURL = new URL(window.location.href);
  baseURL = pageURL.origin + pageURL.pathname.replace('index.html', '');
  visualizationName = pageURL.searchParams.get('show');
  dashboardDocument = window.parent.document;
}

export function setChangeEventListener(fn) {
  dashboardDocument.dashboardChangeEventListener = fn;
}

export function runChangeEventListener(event) {
  const fn = dashboardDocument.dashboardChangeEventListener;
  if (fn) {
    fn(event);
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
    common: collectFormInputValues(commonControlsForm),
    custom: collectFormInputValues(customControlsForm)
  };
}

export function setControlValues(values) {
  const commonControlsForm = dashboardDocument.getElementById('common-controls');
  const customControlsForm = dashboardDocument.getElementById('custom-controls');

  setFormInputValues(commonControlsForm, values.common);
  setFormInputValues(customControlsForm, values.custom);
}

export function initDateControls(minDate, maxDate) {
  function dateString(date) {
    return date instanceof Date ? date.toISOString().substring(0, 10) : date;
  }

  const commonControlsForm = dashboardDocument.getElementById('common-controls');
  const startControl = commonControlsForm.elements.namedItem('startDate');
  const endControl = commonControlsForm.elements.namedItem('endDate');
  if (startControl.min && endControl.min && startControl.max && endControl.max) {
    return;
  }

  minDate = dateString(minDate);
  maxDate = dateString(maxDate);

  startControl.min = endControl.min = startControl.value = minDate;
  startControl.max = endControl.max = endControl.value = maxDate;
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
