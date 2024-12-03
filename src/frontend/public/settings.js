function replacePageHtml(html) {
  // in case of error render with error message
  // FIXME replace deprecated document.write()
  document.open();
  document.write(html);
  window.scrollTo(0, 0);
  document.close();

  initSettingsPage();
}

function initSettingsPage() {
  const settingsInputs = document.getElementById('settings-form').elements;

  // Link the 'isActive' and 'enableSchedule' checkboxes
  // When the repo is marked as inactive the schedule is automatically disabled
  settingsInputs.namedItem('isActive').onchange = ev => {
    settingsInputs.namedItem('enableSchedule').checked = ev.target.checked;
  };

  document.getElementById('toggle-authtoken-visibility').onclick = ev => {
    const button = ev.target;
    const tokenField = settingsInputs.namedItem('repoAuthToken');
    if (tokenField.type === 'text') {
      tokenField.type = 'password';
      button.innerText = 'Show';
    } else {
      tokenField.type = 'text';
      button.innerText = 'Hide';
    }
  };

  document.getElementById('delete-form').onsubmit = async event => {
    event.preventDefault();

    const form = event.target;
    const csrfToken = form.elements.namedItem('csrfToken').value;

    if (confirm('Do you really want to delete the repository?')) {
      const resp = await fetch(form.action, {
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': csrfToken }
      });

      if (!resp.ok) {
        const errorHtml = await resp.text();
        replacePageHtml(errorHtml);
      } else {
        // after deleting redirect to repos page
        window.location.href = '/repos';
      }
    }
  };
}

initSettingsPage();
