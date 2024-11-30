
const settingsInputs= document.getElementById('settings-form').elements;

// Link the 'isActive' and 'enableSchedule' checkboxes
// When the repo is marked as inactive the schedule is automatically disabled
settingsInputs.namedItem('isActive').onchange= ev => {
  settingsInputs.namedItem('enableSchedule').checked= ev.target.checked;
}

document.getElementById('toggle-authtoken-visibility').onclick= ev => {
  const button= ev.target;
  const tokenField= settingsInputs.namedItem('repoAuthToken');
  if( tokenField.type === 'text' ) {
    tokenField.type= 'password';
    button.innerText= 'Show';
  } else {
    tokenField.type= 'text';
    button.innerText= 'Hide';
  }
}
