import React, { PureComponent } from 'react';
import { I18nManager } from 'react-native';
import { Toast } from 'native-base';

import * as RNLocalize from "react-native-localize";
import i18n from "i18n-js";

import { ConfirmDialog } from 'react-native-simple-dialogs';

import { say } from './common';

const translationGetters = {
  // lazy requires (metro bundler does not support symlinks)
  en: () => require("./translations/en.json"),
  es: () => require("./translations/es.json")
};

const setI18nConfig = () => {
  // fallback if no available language fits
  const fallback = { languageTag: "en", isRTL: false };

  const { languageTag, isRTL } =
    RNLocalize.findBestAvailableLanguage(Object.keys(translationGetters)) ||
    fallback;

  // clear translation cache
  say.cache.clear();
  // update layout direction
  I18nManager.forceRTL(isRTL);
  // set i18n-js config
  i18n.translations = { [languageTag]: translationGetters[languageTag]() };
  i18n.locale = languageTag;
};

export default class HVComponent extends PureComponent {

  constructor(props) {
    super(props);
    setI18nConfig();
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
