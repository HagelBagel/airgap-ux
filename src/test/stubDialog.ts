// jsdom (29) has HTMLDialogElement but no showModal() or close(). This adds
// minimal versions that toggle the `open` attribute, so components that drive
// a native <dialog> can be tested. They do not model focus trapping, the
// backdrop or the top layer. Each spec file gets its own jsdom, so the patch
// does not leak between files; it is a no-op once jsdom implements them.

export function stubDialog(): void {
  const proto = HTMLDialogElement.prototype
  proto.showModal ??= function () {
    this.setAttribute('open', '')
  }
  proto.close ??= function () {
    this.removeAttribute('open')
  }
}
