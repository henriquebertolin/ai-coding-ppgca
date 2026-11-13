// Shared DOM utilities. Views escape user input before inserting it into HTML.
export const $ = (selector) => document.querySelector(selector);
export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
export const go = (route) => {
  location.hash = route;
};
export const btn = (text, action, cls = 'primary') =>
  /* HTML */ `<button type="button" class="${cls}" data-action="${action}">${text}</button>`;
export function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  setTimeout(() => $('#toast').classList.remove('show'), 3200);
}
export function showDialog(content) {
  $('dialog')?.remove();
  const dialog = document.createElement('dialog');
  dialog.innerHTML = /* HTML */ `<button
      class="dialog-close"
      data-action="close"
      aria-label="Fechar"
    >
      ×</button
    >${content}`;
  document.body.append(dialog);
  dialog.showModal();
}
