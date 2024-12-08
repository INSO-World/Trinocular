
/** Code used when running as the dashboard **/

function initDashboard() {
  dashboardDocument= window.document;

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
    const classes= document.querySelector('nav.dashboard').classList;
    classes.toggle('collapsed');
  }
  // Add start/end date inputs and reset button
  setupTimespanPicker();
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
    const commonControlsForm= dashboardDocument.getElementById('common-controls');
    const startControl= commonControlsForm.elements.namedItem('startDate');
    const endControl= commonControlsForm.elements.namedItem('endDate');

    startControl.value= startControl.min;
    endControl.value= endControl.max;

    // Create a change event to trigger the changeEventListener
    runChangeEventListener( 'reset' )
  };

  // Append all elements to the container
  commonControls.appendChild(startDateDiv);
  commonControls.appendChild(endDateDiv);
  commonControls.appendChild(resetButton);
}


/** Code used when being loaded by a visualization as a library **/

export let pageURL= null;
export let baseURL= null;
export let visualizationName= null;
export let dashboardDocument= null;

function initVisualizationUtils() {
  pageURL = new URL(window.location.href);
  baseURL = pageURL.origin + pageURL.pathname.replace('index.html', '');
  visualizationName = pageURL.searchParams.get('show');
  dashboardDocument = window.parent.document;
}

export function setChangeEventListener( fn ) {
  dashboardDocument.dashboardChangeEventListener= fn;
}

export function runChangeEventListener( event ) {
  const fn= dashboardDocument.dashboardChangeEventListener;
  if( fn ) {
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
export function createInput( type, name, label, attributes= {}, cssClasses= [], elementKind= 'input' ) {
  // Make a unique id string from the name
  const id= name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)+ '-field';

  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', id);
  labelElement.textContent = label;
  
  const inputElement = document.createElement(elementKind);
  inputElement.name = name;
  inputElement.id = id;
  inputElement.onchange= runChangeEventListener;

  if( type ) {
    inputElement.type = type;
  }

  // Set custom attributes
  for( const key in attributes ) {
    inputElement.setAttribute( key, attributes[key] );
  }

  const containerElement = document.createElement('div');
  containerElement.appendChild(labelElement);
  containerElement.appendChild(inputElement);

  // Add css classes to the container element, so they can affect both the
  // label and input element
  if( cssClasses.length ) {
    containerElement.classList.add( ...cssClasses );
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
export function createSelect( name, label, options= [], attributes= {}, cssClasses= [] ) {
  const containerElement= createInput( undefined, name, label, attributes, cssClasses, 'select' );
  const selectElement= containerElement.children[1];

  // Add all the options as children to the select element
  for( const {label, value, selected} of options ) {
    const optionElement= selectElement.appendChild( document.createElement('option') );
    optionElement.textContent= label;
    optionElement.value= value;
    optionElement.selected= !!selected;
  }

  return containerElement;

}

/**
 * Collects the currently set values of all inputs found in the provided form element
 * @param {HTMLFormElement} formElement 
 * @returns {Object.<string, string|boolean>}
 */
function collectFormInputValues( formElement ) {
  const values= {};

  for( let i= 0; i< formElement.elements.length; i++) {
    const element= formElement.elements.item( i );

    if( element.tagName.toLowerCase() === 'input' ) {
      if( element.type === 'checkbox' ) {
        values[element.name]= element.checked;
        
      } else if( element.type === 'radio' ) {
        throw new Error('Not supported yet');

      } else {
        values[element.name]= element.value;
      }

    } else if( element.tagName.toLowerCase() === 'select' ) {
      values[element.name]= element.value;
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
function setFormInputValues( formElement, values ) {
  for( const key in values ) {
    const element= formElement.elements.namedItem( key );
    if( !element ) {
      continue;
    }

    if( element.tagName.toLowerCase() === 'input' ) {
      if( element.type === 'checkbox' ) {
        element.checked= !!values[key];
        
      } else if( element.type === 'radio' ) {
        throw new Error('Not supported yet');

      } else {
        element.value= values[key];
      }

    } else if( element.tagName.toLowerCase() === 'select' ) {
      element.value= values[key];
    }
  }
}

export function getControlValues() {
  const commonControlsForm= dashboardDocument.getElementById('common-controls');
  const customControlsForm= dashboardDocument.getElementById('custom-controls');

  return {
    common: collectFormInputValues( commonControlsForm ),
    custom: collectFormInputValues( customControlsForm ),
  };
}

export function setControlValues( values ) {
  const commonControlsForm= dashboardDocument.getElementById('common-controls');
  const customControlsForm= dashboardDocument.getElementById('custom-controls');

  setFormInputValues(commonControlsForm, values.common);
  setFormInputValues(customControlsForm, values.custom);
}

export function initDateControls( minDate, maxDate ) {
  function dateString( date ) {
    return date instanceof Date ? date.toISOString().substring(0,10) : date;
  }

  const commonControlsForm= dashboardDocument.getElementById('common-controls');
  const startControl= commonControlsForm.elements.namedItem('startDate');
  const endControl= commonControlsForm.elements.namedItem('endDate');
  if( startControl.min && endControl.min && startControl.max && endControl.max ) {
    return;
  }

  minDate= dateString( minDate );
  maxDate= dateString( maxDate );

  startControl.min= endControl.min= startControl.value= minDate;
  startControl.max= endControl.max= endControl.value= maxDate;
}

export async function setCustomDashboardStylesheet( href, options= {prependBaseURL: true} ) { 
  let linkElement= dashboardDocument.getElementById('custom-css-stylesheet');
  if( !linkElement ) {

    // Do not create the element if we do not need it
    if( !href ) {
      return;
    }

    linkElement= dashboardDocument.createElement('link');
    linkElement.rel= 'stylesheet';
    linkElement.id= 'custom-css-stylesheet';
    dashboardDocument.head.appendChild( linkElement );
  }

  if( !runsAsDashboard() && options.prependBaseURL ) {
    href= baseURL+ href;
  }

  linkElement.href= href;
}

export function clearCustomControls() {
  const customControlDiv = dashboardDocument.getElementById('custom-controls');
  customControlDiv.innerHTML= '';
}

/** Entry point **/

function runsAsDashboard() {
  return window.location.pathname.startsWith('/dashboard');
}

function moduleMain() {
  if( runsAsDashboard() ) {
    initDashboard();
  } else {
    initVisualizationUtils();
  }
}

// Entry point of the module
moduleMain();

