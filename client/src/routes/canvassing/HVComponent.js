import React, { PureComponent } from 'react';
import { Toast } from 'native-base';
import { ConfirmDialog } from 'react-native-simple-dialogs';

export default class HVComponent extends PureComponent {

  constructor(props) {
    super(props);
  }

  alert(title, message, pos, neg) {
    if (!pos) pos = {title: "OK", onPress: () => this.setState({confirmDialog: false})};
    setTimeout(() => {
      Toast.hide();
      this.setState({
        confirmDialog: true,
        confirmDialogTitle: title,
        confirmDialogMessage: message,
        confirmDialogPositiveButton: pos,
        confirmDialogNegativeButton: neg,
      })
    }, 250);
  }

}

export const HVConfirmDialog = props => {
  const { refer } = props;
  const {
    confirmDialog, confirmDialogTitle, confirmDialogMessage,
    confirmDialogPositiveButton, confirmDialogNegativeButton,
  } = refer.state;

  return (
    <ConfirmDialog
      title={confirmDialogTitle}
      message={confirmDialogMessage}
      visible={confirmDialog}
      onTouchOutside={() => refer.setState({confirmDialog: false})}
      positiveButton={confirmDialogPositiveButton}
      negativeButton={confirmDialogNegativeButton}
    />
  );
};
