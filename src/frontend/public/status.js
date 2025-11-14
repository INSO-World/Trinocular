
document.getElementById('reimport-button').addEventListener('click', async event => {

  if(!confirm('Do you really want to delete and re-import all repository data?')) {
    return;
  }

  // Dumb way to prevent the user from clicking the button immediately again
  event.target.disabled= true;
  
  const csrfToken = document.querySelector('input[name="csrfToken"]').value;
  const resp= await fetch('/api/reimport', {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': csrfToken }
  });

  if( !resp.ok ) {
    console.error('Could not re-import repositories, server responded with:', resp.status);
  }
});

document.getElementById('reschedule-form').addEventListener('submit', async event => {
  event.preventDefault();

  if(!confirm('Do you really want to reschedule automatic snapshots for all repositories?')) {
    return;
  }

  const csrfToken = document.querySelector('input[name="csrfToken"]').value;
  const form= event.target;
  const startTimeString= form.elements.namedItem('reschedule-time').value;
  const timeOffsetString= form.elements.namedItem('reschedule-offset').value;

  const [startHours, startMinutes]= startTimeString.split(':').map( s => parseInt(s));
  const startTime= new Date();
  startTime.setHours(startHours, startMinutes);
  if( startTime < new Date() ) {
    startTime.setDate( startTime.getDate()+1 );
  }
  const timeOffset= parseInt(timeOffsetString);

  form.classList.remove('submit-success');
  form.classList.remove('submit-failure');
  form.classList.add('is-submitting');

  const resp= await fetch('/api/reschedule', {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': csrfToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({startTime, timeOffset})
  });
  
  if( resp.ok ) {
    form.classList.remove('is-submitting');
    form.classList.add('submit-success');

  } else {
    form.classList.remove('is-submitting');
    form.classList.add('submit-failure');
    
    console.error('Could not re-schedule repository snapshots, server responded with:', resp.status);
  }
});
