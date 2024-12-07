
/** Code used when running as the dashboard **/

function initDashboard() {
  document.getElementById('visualization-selector').onchange = e => {
    const selectElem = e.target;
    const optionElem = selectElem.options[selectElem.selectedIndex];
    const frameUrl = optionElem.getAttribute('data-frame-url');
    const frameElem = document.getElementById('content-frame');
    const parentElem = frameElem.parentNode;

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
  // TODO: Get data from api-bridge
  const data = {min: '2024-06-01', max: '2024-12-31'};

  // Start Date Input
  const startDateDiv = createInput('date', 'startDate', 'Start Date', {
    value: data.min,
    min: data.min,
    max: data.max
  });

  // End Date Input
  const endDateDiv = createInput('date', 'endDate', 'End Date', {
    value: data.max,
    min: data.min,
    max: data.max
  });

  // Reset time-span Button
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.id = 'reset-timespan';
  resetButton.textContent = 'Reset Timespan';

  // Reset Timespan Event Listener
  resetButton.onclick = () => {
    const controls = {
      startDate: data.min,
      endDate: data.max
    }
    setControlValues({common: controls});
    // Create a change event to trigger the changeEventListener
    startDateDiv.querySelector('input').dispatchEvent(new Event('change'));
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

function initVisualizationUtils() {
  pageURL = new URL(window.location.href);
  baseURL = pageURL.origin + pageURL.pathname.replace('index.html', '');
  visualizationName = pageURL.searchParams.get('show');
}

let changeEventListener= null;
window.setChangeEventListener= setChangeEventListener;
export function setChangeEventListener( fn ) {
  changeEventListener= fn;
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
  inputElement.onchange= e => changeEventListener ? changeEventListener(e) : null;

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

export function getControlValues() {
  const formsDoc = runsAsDashboard() ? document : window.parent.document;

  const commonControlsForm= formsDoc.getElementById('common-controls');
  const customControlsForm= formsDoc.getElementById('custom-controls');

  return {
    common: collectFormInputValues( commonControlsForm ),
    custom: collectFormInputValues( customControlsForm ),
  };
}

export function setControlValues( values ) {
  const formsDoc = runsAsDashboard() ? document : window.parent.document;

  const commonControlsForm= formsDoc.getElementById('common-controls');
  const customControlsForm= formsDoc.getElementById('custom-controls');

  for( const key in values.common ) {
    const element= commonControlsForm.elements.namedItem( key );
    element.value= values.common[key];
  }

  for( const key in values.custom ) {
    const element= customControlsForm.elements.namedItem( key );
    element.value= values.custom[key];
  }
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

