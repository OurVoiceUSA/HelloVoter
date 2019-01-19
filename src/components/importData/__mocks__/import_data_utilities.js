export const findInnerElement = (parent, className) =>
  parent
    .find(className)
    .at(0)
    .props();
