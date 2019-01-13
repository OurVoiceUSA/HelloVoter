export const multiSelectChange = ele =>
  ele
    .find('.map-select-input')
    .at(0)
    .simulate('change', {
      target: {
        value: [
          {
            label: 'First Name',
            value: 'firstName'
          },
          {
            label: 'Middle Name',
            value: 'middleName'
          },
          {
            label: 'Last Name',
            value: 'lastName'
          }
        ]
      }
    });

export const singleSelectChange = ele =>
  ele
    .find('.map-select-input')
    .at(0)
    .simulate('change', {
      target: {
        value: 'firstName'
      }
    });

export const activateCheckBox = parent =>
  parent
    .find('.ck-bx')
    .at(0)
    .props()
    .onChange();

export const activateMapSelectChange = (parent, className, value) =>
  parent
    .find(className)
    .at(0)
    .simulate('change', {
      target: {
        value
      }
    });
