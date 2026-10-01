/* Finish pointer-operated controls without stealing keyboard/text editing focus. */
(() => {
'use strict';
function boot() {
  const app = document.getElementById('app'), preview = document.getElementById('viewport');
  if (!app || !preview) return;
  preview.tabIndex = -1;
  preview.setAttribute('role', 'region');
  preview.setAttribute('aria-label', J.layerText('映像プレビュー・キーボード操作', 'Video preview and keyboard controls'));
  let pointerControl = null, interaction = 0;
  const modalOpen = () => !!document.querySelector('dialog[open]')
    || Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')).some(el => el.getClientRects().length > 0);
  const blocked = el => !el || !app.contains(el) || el.closest('dialog,[role="dialog"]')
    || modalOpen() || J.ui?.tap;
  const controlAt = target => {
    if (!(target instanceof Element)) return null;
    return target.closest('input,select,textarea,button,summary') || target.closest('label')?.control || null;
  };
  const returnToPreview = control => {
    if (blocked(control)) return;
    const stamp = interaction;
    // Let change/click handlers finish validation, opening dialogs, and deliberate autofocus.
    setTimeout(() => {
      if (stamp !== interaction || blocked(control)) return;
      const active = document.activeElement;
      if (active === control || active === document.body) {
        preview.focus({ preventScroll: true }); pointerControl = null;
      }
    }, 0);
  };
  document.addEventListener('pointerdown', e => {
    interaction++; pointerControl = e.button === 0 ? controlAt(e.target) : null;
    if (blocked(pointerControl)) pointerControl = null;
  }, true);
  document.addEventListener('keydown', () => { interaction++; pointerControl = null; }, true);
  document.addEventListener('pointercancel', () => { interaction++; pointerControl = null; }, true);
  document.addEventListener('pointerup', () => {
    if (pointerControl?.matches('input[type="range"]')) returnToPreview(pointerControl);
  });
  document.addEventListener('change', e => {
    const c = controlAt(e.target);
    if (c === pointerControl && c?.matches('select,input[type="checkbox"],input[type="radio"],input[type="color"],input[type="file"]')) returnToPreview(c);
  });
  document.addEventListener('cancel', e => {
    if (e.target === pointerControl && e.target.matches('input[type="file"]')) returnToPreview(e.target);
  }, true);
  document.addEventListener('click', e => {
    const c = controlAt(e.target);
    if (e.detail > 0 && c === pointerControl && c?.matches('button,summary,input[type="button"],input[type="submit"]')) returnToPreview(c);
    // Explicitly clicking the image/timeline also ends text-field focus. Avoid overlay controls.
    if (e.detail > 0 && e.target instanceof Element && (e.target === preview || e.target.matches('#view,#timeline')) && !blocked(preview))
      preview.focus({ preventScroll: true });
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
