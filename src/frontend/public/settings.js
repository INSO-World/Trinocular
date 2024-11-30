
const settingsInputs= document.getElementById('settings-form').elements;

// Link the 'isActive' and 'enableSchedule' checkboxes
// When the repo is marked as inactive the schedule is automatically disabled
settingsInputs.namedItem('isActive').onchange= ev => {
  settingsInputs.namedItem('enableSchedule').checked= ev.target.checked;
}

