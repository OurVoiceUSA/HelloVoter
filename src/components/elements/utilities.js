export const multiSelectChange = ele =>
  ele
    .find('.map-select-input')
    .at(0)
    .simulate('change', multiValue);

export const singleSelectChange = ele =>
  ele
    .find('.map-select-input')
    .at(0)
    .simulate('change', {
      label: 'First Name',
      value: 'firstName'
    });

export const addSelectValue = (ele, ...args) =>
  ele
    .find('.map-select-input')
    .at(0)
    .simulate('change', args);

export const activateCheckBox = parent =>
  parent
    .find('.ck-bx')
    .at(0)
    .props()
    .onChange();

export const activateMapSelectChange = (parent, className, value, label) =>
  parent
    .find(className)
    .at(0)
    .simulate('change', { label, value });

export const multiValue = [
  { value: 'firstName', label: 'First Name' },
  { value: 'middleName', label: 'Middle Name' },
  { value: 'lastName', label: 'Last Name' }
];

export const singleValue = {
  value: 'firstName',
  label: 'First Name'
};

export const findInnerElement = (parent, className) =>
  parent
    .find(className)
    .at(0)
    .props();
